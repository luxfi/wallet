/**
 * lux.id OIDC — Authorization Code + PKCE for the SPA.
 *
 * Identity is delegated to the canonical `@hanzo/iam` SDK (HIP-0111: one
 * way to authenticate — no hand-rolled OAuth). This module is a thin,
 * brand-aware façade over `@hanzo/iam/browser`'s `IAM` class so the rest of
 * the wallet (`store/session`, `lib/custody`, `screens/auth/Callback`) keeps
 * its existing, framework-free surface:
 *
 *   beginLogin()        — start the PKCE redirect to the IdP's /authorize.
 *   completeLogin(search) — exchange the code on the callback route.
 *   getAccessToken()    — a valid bearer (auto-refresh), or null.
 *   hasSession()        — true when a (possibly-expiring) token is present.
 *   clearSession()      — drop the session (logout).
 *
 * The wallet's ONE identity provider is lux.id (per brand: lux→https://lux.id,
 * hanzo→https://hanzo.id, zoo→https://zoo.id). Issuer (`serverUrl`) + client id
 * come from the brand singleton (`getIamConfig()`), so a white-label points at
 * its own IdP with no code change. The backend (apps/backend) verifies the
 * resulting bearer against this same issuer + audience (the client id, by the
 * `<org>-<app>` convention) and derives the org from the token's `owner`
 * claim — the client NEVER sends an org.
 *
 * Tokens live in sessionStorage (the SDK default): a tab reload survives
 * without a re-login, but they are gone when the tab closes (narrower exposure
 * than the wallet's encrypted at-rest secrets). The raw token is never logged
 * and never sent anywhere but the configured IdP and the brand's custody
 * backend.
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo. `@hanzo/iam` is
 * consumed as an Apache-2.0/MIT dependency (compatible).
 */
import { IAM } from "@hanzo/iam/browser"
import { getIamConfig } from "@luxfi/wallet-brand"

/** Token set — kept for callers that consume `completeLogin`'s return value. */
export interface TokenSet {
  /** The bearer JWT sent to the custody backend as `Authorization: Bearer`. */
  accessToken: string
  /** Refresh token (if the IdP issues one) for silent renewal. */
  refreshToken?: string
  /** Absolute expiry (epoch ms). */
  expiresAt: number
}

/** The callback path the IdP redirects to. Registered as a client redirect URI. */
export const OIDC_CALLBACK_PATH = "/auth/callback"

/** Typed IAM error — the auth flow never silently no-ops. */
export class IamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IamError"
  }
}

function redirectUri(): string {
  // Token reads (getAccessToken/hasSession/clearSession) build the SDK too but
  // never use the redirect URI; tolerate a non-browser context (tests) by
  // falling back to a stable placeholder. The redirect flow always runs in the
  // browser where `window.location.origin` is real.
  const origin =
    typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost"
  return `${origin}${OIDC_CALLBACK_PATH}`
}

/**
 * Lazily-built, memoized `IAM` instance. Rebuilt only if the brand's issuer
 * or client id changes (white-label switch) — keeps PKCE state stable across
 * the redirect round-trip within one brand.
 */
let sdkCache: { issuer: string; clientId: string; sdk: IAM } | null = null

function iam(): IAM {
  const { issuer, clientId } = getIamConfig()
  if (!issuer || !clientId) {
    throw new IamError("brand has no iamIssuer/iamClientId configured")
  }
  if (sdkCache && sdkCache.issuer === issuer && sdkCache.clientId === clientId) {
    return sdkCache.sdk
  }
  const sdk = new IAM({
    serverUrl: issuer,
    clientId,
    redirectUri: redirectUri(),
    scope: "openid profile email",
    // sessionStorage is the SDK default; named here for intent.
    storage: sessionStorage,
  })
  sdkCache = { issuer, clientId, sdk }
  return sdk
}

/**
 * Start the login redirect. Mints PKCE + state (in sessionStorage) and
 * navigates the browser to the IdP's authorize endpoint. Does not return.
 */
export async function beginLogin(): Promise<void> {
  await iam().signinRedirect()
}

/**
 * Complete the login on the callback route. Validates state, exchanges the
 * authorization code (with the stashed PKCE verifier) for tokens, persists
 * them via the SDK, and returns the set. Throws `IamError` on failure.
 *
 * `search` is the callback's query string (e.g. `?code=…&state=…`); we hand
 * the SDK a full callback URL so its `handleCallback` parses it identically
 * to a fresh navigation.
 */
export async function completeLogin(search: string): Promise<TokenSet> {
  const qs = search.startsWith("?") ? search : `?${search}`
  try {
    const t = await iam().handleCallback(`${redirectUri()}${qs}`)
    return {
      accessToken: t.accessToken,
      refreshToken: t.refreshToken,
      // SDK returns relative `expiresIn` (seconds); default 5 min if absent.
      expiresAt: Date.now() + (t.expiresIn ?? 300) * 1000,
    }
  } catch (e) {
    throw new IamError(e instanceof Error ? e.message : String(e))
  }
}

/**
 * Return a valid access token, refreshing if needed. Returns null when no
 * session exists (caller triggers `beginLogin()`).
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await iam().getValidAccessToken()
  } catch {
    clearSession()
    return null
  }
}

/** True when a (possibly-expiring) session token is present. */
export function hasSession(): boolean {
  return iam().getAccessToken() !== null
}

/** Clear the OIDC session (logout). Does not touch wallet at-rest state. */
export function clearSession(): void {
  iam().clearTokens()
}

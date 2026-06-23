/**
 * lux.id OIDC — Authorization Code + PKCE for the SPA.
 *
 * The wallet's ONE identity provider is lux.id (per brand: lux→https://lux.id,
 * hanzo→https://hanzo.id, zoo→https://zoo.id). Issuer + client id come from the
 * brand singleton (`getIamConfig()`), so a white-label points at its own IdP
 * with no code change. The backend (apps/backend) verifies the resulting bearer
 * against this same issuer + audience (the client id, by the `<org>-<app>`
 * convention) and derives the org from the token's `owner` claim — the client
 * NEVER sends an org.
 *
 * Flow (public client, no secret):
 *   1. `beginLogin()` mints a PKCE verifier + state, stashes them in
 *      sessionStorage, and navigates to the IdP's /authorize.
 *   2. The IdP redirects back to `<origin>/auth/callback?code=…&state=…`.
 *   3. `completeLogin()` validates state, exchanges the code at /token (sending
 *      the PKCE verifier), and returns the token set.
 *
 * Token storage: access + refresh tokens live in sessionStorage so a tab
 * reload survives without a re-login, but they are gone when the tab closes
 * (no localStorage — narrower exposure than the wallet's at-rest secrets, which
 * are encrypted). The raw token is never logged and never sent anywhere but the
 * configured IdP (token exchange) and the brand's own custody backend.
 *
 * Endpoints are discovered from the issuer's
 * `/.well-known/openid-configuration`, matching how the Go verifier discovers
 * JWKS — one issuer, one discovery document.
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { getIamConfig } from "@luxfi/wallet-brand"

const SCOPE = "openid profile email"

/** OIDC discovery document — only the fields we use. */
interface Discovery {
  authorization_endpoint: string
  token_endpoint: string
}

/** Token set as returned by the IdP /token endpoint. */
export interface TokenSet {
  /** The bearer JWT sent to the custody backend as `Authorization: Bearer`. */
  accessToken: string
  /** Refresh token (if the IdP issues one) for silent renewal. */
  refreshToken?: string
  /** Absolute expiry (epoch ms) computed from `expires_in`. */
  expiresAt: number
}

/** sessionStorage keys — namespaced so they never collide with wallet state. */
const SS_VERIFIER = "lux-wallet/oidc/pkce-verifier"
const SS_STATE = "lux-wallet/oidc/state"
const SS_TOKENS = "lux-wallet/oidc/tokens"

/** The callback path the IdP redirects to. Registered as a client redirect URI. */
export const OIDC_CALLBACK_PATH = "/auth/callback"

function redirectUri(): string {
  return `${window.location.origin}${OIDC_CALLBACK_PATH}`
}

/* ── PKCE primitives (RFC 7636) — Web Crypto only, no deps ───────────────── */

/** base64url without padding, per RFC 7636 §A. */
function base64url(bytes: Uint8Array): string {
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function randomUrlSafe(byteLen: number): string {
  const buf = new Uint8Array(byteLen)
  crypto.getRandomValues(buf)
  return base64url(buf)
}

/** S256 code challenge = base64url(SHA-256(verifier)). */
async function codeChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

/* ── Discovery ───────────────────────────────────────────────────────────── */

let discoveryCache: { issuer: string; doc: Discovery } | null = null

async function discover(issuer: string): Promise<Discovery> {
  if (discoveryCache && discoveryCache.issuer === issuer) return discoveryCache.doc
  const url = `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`
  const res = await fetch(url, { headers: { accept: "application/json" } })
  if (!res.ok) throw new IamError(`OIDC discovery failed (${res.status})`)
  const doc = (await res.json()) as Partial<Discovery>
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new IamError("OIDC discovery document missing endpoints")
  }
  const full: Discovery = {
    authorization_endpoint: doc.authorization_endpoint,
    token_endpoint: doc.token_endpoint,
  }
  discoveryCache = { issuer, doc: full }
  return full
}

/** Typed IAM error — auth flow never silently no-ops. */
export class IamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IamError"
  }
}

/* ── Public flow ─────────────────────────────────────────────────────────── */

/**
 * Start the login redirect. Mints PKCE + state, persists them, and navigates
 * the browser to the IdP's authorize endpoint. Does not return (navigation).
 */
export async function beginLogin(): Promise<void> {
  const { issuer, clientId } = getIamConfig()
  if (!issuer || !clientId) throw new IamError("brand has no iamIssuer/iamClientId configured")

  const { authorization_endpoint } = await discover(issuer)
  const verifier = randomUrlSafe(32)
  const state = randomUrlSafe(16)
  sessionStorage.setItem(SS_VERIFIER, verifier)
  sessionStorage.setItem(SS_STATE, state)

  const challenge = await codeChallengeS256(verifier)
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  })
  window.location.assign(`${authorization_endpoint}?${params.toString()}`)
}

/**
 * Complete the login on the callback route. Validates `state`, exchanges the
 * authorization code (with the stashed PKCE verifier) for tokens, persists
 * them, and returns the set. Throws `IamError` on any mismatch or failure.
 */
export async function completeLogin(search: string): Promise<TokenSet> {
  const { issuer, clientId } = getIamConfig()
  if (!issuer || !clientId) throw new IamError("brand has no iamIssuer/iamClientId configured")

  const q = new URLSearchParams(search)
  const err = q.get("error")
  if (err) throw new IamError(`IdP returned error: ${err}`)
  const code = q.get("code")
  const state = q.get("state")
  const expectedState = sessionStorage.getItem(SS_STATE)
  const verifier = sessionStorage.getItem(SS_VERIFIER)
  // One-shot: clear immediately so a replayed callback can't reuse them.
  sessionStorage.removeItem(SS_STATE)
  sessionStorage.removeItem(SS_VERIFIER)

  if (!code) throw new IamError("callback missing authorization code")
  if (!state || !expectedState || state !== expectedState) {
    throw new IamError("OIDC state mismatch — possible CSRF")
  }
  if (!verifier) throw new IamError("missing PKCE verifier — login not initiated here")

  const { token_endpoint } = await discover(issuer)
  const tokens = await exchange(token_endpoint, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: clientId,
    code_verifier: verifier,
  })
  persist(tokens)
  return tokens
}

/**
 * Return a valid access token, refreshing if it is within `skewMs` of expiry
 * and a refresh token is available. Returns null when no session exists (caller
 * triggers `beginLogin()`).
 */
export async function getAccessToken(skewMs = 30_000): Promise<string | null> {
  const tokens = load()
  if (!tokens) return null
  if (Date.now() < tokens.expiresAt - skewMs) return tokens.accessToken
  if (!tokens.refreshToken) {
    // Expired and unrenewable — drop it so the app re-authenticates cleanly.
    clearSession()
    return null
  }
  try {
    const refreshed = await refresh(tokens.refreshToken)
    return refreshed.accessToken
  } catch {
    clearSession()
    return null
  }
}

/** True when a (possibly-expiring) session is present. */
export function hasSession(): boolean {
  return load() !== null
}

/** Clear the OIDC session (logout). Does not touch wallet at-rest state. */
export function clearSession(): void {
  sessionStorage.removeItem(SS_TOKENS)
}

/* ── Token exchange + persistence ────────────────────────────────────────── */

async function refresh(refreshToken: string): Promise<TokenSet> {
  const { issuer, clientId } = getIamConfig()
  const { token_endpoint } = await discover(issuer)
  const tokens = await exchange(token_endpoint, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  })
  // Some IdPs omit a new refresh token on renewal — keep the old one.
  if (!tokens.refreshToken) tokens.refreshToken = refreshToken
  persist(tokens)
  return tokens
}

async function exchange(tokenEndpoint: string, body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new IamError(`token endpoint ${res.status}`)
  const json = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!json.access_token) throw new IamError("token response missing access_token")
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    // Default to 5 min when the IdP omits expires_in.
    expiresAt: Date.now() + (json.expires_in ?? 300) * 1000,
  }
}

function persist(tokens: TokenSet): void {
  sessionStorage.setItem(SS_TOKENS, JSON.stringify(tokens))
}

function load(): TokenSet | null {
  const raw = sessionStorage.getItem(SS_TOKENS)
  if (!raw) return null
  try {
    const t = JSON.parse(raw) as TokenSet
    if (typeof t.accessToken === "string" && typeof t.expiresAt === "number") return t
    return null
  } catch {
    return null
  }
}

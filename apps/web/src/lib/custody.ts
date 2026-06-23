/**
 * Custody API client — the web app's typed seam to `apps/backend`
 * (`wallet-api.<brand>`), the MPC custody server.
 *
 * Contract (must match `apps/backend/internal/api/api.go` exactly):
 *   POST   /v1/wallets            → 201 Wallet
 *   GET    /v1/wallets            → 200 { wallets: Wallet[] }
 *   GET    /v1/wallets/{id}       → 200 Wallet
 *   POST   /v1/wallets/{id}/sign  → 200 SignResult   (body: SignBody)
 *
 * Auth + tenancy:
 *   - Every request carries `Authorization: Bearer <jwt>` from lux.id
 *     (`lib/iam.getAccessToken`). The backend verifies issuer + audience and
 *     derives the org from the token's `owner` claim.
 *   - The client NEVER sends an org / owner / tenant field. Tenancy is the
 *     server's responsibility — sending it from the client would be both
 *     redundant and a spoofing surface.
 *
 * Boundary validation:
 *   - Addresses returned by the backend are validated (EVM EIP-55) before use;
 *     we never trust a custody response blindly.
 *   - `sign` requires a non-empty idempotency key — a replayed key with a
 *     different payload is an anti-oracle hazard the backend refuses, and we
 *     refuse to even send one without it.
 *
 * No `/api/` prefix; `/v1/*` only. No second HTTP lib — `fetch`. Base URL comes
 * from the brand singleton via `getWalletApiUrl()` (white-labelable).
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { getWalletApiUrl } from "@luxfi/wallet-brand"
import { getAccessToken } from "./iam"
import { validateEvmAddress } from "./address"

/** Signing scheme — mirrors `custody.Scheme` in the Go backend. */
export type CustodyScheme = "secp256k1" | "ed25519" | "mldsa65"

/**
 * Custody wallet — mirrors `custody.Wallet`. There is NO private-key field by
 * design; the key is MPC-held t-of-n and never assembled. `addresses` maps a
 * chain tag (evm/btc/sol) to its derived address.
 */
export interface CustodyWallet {
  walletId: string
  ecdsaPubKey?: string
  eddsaPubKey?: string
  addresses: Record<string, string>
}

/** Sign result — mirrors `custody.SignResult`. */
export interface SignResult {
  signature: string
  sessionId?: string
}

/** Sign request body — mirrors the backend's `signBody` (JSON field names). */
export interface SignBody {
  scheme: CustodyScheme
  chainId: number
  /** 32-byte tx hash, hex (0x-prefixed). */
  payloadHash: string
  /** Anti-replay key. Required — the backend refuses sign without it. */
  idempotencyKey: string
}

/** Typed custody errors — the client never silently no-ops. */
export class CustodyError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "CustodyError"
    this.status = status
  }
}

/** Thrown when the caller is not authenticated (no lux.id session). */
export class NotAuthenticatedError extends CustodyError {
  constructor() {
    super("not authenticated — lux.id login required", 401)
    this.name = "NotAuthenticatedError"
  }
}

function baseUrl(): string {
  const url = getWalletApiUrl()
  if (!url) throw new CustodyError("brand has no walletApi configured")
  return url
}

/**
 * Authenticated JSON request to the custody backend. Attaches the bearer
 * token, parses the JSON body, and maps the backend's `{ error }` shape to a
 * typed `CustodyError`. `fetchImpl` is injectable for tests.
 */
async function request<T>(
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new NotAuthenticatedError()

  const headers = new Headers(init.headers)
  headers.set("authorization", `Bearer ${token}`)
  headers.set("accept", "application/json")
  if (init.body != null) headers.set("content-type", "application/json")

  const res = await fetchImpl(`${baseUrl()}${path}`, { ...init, headers })
  const text = await res.text()
  const json = text ? safeJson(text) : undefined

  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `custody request failed (${res.status})`)
    throw new CustodyError(msg, res.status)
  }
  return json as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new CustodyError("custody returned non-JSON response")
  }
}

/* ── Boundary validation ─────────────────────────────────────────────────── */

/**
 * Validate a custody wallet shape from the backend. We trust the server's
 * tenancy but not its bytes: the EVM address (when present) must be a
 * well-formed EIP-55 address, and `walletId` must be non-empty.
 */
function assertWallet(w: unknown): CustodyWallet {
  if (!w || typeof w !== "object") throw new CustodyError("malformed wallet response")
  const wallet = w as CustodyWallet
  if (typeof wallet.walletId !== "string" || wallet.walletId.length === 0) {
    throw new CustodyError("custody wallet missing walletId")
  }
  if (!wallet.addresses || typeof wallet.addresses !== "object") {
    throw new CustodyError("custody wallet missing addresses")
  }
  const evm = wallet.addresses.evm
  if (evm && !validateEvmAddress(evm).ok) {
    throw new CustodyError(`custody returned invalid EVM address: ${evm}`)
  }
  return wallet
}

/* ── API surface ─────────────────────────────────────────────────────────── */

/**
 * Create an MPC custody wallet for the caller's org. The org is taken from the
 * verified token server-side — never sent here. Returns the public wallet
 * (addresses + pubkeys), never a private key.
 */
export async function createWallet(fetchImpl: typeof fetch = fetch): Promise<CustodyWallet> {
  // POST with no body — org comes from the bearer token.
  const w = await request<CustodyWallet>("/v1/wallets", { method: "POST" }, fetchImpl)
  return assertWallet(w)
}

/** List the org's custody wallets. */
export async function listWallets(fetchImpl: typeof fetch = fetch): Promise<CustodyWallet[]> {
  const res = await request<{ wallets: CustodyWallet[] }>("/v1/wallets", { method: "GET" }, fetchImpl)
  const wallets = Array.isArray(res?.wallets) ? res.wallets : []
  return wallets.map(assertWallet)
}

/** Fetch one custody wallet by id (org-scoped server-side; cross-org → 404). */
export async function getWallet(id: string, fetchImpl: typeof fetch = fetch): Promise<CustodyWallet> {
  if (!id) throw new CustodyError("wallet id required")
  const w = await request<CustodyWallet>(`/v1/wallets/${encodeURIComponent(id)}`, { method: "GET" }, fetchImpl)
  return assertWallet(w)
}

/**
 * Request an MPC threshold signature over a 32-byte payload hash. The idempotency
 * key is REQUIRED (anti-replay) — we refuse to send a request without one rather
 * than let the backend reject it after a round-trip. Returns the signature; no
 * private key is ever reconstructed.
 */
export async function signPayload(
  walletId: string,
  body: SignBody,
  fetchImpl: typeof fetch = fetch,
): Promise<SignResult> {
  if (!walletId) throw new CustodyError("wallet id required")
  if (!body.idempotencyKey) throw new CustodyError("idempotencyKey required")
  if (!body.payloadHash) throw new CustodyError("payloadHash required")
  return request<SignResult>(
    `/v1/wallets/${encodeURIComponent(walletId)}/sign`,
    { method: "POST", body: JSON.stringify(body) },
    fetchImpl,
  )
}

/**
 * Mint an idempotency key for a sign request. A UUID is sufficient — the key
 * only needs to be unique per logical sign attempt so a network retry of the
 * SAME payload is deduplicated server-side, while a different payload under a
 * reused key is refused.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

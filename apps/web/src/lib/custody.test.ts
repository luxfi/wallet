/**
 * Custody client tests.
 *
 * Runner: Node's built-in test runner (`node --test`) — the repo's one way
 * (see lib/derive.test.ts, store/send.test.ts). Node 22+ strips TS types and
 * `node:test` is stdlib, so no extra dependency.
 *
 * We mock only `fetch` (the client takes an injectable `fetchImpl`) and seed a
 * lux.id token into a sessionStorage polyfill so the REAL `lib/iam`
 * `getAccessToken` path runs. Assertions:
 *   - bearer header attached on every request,
 *   - org/owner/tenant is NEVER sent by the client (server derives it),
 *   - exact endpoints + bodies match `apps/backend/internal/api/api.go`,
 *   - sign refuses without an idempotency key (anti-replay), and sends it when
 *     present,
 *   - backend `{error}` bodies become typed CustodyError,
 *   - returned EVM addresses are validated at the boundary.
 */
import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { brand } from "@luxfi/wallet-brand"
import {
  createWallet,
  listWallets,
  getWallet,
  signPayload,
  CustodyError,
  NotAuthenticatedError,
} from "./custody"

/* ── sessionStorage polyfill + token seeding ─────────────────────────────── */

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v))
  }
  removeItem(k: string): void {
    this.m.delete(k)
  }
  clear(): void {
    this.m.clear()
  }
}
;(globalThis as unknown as { sessionStorage: MemStorage }).sessionStorage = new MemStorage()

// @hanzo/iam (browser SDK) sessionStorage keys — lib/iam delegates to the SDK,
// so the real getAccessToken() path reads these.
const SS_ACCESS_TOKEN = "hanzo_iam_access_token"
const SS_EXPIRES_AT = "hanzo_iam_expires_at"
const TEST_TOKEN = "test.jwt.token"

function seedToken(): void {
  sessionStorage.setItem(SS_ACCESS_TOKEN, TEST_TOKEN)
  sessionStorage.setItem(SS_EXPIRES_AT, String(Date.now() + 3_600_000))
}

/** A recorded fetch call + a programmable response factory. */
interface Captured {
  url: string
  init: RequestInit
}

function mockFetch(
  status: number,
  body: unknown,
  captured: Captured[],
): typeof fetch {
  return (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    captured.push({ url: String(input), init })
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? "" : JSON.stringify(body)),
    } as Response
  }) as unknown as typeof fetch
}

beforeEach(() => {
  sessionStorage.clear()
  brand.walletApi = "https://api.test"
  brand.iamIssuer = "https://lux.id"
  brand.iamClientId = "lux-wallet"
  seedToken()
})

/* ── auth ─────────────────────────────────────────────────────────────────── */

test("unauthenticated → NotAuthenticatedError, no fetch issued", async () => {
  sessionStorage.clear() // no token
  const captured: Captured[] = []
  await assert.rejects(
    () => listWallets(mockFetch(200, { wallets: [] }, captured)),
    NotAuthenticatedError,
  )
  assert.equal(captured.length, 0, "must not call backend without a token")
})

test("every request attaches the lux.id bearer token", async () => {
  const captured: Captured[] = []
  await listWallets(mockFetch(200, { wallets: [] }, captured))
  const auth = new Headers(captured[0]!.init.headers).get("authorization")
  assert.equal(auth, `Bearer ${TEST_TOKEN}`)
})

/* ── createWallet ───────────────────────────────────────────────────────────── */

test("createWallet: POST /v1/wallets, NO body (org from token), validates result", async () => {
  const captured: Captured[] = []
  const wallet = {
    walletId: "w-1",
    ecdsaPubKey: "0xpub",
    addresses: { evm: "0x52908400098527886E0F7030069857D2E4169EE7", btc: "bc1xyz" },
  }
  const w = await createWallet(mockFetch(201, wallet, captured))

  assert.equal(captured.length, 1)
  assert.equal(captured[0]!.url, "https://api.test/v1/wallets")
  assert.equal(captured[0]!.init.method, "POST")
  // Org/owner/tenant must NEVER be sent — the server derives it from the JWT.
  assert.equal(captured[0]!.init.body, undefined, "create must send no body")
  assert.equal(w.walletId, "w-1")
  assert.equal(w.addresses.evm, "0x52908400098527886E0F7030069857D2E4169EE7")
})

test("createWallet: rejects an invalid EVM address at the boundary", async () => {
  const captured: Captured[] = []
  const bad = { walletId: "w-1", addresses: { evm: "0xdeadbeef" } } // too short
  await assert.rejects(
    () => createWallet(mockFetch(201, bad, captured)),
    (e: unknown) => e instanceof CustodyError && /invalid EVM address/.test((e as Error).message),
  )
})

test("createWallet: rejects a response missing walletId", async () => {
  const captured: Captured[] = []
  await assert.rejects(
    () => createWallet(mockFetch(201, { addresses: {} }, captured)),
    (e: unknown) => e instanceof CustodyError && /missing walletId/.test((e as Error).message),
  )
})

/* ── listWallets / getWallet ─────────────────────────────────────────────────── */

test("listWallets: GET /v1/wallets, unwraps { wallets }", async () => {
  const captured: Captured[] = []
  const wallets = [
    { walletId: "w-1", addresses: { evm: "0x52908400098527886E0F7030069857D2E4169EE7" } },
    { walletId: "w-2", addresses: {} },
  ]
  const out = await listWallets(mockFetch(200, { wallets }, captured))
  assert.equal(captured[0]!.url, "https://api.test/v1/wallets")
  assert.equal(captured[0]!.init.method, "GET")
  assert.equal(out.length, 2)
  assert.equal(out[1]!.walletId, "w-2")
})

test("getWallet: GET /v1/wallets/{id} with URL-encoded id", async () => {
  const captured: Captured[] = []
  const wallet = { walletId: "w/1", addresses: {} }
  await getWallet("w/1", mockFetch(200, wallet, captured))
  assert.equal(captured[0]!.url, "https://api.test/v1/wallets/w%2F1")
  assert.equal(captured[0]!.init.method, "GET")
})

/* ── signPayload ─────────────────────────────────────────────────────────────── */

test("signPayload: refuses without an idempotency key (no fetch issued)", async () => {
  const captured: Captured[] = []
  await assert.rejects(
    () =>
      signPayload(
        "w-1",
        { scheme: "secp256k1", chainId: 96369, payloadHash: "0xabc", idempotencyKey: "" },
        mockFetch(200, { signature: "0xsig" }, captured),
      ),
    (e: unknown) => e instanceof CustodyError && /idempotencyKey required/.test((e as Error).message),
  )
  assert.equal(captured.length, 0)
})

test("signPayload: POST /v1/wallets/{id}/sign with exact body, returns signature", async () => {
  const captured: Captured[] = []
  const res = await signPayload(
    "w-1",
    { scheme: "secp256k1", chainId: 96369, payloadHash: "0xabc123", idempotencyKey: "idem-1" },
    mockFetch(200, { signature: "0xdeadbeef", sessionId: "s-9" }, captured),
  )
  assert.equal(captured[0]!.url, "https://api.test/v1/wallets/w-1/sign")
  assert.equal(captured[0]!.init.method, "POST")
  const sent = JSON.parse(String(captured[0]!.init.body))
  // Exact wire shape per backend signBody — and NO org field.
  assert.deepEqual(sent, {
    scheme: "secp256k1",
    chainId: 96369,
    payloadHash: "0xabc123",
    idempotencyKey: "idem-1",
  })
  assert.equal("org" in sent, false)
  assert.equal("owner" in sent, false)
  assert.equal(res.signature, "0xdeadbeef")
  assert.equal(res.sessionId, "s-9")
})

test("signPayload: PQ scheme mldsa65 is carried through", async () => {
  const captured: Captured[] = []
  await signPayload(
    "w-1",
    { scheme: "mldsa65", chainId: 96369, payloadHash: "0xabc", idempotencyKey: "k" },
    mockFetch(200, { signature: "0xsig" }, captured),
  )
  assert.equal(JSON.parse(String(captured[0]!.init.body)).scheme, "mldsa65")
})

/* ── error mapping ───────────────────────────────────────────────────────────── */

test("backend {error} body → typed CustodyError with status", async () => {
  const captured: Captured[] = []
  await assert.rejects(
    () =>
      signPayload(
        "w-1",
        { scheme: "secp256k1", chainId: 96369, payloadHash: "0xabc", idempotencyKey: "k" },
        mockFetch(400, { error: "idempotencyKey required" }, captured),
      ),
    (e: unknown) =>
      e instanceof CustodyError &&
      e.status === 400 &&
      /idempotencyKey required/.test((e as Error).message),
  )
})

test("cross-org 404 from backend surfaces as CustodyError(404)", async () => {
  const captured: Captured[] = []
  await assert.rejects(
    () => getWallet("someone-elses", mockFetch(404, { error: "wallet not found" }, captured)),
    (e: unknown) => e instanceof CustodyError && e.status === 404,
  )
})

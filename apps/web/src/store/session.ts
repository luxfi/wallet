/**
 * Session slice — lux.id auth + MPC custody wallet state.
 *
 * This is the bridge between the brand's lux.id IdP (`lib/iam`) and the brand's
 * custody backend (`lib/custody`). It owns:
 *   - the login lifecycle (`login` → IdP redirect; `completeCallback` on
 *     return; `logout`),
 *   - the org's custody wallets (created/listed via the backend; the org is
 *     derived server-side from the verified token — never sent here),
 *   - the active custody wallet used for signing,
 *   - `signWithCustody(...)` — the REAL sign-hash round-trip to the backend's
 *     MPC threshold signer.
 *
 * No secrets are persisted here. The lux.id tokens live in sessionStorage
 * (managed by `lib/iam`); this store keeps only the public wallet (addresses +
 * pubkeys) and a transient status. On reload, `hydrate()` restores
 * authentication from the sessionStorage token and re-lists wallets.
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { create } from "zustand"
import {
  beginLogin,
  completeLogin,
  clearSession,
  hasSession,
} from "../lib/iam"
import {
  createWallet as apiCreateWallet,
  listWallets as apiListWallets,
  signPayload,
  newIdempotencyKey,
  type CustodyWallet,
  type CustodyScheme,
  type SignResult,
} from "../lib/custody"

export type SessionStatus = "idle" | "loading" | "ready" | "error"

/** A custody sign request from a screen — payloadHash is the 32-byte tx hash. */
export interface CustodySignArgs {
  chainId: number
  /** 0x-prefixed 32-byte hash of the unsigned tx. */
  payloadHash: string
  /** Defaults to secp256k1 (EVM). */
  scheme?: CustodyScheme
}

export interface SessionState {
  /** True when a lux.id session token is present. */
  authenticated: boolean
  /** The org's custody wallets (public; no keys). */
  wallets: CustodyWallet[]
  /** The wallet used for signing. Defaults to the first wallet. */
  activeWallet: CustodyWallet | null
  status: SessionStatus
  error: string | null

  /** Restore auth from the persisted token and re-list wallets. */
  hydrate: () => Promise<void>
  /** Begin the lux.id OIDC login (navigates away). */
  login: () => Promise<void>
  /** Finish login on the /auth/callback route, then load wallets. */
  completeCallback: (search: string) => Promise<void>
  /** Clear the lux.id session and custody state. */
  logout: () => void
  /** Create a new MPC custody wallet for the org and select it. */
  createWallet: () => Promise<CustodyWallet>
  /** Reload the org's wallets from the backend. */
  loadWallets: () => Promise<void>
  /** Choose the active signing wallet by id. */
  selectWallet: (walletId: string) => void
  /**
   * Sign a payload hash with the active custody wallet via the backend MPC
   * signer. Mints the required idempotency key. Throws if no wallet is active.
   */
  signWithCustody: (args: CustodySignArgs) => Promise<SignResult>
}

export const useSession = create<SessionState>((set, get) => ({
  authenticated: false,
  wallets: [],
  activeWallet: null,
  status: "idle",
  error: null,

  hydrate: async () => {
    if (!hasSession()) {
      set({ authenticated: false })
      return
    }
    set({ authenticated: true })
    await get().loadWallets()
  },

  login: async () => {
    set({ status: "loading", error: null })
    // Navigates away — control does not return on success.
    await beginLogin()
  },

  completeCallback: async (search) => {
    set({ status: "loading", error: null })
    try {
      await completeLogin(search)
      set({ authenticated: true })
      await get().loadWallets()
    } catch (e) {
      set({ status: "error", error: errMsg(e) })
      throw e
    }
  },

  logout: () => {
    clearSession()
    set({ authenticated: false, wallets: [], activeWallet: null, status: "idle", error: null })
  },

  createWallet: async () => {
    set({ status: "loading", error: null })
    try {
      const wallet = await apiCreateWallet()
      const wallets = [...get().wallets, wallet]
      set({ wallets, activeWallet: get().activeWallet ?? wallet, status: "ready" })
      return wallet
    } catch (e) {
      set({ status: "error", error: errMsg(e) })
      throw e
    }
  },

  loadWallets: async () => {
    set({ status: "loading", error: null })
    try {
      const wallets = await apiListWallets()
      set({
        wallets,
        // Keep the current selection if still present; else first wallet.
        activeWallet:
          get().activeWallet && wallets.some((w) => w.walletId === get().activeWallet?.walletId)
            ? get().activeWallet
            : (wallets[0] ?? null),
        status: "ready",
      })
    } catch (e) {
      set({ status: "error", error: errMsg(e) })
      throw e
    }
  },

  selectWallet: (walletId) => {
    const wallet = get().wallets.find((w) => w.walletId === walletId) ?? null
    set({ activeWallet: wallet })
  },

  signWithCustody: async ({ chainId, payloadHash, scheme = "secp256k1" }) => {
    const wallet = get().activeWallet
    if (!wallet) throw new Error("no active custody wallet")
    return signPayload(wallet.walletId, {
      scheme,
      chainId,
      payloadHash,
      idempotencyKey: newIdempotencyKey(),
    })
  },
}))

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Signing slice — single-slot queue for the global signing modal.
 *
 * Any slice (Send/Swap/Bridge/dApps) calls `useSigningStore.getState().open(tx)`
 * via the `useSigningModal()` ergonomic wrapper. The modal renders the
 * pending tx, and the user's confirm/reject resolves the promise the
 * caller is awaiting.
 *
 * Why one slot: the user's attention is the bottleneck. Two prompts at
 * once is a phishing surface — a malicious dApp could try to slip a
 * second tx behind a legitimate one. We refuse a second `open()` while
 * one is pending.
 *
 * Threat model:
 *   - Modal is a confirmation surface. It MUST display canonical
 *     decoded calldata (lib/abi). Never trust the dApp's `summary` field.
 *   - Resolution is deterministic — `confirm/reject/cancel` all resolve
 *     the same promise. Callers receive `{approved: bool, reason?: string}`.
 *   - On tab unload, the pending request is rejected with reason "closed"
 *     so awaiting code unwinds cleanly.
 */
import { create } from "zustand"

export type TxOrigin = "send" | "swap" | "bridge" | "dapp"

export interface DAppCaller {
  name: string
  url: string
  iconUrl?: string
}

/**
 * Unsigned tx envelope shown to the user. We carry hex strings rather
 * than bigints so the store remains JSON-serialisable for devtools.
 */
export interface UnsignedTx {
  origin: TxOrigin
  chainId: number
  from: string
  to: string
  /** Hex-prefixed calldata, "0x" for plain transfers. */
  data: string
  /** Wei value as a decimal string, "0" for non-payable calls. */
  value: string
  /** Optional pre-estimated gas (decimal). Modal estimates if missing. */
  gas?: string
  /** Optional gas price / max fee per gas (decimal). */
  gasPrice?: string
  /** Optional nonce override. */
  nonce?: number
  /** Optional human-readable summary supplied by the calling slice. */
  summary?: string
  /** dApp metadata, present only when origin === "dapp". */
  dapp?: DAppCaller
  /**
   * MPC custody signing. When set, confirm requests an MPC threshold signature
   * over `payloadHash` from the custody backend (the active session wallet)
   * rather than signing locally with the in-RAM mnemonic. The signature is
   * returned in `SigningResult.signature`. Absent → local-key signing path.
   */
  custody?: {
    /** 0x-prefixed 32-byte hash of the unsigned tx to sign. */
    payloadHash: string
    /** Signing scheme; defaults to secp256k1 (EVM). */
    scheme?: "secp256k1" | "ed25519" | "mldsa65"
  }
}

export interface SigningResult {
  approved: boolean
  /** Set when approved=false: "rejected" | "closed" | "timeout" | "error". */
  reason?: "rejected" | "closed" | "timeout" | "error"
  /** Hex signature when a custody tx was approved + signed. */
  signature?: string
  /** Error detail when reason === "error". */
  error?: string
}

interface PendingEntry extends UnsignedTx {
  /** Resolver from the caller's `await`. */
  resolve: (r: SigningResult) => void
}

export interface SigningState {
  pending: PendingEntry | null
  open: (tx: UnsignedTx) => Promise<SigningResult>
  confirm: () => void
  reject: () => void
  /** Generic close — used by ESC, backdrop click, beforeunload. */
  cancel: (reason: SigningResult["reason"]) => void
  /**
   * Resolve the pending request with a full result. The modal uses this for
   * the custody path (carries `signature`/`error`); the store stays a pure
   * data slice — the async MPC call lives in the modal/hook, not here.
   */
  resolveWith: (result: SigningResult) => void
}

export const useSigningStore = create<SigningState>((set, get) => ({
  pending: null,

  open: (tx) => {
    const existing = get().pending
    if (existing) {
      // Refuse a second prompt — the existing one must resolve first.
      return Promise.resolve<SigningResult>({
        approved: false,
        reason: "rejected",
      })
    }
    return new Promise<SigningResult>((resolve) => {
      set({ pending: { ...tx, resolve } })
    })
  },

  confirm: () => {
    const p = get().pending
    if (!p) return
    p.resolve({ approved: true })
    set({ pending: null })
  },

  reject: () => {
    const p = get().pending
    if (!p) return
    p.resolve({ approved: false, reason: "rejected" })
    set({ pending: null })
  },

  cancel: (reason) => {
    const p = get().pending
    if (!p) return
    p.resolve({ approved: false, reason })
    set({ pending: null })
  },

  resolveWith: (result) => {
    const p = get().pending
    if (!p) return
    p.resolve(result)
    set({ pending: null })
  },
}))

/**
 * On tab unload, reject any pending request so callers' awaits unwind.
 * Without this, a navigation could leave the modal's promise dangling.
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    useSigningStore.getState().cancel("closed")
  })
}

/**
 * Signing-modal state.
 *
 * One global store. Send / Swap / Bridge / dApp flows call `open(tx)` and
 * `await` the returned promise; the user's confirm/reject resolves it.
 *
 * Why a store and not React context? Because the caller is anywhere — a
 * saga, a wagmi hook, a dApp connector callback. A zustand store is
 * importable from non-component code; context isn't.
 *
 * Lifetime invariant: at most one open() may be in-flight. A second open()
 * while another is pending is rejected synchronously with `concurrent`. We
 * refuse a queue: queued signing requests are an attack surface (UI race
 * lets a malicious tx slip in behind the user's confirm).
 */
import { create } from "zustand"

export interface UnsignedTx {
  /** "send" | "swap" | "bridge" | "dapp" — UI hints, not a security barrier. */
  origin: "send" | "swap" | "bridge" | "dapp"
  /** EIP-155 chain id for EVM txs. */
  chainId: number
  /** Sender address (read from active account). */
  from: `0x${string}`
  /** Recipient — contract for token ops, EOA for native sends. */
  to: `0x${string}`
  /** Native value in smallest unit (wei). String to preserve precision. */
  value: string
  /** Hex calldata; "0x" for plain native sends. */
  data: `0x${string}`
  /** Estimated gas (units). */
  gas?: string
  /** Estimated gas price (wei). */
  gasPrice?: string
  /** Optional dApp metadata for "dapp" origin. */
  dapp?: { name: string; url: string }
  /** Optional human-readable description from the caller. */
  summary?: string
}

export interface SigningResult {
  approved: boolean
  /** When approved, the caller signs and broadcasts. */
}

interface PendingRequest {
  tx: UnsignedTx
  resolve: (r: SigningResult) => void
  reject: (e: Error) => void
}

interface SigningState {
  pending: PendingRequest | null
  open(tx: UnsignedTx): Promise<SigningResult>
  confirm(): void
  reject(): void
  /** Hard cancel — used on route change / app lock. Resolves to rejected. */
  cancel(reason?: string): void
}

export const useSigningStore = create<SigningState>((set, get) => ({
  pending: null,
  open: (tx) =>
    new Promise<SigningResult>((resolve, reject) => {
      const cur = get().pending
      if (cur) {
        reject(new Error("concurrent"))
        return
      }
      set({ pending: { tx, resolve, reject } })
    }),
  confirm: () => {
    const cur = get().pending
    if (!cur) return
    set({ pending: null })
    cur.resolve({ approved: true })
  },
  reject: () => {
    const cur = get().pending
    if (!cur) return
    set({ pending: null })
    cur.resolve({ approved: false })
  },
  cancel: (reason = "cancelled") => {
    const cur = get().pending
    if (!cur) return
    set({ pending: null })
    cur.reject(new Error(reason))
  },
}))

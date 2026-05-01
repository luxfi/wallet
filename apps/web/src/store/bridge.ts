/**
 * Bridge-flow state. Drives `screens/bridge/*`.
 *
 *   idle      → editing form, no quote
 *   quoting   → fetching route from gateway
 *   ready     → quote fresh, "Confirm bridge" enabled
 *   locking   → source-chain lock tx in flight
 *   signing   → MPC ceremony in progress on M-Chain
 *   minting   → destination mint observed, awaiting confirmation
 *   done      → mint tx surfaced; user can navigate away
 *   error     → any leg failed; `error` populated
 *
 * The MPC ceremony is what differentiates Lux Teleport from a vanilla
 * lock-and-mint: the user signs ONLY the source lock; the destination
 * mint is signed by the bridge committee via threshold signatures. This
 * is reflected in the status machine — `signing` belongs to the M-Chain,
 * not to the user.
 */
import { create } from "zustand"
import type { Asset } from "../lib/asset"

export type BridgeStatus =
  | "idle"
  | "quoting"
  | "ready"
  | "locking"
  | "signing"
  | "minting"
  | "done"
  | "error"

export interface BridgeQuote {
  /** Amount the user receives on the destination chain (smallest units). */
  amountOut: string
  /** Bridge fee taken from the input amount (smallest units, source asset). */
  fee: string
  /** Estimated time to finality in seconds. */
  etaSeconds: number
  /** Path of chain ids — usually `[from, "lux-m", to]`. */
  path: string[]
  /** MPC threshold notation, e.g. "2/3". Rendered verbatim. */
  threshold: string
  /** Destination-chain mint contract address (informational). */
  mintContract?: `0x${string}`
  /** Quote freshness timestamp, ms epoch. Stale > 30s discarded before submit. */
  ts: number
}

export interface BridgeState {
  fromChainId: string
  toChainId: string
  asset: Asset | null
  amount: string
  /** Recipient on destination — empty means "same wallet" (caller's address). */
  recipient: string
  quote: BridgeQuote | null
  status: BridgeStatus
  lockTxHash: string | null
  mintTxHash: string | null
  error: string | null

  setFromChainId: (id: string) => void
  setToChainId: (id: string) => void
  flipChains: () => void
  setAsset: (a: Asset | null) => void
  setAmount: (v: string) => void
  setRecipient: (v: string) => void
  setQuote: (q: BridgeQuote | null) => void
  setStatus: (s: BridgeStatus) => void
  setLockTxHash: (h: string | null) => void
  setMintTxHash: (h: string | null) => void
  setError: (e: string | null) => void
  reset: () => void
}

const INITIAL = {
  // Default: bridge from Lux C-Chain → Zoo L1, the canonical "demo" route.
  fromChainId: "lux-c",
  toChainId: "zoo-l1",
  asset: null as Asset | null,
  amount: "",
  recipient: "",
  quote: null as BridgeQuote | null,
  status: "idle" as BridgeStatus,
  lockTxHash: null as string | null,
  mintTxHash: null as string | null,
  error: null as string | null,
}

export const useBridgeStore = create<BridgeState>((set, get) => ({
  ...INITIAL,
  setFromChainId: (fromChainId) => set({ fromChainId, quote: null }),
  setToChainId: (toChainId) => set({ toChainId, quote: null }),
  flipChains: () => {
    const { fromChainId, toChainId } = get()
    set({ fromChainId: toChainId, toChainId: fromChainId, quote: null, asset: null })
  },
  setAsset: (asset) => set({ asset, quote: null }),
  setAmount: (amount) => set({ amount, quote: null }),
  setRecipient: (recipient) => set({ recipient }),
  setQuote: (quote) => set({ quote }),
  setStatus: (status) => set({ status }),
  setLockTxHash: (lockTxHash) => set({ lockTxHash }),
  setMintTxHash: (mintTxHash) => set({ mintTxHash }),
  setError: (error) => set({ error }),
  reset: () => set({ ...INITIAL }),
}))

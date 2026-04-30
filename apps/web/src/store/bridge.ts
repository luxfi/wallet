/**
 * Bridge-flow state. Cross-chain via Lux Teleport (lock → MPC threshold sign →
 * mint) with Warp messaging as the transport.
 *
 * Phases:
 *   idle        → form being edited
 *   quoting     → fetching time-to-finality + fee from gateway
 *   preview     → quote returned, user reviewing route + ETA
 *   locking     → source-chain lock tx pending
 *   signing     → MPC threshold ceremony in progress
 *   minting     → destination-chain mint tx pending
 *   done        → asset arrived on destination
 *   error       → any leg failed; `error` populated
 *
 * Source/dest chain ids are stable string ids from `lib/asset` CHAINS map.
 */
import { create } from "zustand"
import type { Asset } from "../lib/asset"

export type BridgeStatus =
  | "idle"
  | "quoting"
  | "preview"
  | "locking"
  | "signing"
  | "minting"
  | "done"
  | "error"

export interface BridgeQuote {
  /** Estimated time to finality in seconds. */
  etaSeconds: number
  /** Bridge fee in source-asset smallest unit. */
  fee: string
  /** Output amount on destination in smallest unit. */
  amountOut: string
  /** Threshold ceremony participant count, e.g. "2-of-3". */
  threshold: string
  /** Path the quote uses, e.g. ["lux-c", "lux-b", "ethereum"]. */
  path: string[]
}

export interface BridgeState {
  fromChainId: string
  toChainId: string
  asset: Asset | null
  amount: string
  /** Optional override; defaults to user's address on dest chain. */
  recipient: string
  quote: BridgeQuote | null
  status: BridgeStatus
  lockTxHash: string | null
  mintTxHash: string | null
  error: string | null

  setFromChainId: (id: string) => void
  setToChainId: (id: string) => void
  setAsset: (a: Asset | null) => void
  setAmount: (v: string) => void
  setRecipient: (v: string) => void
  setQuote: (q: BridgeQuote | null) => void
  setStatus: (s: BridgeStatus) => void
  setLockTxHash: (h: string | null) => void
  setMintTxHash: (h: string | null) => void
  setError: (e: string | null) => void
  flipChains: () => void
  reset: () => void
}

const initial = {
  fromChainId: "lux-c",
  toChainId: "ethereum",
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
  ...initial,
  setFromChainId: (fromChainId) => set({ fromChainId, quote: null }),
  setToChainId: (toChainId) => set({ toChainId, quote: null }),
  setAsset: (asset) => set({ asset, quote: null }),
  setAmount: (amount) => set({ amount, quote: null }),
  setRecipient: (recipient) => set({ recipient }),
  setQuote: (quote) => set({ quote }),
  setStatus: (status) => set({ status }),
  setLockTxHash: (lockTxHash) => set({ lockTxHash }),
  setMintTxHash: (mintTxHash) => set({ mintTxHash }),
  setError: (error) => set({ error }),
  flipChains: () => {
    const { fromChainId, toChainId } = get()
    set({ fromChainId: toChainId, toChainId: fromChainId, quote: null })
  },
  reset: () => set({ ...initial }),
}))

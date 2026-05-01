/**
 * Swap-flow state. One store, six explicit phases.
 *
 *   idle         → editing form, no quote yet
 *   quoting      → fetching route + price impact
 *   ready        → quote fresh, "Confirm swap" enabled
 *   approving    → erc20.approve in flight (only if needed)
 *   swapping     → router/v4 swap tx in flight
 *   done         → tx confirmed
 *   error        → quote / approve / swap failed; `error` populated
 *
 * Reset is explicit: `/swap` mount clears state so a stale quote can never
 * replay across sessions.
 *
 * Pattern mirrors `store/send.ts` — pure data slice; async lives in hooks.
 */
import { create } from "zustand"
import type { Asset } from "../lib/asset"

export type SwapStatus =
  | "idle"
  | "quoting"
  | "ready"
  | "approving"
  | "swapping"
  | "done"
  | "error"

/**
 * Naming convention is LOCKED per spec: V2/V3 = AMM, V4 = DEX. The `kind`
 * field below is rendered verbatim in `QuoteRoute.tsx`.
 */
export type RouteKind = "amm-v2" | "amm-v3" | "dex-v4"

export interface SwapQuote {
  /** Amount in (smallest units, decimal string). */
  amountIn: string
  /** Amount out (smallest units, decimal string). */
  amountOut: string
  /** Effective price `amountOut / amountIn` as a decimal string. */
  price: string
  /** Price impact, basis points (1 bp = 0.01 %). 0–10000. */
  priceImpactBps: number
  /** Route shown to the user — chain of token symbols. */
  path: string[]
  /** AMM v2/v3 vs DEX v4. */
  kind: RouteKind
  /** Pool fee tier in bps for v3/v4 (e.g. 3000 = 0.30 %). 0 if N/A. */
  feeBps: number
  /** Router contract that will execute the swap. */
  router: `0x${string}`
  /** Calldata produced by the gateway / quoter. Trusted only after slippage
   * check + signing modal user confirmation. */
  calldata: `0x${string}`
  /** Wallet-recipient (zero address means caller). */
  recipient: `0x${string}`
  /** Quote freshness timestamp, ms epoch. Stale > 30s discarded. */
  ts: number
}

export interface SwapState {
  fromAsset: Asset | null
  toAsset: Asset | null
  amount: string
  /** Slippage tolerance in basis points (e.g. 50 = 0.50 %). */
  slippageBps: number
  quote: SwapQuote | null
  status: SwapStatus
  approveTxHash: string | null
  swapTxHash: string | null
  error: string | null

  setFromAsset: (a: Asset | null) => void
  setToAsset: (a: Asset | null) => void
  flipAssets: () => void
  setAmount: (v: string) => void
  setSlippageBps: (bps: number) => void
  setQuote: (q: SwapQuote | null) => void
  setStatus: (s: SwapStatus) => void
  setApproveTxHash: (h: string | null) => void
  setSwapTxHash: (h: string | null) => void
  setError: (e: string | null) => void
  reset: () => void
}

const INITIAL = {
  fromAsset: null as Asset | null,
  toAsset: null as Asset | null,
  amount: "",
  // 0.50 % default per SCREENS.md §3.
  slippageBps: 50,
  quote: null as SwapQuote | null,
  status: "idle" as SwapStatus,
  approveTxHash: null as string | null,
  swapTxHash: null as string | null,
  error: null as string | null,
}

export const useSwapStore = create<SwapState>((set, get) => ({
  ...INITIAL,
  setFromAsset: (fromAsset) => set({ fromAsset, quote: null }),
  setToAsset: (toAsset) => set({ toAsset, quote: null }),
  flipAssets: () => {
    const { fromAsset, toAsset } = get()
    set({ fromAsset: toAsset, toAsset: fromAsset, quote: null })
  },
  setAmount: (amount) => set({ amount, quote: null }),
  setSlippageBps: (slippageBps) => set({ slippageBps }),
  setQuote: (quote) => set({ quote }),
  setStatus: (status) => set({ status }),
  setApproveTxHash: (approveTxHash) => set({ approveTxHash }),
  setSwapTxHash: (swapTxHash) => set({ swapTxHash }),
  setError: (error) => set({ error }),
  reset: () => set({ ...INITIAL }),
}))

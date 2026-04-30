/**
 * Swap-flow state. Naming convention (locked):
 *   AMM = V2 + V3 (Lux DEX, Zoo DEX V2/V3)
 *   DEX = V4       (Zoo DEX V4 precompile, cross-chain hops)
 *
 * Phases:
 *   idle        → form being edited
 *   quoting     → quote in flight (gateway or on-chain quoter)
 *   preview     → quote returned, user reviewing route + slippage
 *   approving   → ERC-20 approve tx pending (skipped for native swaps)
 *   swapping    → swap router writeContract pending
 *   done        → swap landed
 *   error       → quote/approve/swap failed
 *
 * Reset is explicit: callers invoke `reset()` on /swap route mount.
 *
 * Foundation Blue owns adding zustand to apps/web/package.json.
 */
import { create } from "zustand"
import type { Asset } from "../lib/asset"

export type SwapStatus =
  | "idle"
  | "quoting"
  | "preview"
  | "approving"
  | "swapping"
  | "done"
  | "error"

/**
 * Routing tier the quoter selected.
 *   amm-v2 = constant-product (Lux DEX V2 / Zoo V2)
 *   amm-v3 = concentrated liquidity (Lux DEX V3 / Zoo V3)
 *   dex-v4 = V4 precompile / cross-chain hop (Zoo V4 → Lux DEX)
 */
export type RouteKind = "amm-v2" | "amm-v3" | "dex-v4"

export interface Route {
  kind: RouteKind
  /** Path: symbol or contract addresses, source-first → dest-last. */
  path: string[]
  /** Pool fee tier in basis points (3000 = 0.3%). */
  feeBps: number
  /** Output amount in smallest-unit string. */
  amountOut: string
  /** Price impact as a fraction (0.0002 = 0.02%). */
  priceImpact: number
  /** Estimated network fee in wei (string). */
  networkFee: string
}

export interface SwapState {
  fromAsset: Asset | null
  toAsset: Asset | null
  amountIn: string
  /** Slippage tolerance as fraction; 0.005 = 0.5%. */
  slippage: number
  /** F-Chain confidential mode flag. Advanced; off by default. */
  confidential: boolean
  route: Route | null
  status: SwapStatus
  approveTxHash: string | null
  swapTxHash: string | null
  error: string | null

  setFromAsset: (a: Asset | null) => void
  setToAsset: (a: Asset | null) => void
  setAmountIn: (v: string) => void
  setSlippage: (v: number) => void
  setConfidential: (v: boolean) => void
  setRoute: (r: Route | null) => void
  setStatus: (s: SwapStatus) => void
  setApproveTxHash: (h: string | null) => void
  setSwapTxHash: (h: string | null) => void
  setError: (e: string | null) => void
  flip: () => void
  reset: () => void
}

const initial = {
  fromAsset: null as Asset | null,
  toAsset: null as Asset | null,
  amountIn: "",
  slippage: 0.005,
  confidential: false,
  route: null as Route | null,
  status: "idle" as SwapStatus,
  approveTxHash: null as string | null,
  swapTxHash: null as string | null,
  error: null as string | null,
}

export const useSwapStore = create<SwapState>((set, get) => ({
  ...initial,
  setFromAsset: (fromAsset) => set({ fromAsset, route: null }),
  setToAsset: (toAsset) => set({ toAsset, route: null }),
  setAmountIn: (amountIn) => set({ amountIn, route: null }),
  setSlippage: (slippage) => set({ slippage }),
  setConfidential: (confidential) => set({ confidential }),
  setRoute: (route) => set({ route }),
  setStatus: (status) => set({ status }),
  setApproveTxHash: (approveTxHash) => set({ approveTxHash }),
  setSwapTxHash: (swapTxHash) => set({ swapTxHash }),
  setError: (error) => set({ error }),
  flip: () => {
    const { fromAsset, toAsset } = get()
    set({ fromAsset: toAsset, toAsset: fromAsset, amountIn: "", route: null })
  },
  reset: () => set({ ...initial }),
}))

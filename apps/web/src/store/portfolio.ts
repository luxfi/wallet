/**
 * Portfolio slice. NOT persisted — balances re-fetch on unlock.
 *
 * Why no persist: balances are a function of (chain state, address) and we
 * never want stale numbers to drive a Send/Swap. Treat them as a UI cache,
 * never a source of truth.
 */
import { create } from "zustand"

export interface TokenBalance {
  /** ERC-20 contract address, or "native" for chain-native asset. */
  address: string
  symbol: string
  name: string
  decimals: number
  /** Raw on-chain balance, lowest-denomination, decimal string. */
  balance: string
  /** USD value at last fetch. Optional — price source may be unavailable. */
  usd?: number
}

export interface ChainPortfolio {
  chainId: number
  /** Native asset balance (LUX, ZOO, etc), formatted in major units. */
  native: TokenBalance
  /** ERC-20 / ZRC-20 holdings on this chain. */
  tokens: TokenBalance[]
}

export interface PortfolioState {
  totalUSD: number
  perChain: ChainPortfolio[]
  lastFetched: number | null
  isLoading: boolean

  setPortfolio: (perChain: ChainPortfolio[], totalUSD: number) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const usePortfolio = create<PortfolioState>((set) => ({
  totalUSD: 0,
  perChain: [],
  lastFetched: null,
  isLoading: false,

  setPortfolio: (perChain, totalUSD) =>
    set({ perChain, totalUSD, lastFetched: Date.now(), isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({ totalUSD: 0, perChain: [], lastFetched: null, isLoading: false }),
}))

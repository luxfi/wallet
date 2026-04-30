/**
 * Portfolio module entry. Two integration shapes are supported:
 *
 *   1. Foundation router with `path: "portfolio"`. The default export
 *      renders <Portfolio> directly. Asset detail at `/portfolio/:address`
 *      is reachable when foundation upgrades to `path: "portfolio/*"`.
 *
 *   2. Foundation router with `path: "portfolio/*"`. The nested <Routes>
 *      picks up the index + detail.
 *
 * Either way, this module stays self-contained.
 */
import { Route, Routes } from "react-router-dom"
import Portfolio from "./Portfolio"
import AssetDetail from "./AssetDetail"

export default function PortfolioRoutes() {
  return (
    <Routes>
      <Route index element={<Portfolio />} />
      <Route path=":address" element={<AssetDetail />} />
      <Route path="*" element={<Portfolio />} />
    </Routes>
  )
}

export { Portfolio, AssetDetail }
export { useChainBalances, CHAINS } from "./useChainBalances"
export { useTotalUSD } from "./useTotalUSD"
export { usePerLLMTokens } from "./usePerLLMTokens"

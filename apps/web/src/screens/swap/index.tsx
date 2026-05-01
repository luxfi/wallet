/**
 * Swap routes. Mounts at `/swap` and `/swap/confirm`.
 *
 *   /swap          → main form (Swap)
 *   /swap/confirm  → review / sign step (currently identical surface; the
 *                    confirm slot exists for full-screen review on mobile
 *                    form-factors per SCREENS.md §3 "Review swap").
 *
 * Foundation's data router lazy-loads this default-export with no props.
 * The asset universe comes from `usePortfolioAssets()` — same pattern as
 * Send (see `screens/send/index.tsx`). When the portfolio store is wired,
 * the hook returns real assets; until then it returns `[]` and the form
 * still renders for layout review.
 */
import { Routes, Route } from "react-router-dom"
import { Swap } from "./Swap"
import { usePortfolioAssets } from "../send/usePortfolioAssets"

export default function SwapRoutes() {
  const assets = usePortfolioAssets()
  return (
    <Routes>
      <Route index element={<Swap assets={assets} />} />
      <Route path="confirm" element={<Swap assets={assets} />} />
    </Routes>
  )
}

// Named exports so Foundation can compose without the default if needed.
export { Swap } from "./Swap"
export { TokenSelector } from "./TokenSelector"
export { QuoteRoute } from "./QuoteRoute"
export { useSwapQuote } from "./useSwapQuote"
export { useSwapExecute } from "./useSwapExecute"

/**
 * Bridge routes. Mounts at `/bridge`.
 *
 * Single page; the lock → MPC → mint progression is shown in the route
 * preview + button label state machine inside `Bridge.tsx`. No separate
 * confirm screen for now — SCREENS.md §5 specifies a single panel.
 *
 * Foundation's data router lazy-loads this default-export with no props.
 * The asset universe comes from `usePortfolioAssets()` — same pattern as
 * Send and Swap.
 */
import { Routes, Route } from "react-router-dom"
import { Bridge } from "./Bridge"
import { usePortfolioAssets } from "../send/usePortfolioAssets"

export default function BridgeRoutes() {
  const assets = usePortfolioAssets()
  return (
    <Routes>
      <Route index element={<Bridge assets={assets} />} />
    </Routes>
  )
}

// Named exports so Foundation can compose without the default if needed.
export { Bridge } from "./Bridge"
export { useBridgeQuote } from "./useBridgeQuote"
export { useBridgeExecute } from "./useBridgeExecute"

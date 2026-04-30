/**
 * `/send` route tree.
 *
 *   /send                  → Send form
 *   /send/confirm          → ConfirmSend (re-auth + sign)
 *   /send/result/:hash     → BroadcastResult (poll receipt)
 *
 * Foundation's data-router maps `/send` to this default-export. To enable
 * the nested children Foundation needs to change `path: "send"` to
 * `path: "send/*"` in `router.tsx` (one-line change, flagged in the
 * Foundation handoff below). Until then, /send still renders correctly —
 * the nested routes simply aren't reachable.
 *
 * Asset list comes from the portfolio store; we read it via a hook that
 * returns `[]` if the portfolio slice isn't wired yet so the form still
 * renders for layout review.
 */
import { Routes, Route } from "react-router-dom"
import Send from "./Send"
import ConfirmSend from "./ConfirmSend"
import BroadcastResult from "./BroadcastResult"
import { usePortfolioAssets } from "./usePortfolioAssets"

export default function SendRoutes() {
  const assets = usePortfolioAssets()
  return (
    <Routes>
      <Route index element={<Send assets={assets} />} />
      <Route path="confirm" element={<ConfirmSend />} />
      <Route path="result/:hash" element={<BroadcastResult />} />
    </Routes>
  )
}

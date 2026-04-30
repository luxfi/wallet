/**
 * dApps screen routes.
 *
 * Routes:
 *   /dapps           → DApps landing
 *   /dapps/connect   → Connect (paste wc:// or scan QR)
 *   /dapps/sessions  → ActiveSessions list
 *
 * Mounted by Foundation under
 * `<Route path="/dapps/*" element={<DAppsRoutes />} />`.
 */

import { Route, Routes } from "react-router-dom"
import { ActiveSessions } from "./ActiveSessions"
import { Connect } from "./Connect"
import { DApps } from "./DApps"

export function DAppsRoutes() {
  return (
    <Routes>
      <Route index element={<DApps />} />
      <Route path="connect" element={<Connect />} />
      <Route path="sessions" element={<ActiveSessions />} />
    </Routes>
  )
}

export default DAppsRoutes
export { DApps, Connect, ActiveSessions }
export { useWalletConnect } from "./useWalletConnect"
export { useTrustedDApps } from "./useTrustedDApps"

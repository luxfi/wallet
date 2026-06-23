/**
 * `/download` route — per-brand native download host. Single screen.
 *
 * Mounted under `<Routes>` from `apps/web/src/router.tsx`:
 *
 *     import DownloadRoutes from "./screens/download"
 *     …
 *     <Route path="/download/*" element={<DownloadRoutes />} />
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { Routes, Route } from "react-router-dom"
import Download from "./Download"

export default function DownloadRoutes() {
  return (
    <Routes>
      <Route index element={<Download />} />
    </Routes>
  )
}

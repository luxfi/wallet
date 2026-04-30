/**
 * `/receive` route. Single screen — no nested children for now.
 *
 * Foundation Blue mounts this under `<Routes>` from `apps/web/src/router.tsx`:
 *
 *     import ReceiveRoutes from "./screens/receive"
 *     …
 *     <Route path="/receive/*" element={<ReceiveRoutes />} />
 */
import { Routes, Route } from "react-router-dom"
import Receive from "./Receive"

export default function ReceiveRoutes() {
  return (
    <Routes>
      <Route index element={<Receive />} />
    </Routes>
  )
}

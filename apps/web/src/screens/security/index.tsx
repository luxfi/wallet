/**
 * `/security` route — responsible disclosure. Single screen, no auth: a
 * researcher reads it before they have an account, and the catch-all would
 * otherwise send them to the portfolio.
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { Routes, Route } from "react-router-dom"
import Security from "./Security"

export default function SecurityRoutes() {
  return (
    <Routes>
      <Route index element={<Security />} />
    </Routes>
  )
}

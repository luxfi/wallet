/**
 * Stake screen routes.
 *
 * Exports a `<StakeRoutes />` element that Foundation mounts under
 * `<Route path="/stake/*" element={<StakeRoutes />} />`.
 *
 * Routes:
 *   /stake               → Stake landing
 *   /stake/validators    → ValidatorList (full screen)
 *   /stake/:nodeID       → StakeForm pre-selecting nodeID
 */

import { Link, Route, Routes, useNavigate } from "react-router-dom"
import { Stake } from "./Stake"
import { StakeForm } from "./StakeForm"
import { ValidatorList } from "./ValidatorList"
import { type Validator } from "../../store/stake"
import { useValidators } from "./useValidators"

function ValidatorsPage() {
  useValidators()
  const navigate = useNavigate()
  const onSelect = (v: Validator) =>
    navigate(`/stake/${encodeURIComponent(v.nodeID)}`)
  return (
    <section style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
      <header>
        <Link to="/stake">← Back</Link>
        <h1 style={{ margin: "0.5rem 0" }}>Validators</h1>
      </header>
      <ValidatorList onSelect={onSelect} />
    </section>
  )
}

export function StakeRoutes() {
  return (
    <Routes>
      <Route index element={<Stake />} />
      <Route path="validators" element={<ValidatorsPage />} />
      <Route path=":nodeID" element={<StakeForm />} />
    </Routes>
  )
}

export default StakeRoutes
export { Stake, StakeForm, ValidatorList }
export { useValidators } from "./useValidators"
export { useStake } from "./useStake"

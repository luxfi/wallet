/**
 * Confidential slice — public exports.
 *
 * `<ConfidentialRoutes />` mounts under `/confidential/*`. It renders only
 * when the brand names a confidential gateway (`brand.json:api.confidential`);
 * otherwise it says the network does not serve it.
 */

import { Route, Routes } from "react-router-dom"
import { confidentialServed } from "./brand"
import { Confidential } from "./Confidential"
import { ConfidentialTransfer } from "./ConfidentialTransfer"
import { ZKProofGenerator } from "./ZKProofGenerator"
import { ZKProofShare } from "./ZKProofShare"

export { Confidential } from "./Confidential"
export { ConfidentialTransfer } from "./ConfidentialTransfer"
export { ConfidentialBalanceRow } from "./ConfidentialBalanceRow"
export { RevealCommittee } from "./RevealCommittee"
export { ZKProofGenerator } from "./ZKProofGenerator"
export { ZKProofShare } from "./ZKProofShare"
export { useFHEBalance } from "./useFHEBalance"
export { useFHETransfer } from "./useFHETransfer"
export { useZKProof } from "./useZKProof"
export { confidentialStore } from "../../store/confidential"
export type {
  FHEBalance,
  RevealedBalance,
  CommitteeMember,
  DecryptSession,
  ClaimType,
  ClaimParams,
  ZKProof,
  FHERecipient,
} from "./types"

/** A brand that serves no confidential gateway says so, and nothing below is mounted. */
function ConfidentialUnavailable() {
  return (
    <section style={{ padding: "1rem", display: "grid", gap: "0.5rem" }}>
      <h1 style={{ margin: 0 }}>Confidential</h1>
      <p role="status" style={{ margin: 0, opacity: 0.8 }}>
        Confidential transfers are unavailable: this network does not serve them.
      </p>
    </section>
  )
}


/**
 * Root routes for the Confidential slice. Mount under any parent path; the
 * child paths are relative.
 *
 *   /confidential                  → landing
 *   /confidential/transfer         → F-Chain transfer
 *   /confidential/zk               → ZK claim picker
 *   /confidential/zk/share/:id     → share generated proof
 *   /confidential/zk/:claimType    → ZK generator for a specific claim
 */
export function ConfidentialRoutes() {
  if (!confidentialServed()) return <ConfidentialUnavailable />
  return (
    <Routes>
      <Route index element={<Confidential />} />
      <Route path="transfer" element={<ConfidentialTransfer />} />
      <Route path="zk" element={<ZKProofGenerator />} />
      <Route path="zk/share/:id" element={<ZKProofShare />} />
      <Route path="zk/:claimType" element={<ZKProofGenerator />} />
    </Routes>
  )
}

export default ConfidentialRoutes

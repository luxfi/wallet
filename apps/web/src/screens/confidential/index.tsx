/**
 * Confidential slice — public exports.
 *
 * `<ConfidentialRoutes />` is the route block to mount under the app router.
 * Foundation can mount it as a child of any parent layout:
 *
 *     <Routes>
 *       <Route path="/*" element={<AppShell />}>
 *         {/ * other routes * /}
 *         {ConfidentialRouteElements()}
 *       </Route>
 *     </Routes>
 *
 * Or, if Foundation prefers a sub-router pattern:
 *
 *     <Route path="/confidential/*" element={<ConfidentialRoutes />} />
 */

import { Route, Routes } from "react-router-dom"
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

/**
 * Alternate: explicit Route elements suitable for inlining into a parent
 * `<Routes>` block. Use whichever pattern Foundation prefers.
 */
export function confidentialRouteElements() {
  return [
    <Route key="confidential-index" path="/confidential" element={<Confidential />} />,
    <Route key="confidential-transfer" path="/confidential/transfer" element={<ConfidentialTransfer />} />,
    <Route key="confidential-zk" path="/confidential/zk" element={<ZKProofGenerator />} />,
    <Route key="confidential-zk-share" path="/confidential/zk/share/:id" element={<ZKProofShare />} />,
    <Route key="confidential-zk-claim" path="/confidential/zk/:claimType" element={<ZKProofGenerator />} />,
  ]
}

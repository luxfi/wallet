/**
 * Signing slice — public surface.
 *
 * Mount `<SigningModal />` once at the app root. Call `signingModal.open(tx)`
 * (or `useSigningModal()` from React) anywhere to request user confirmation.
 *
 * Foundation Blue integration in `App.tsx`:
 *
 *   import SigningModal from "./screens/signing"
 *   …
 *   <>
 *     <Routes>{ … }</Routes>
 *     <SigningModal />
 *   </>
 */
export { default } from "./SigningModal"
export { default as SigningModal } from "./SigningModal"
export { default as TxSummary, ContractDecode } from "./TxSummary"
export {
  default as RiskIndicator,
  assessRisk,
  type RiskAssessment,
  type RiskLevel,
} from "./RiskIndicator"
export {
  signingModal,
  useSigningModal,
  type SigningModalApi,
  type UnsignedTx,
  type SigningResult,
} from "./useSigningModal"

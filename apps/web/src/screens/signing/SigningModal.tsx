/**
 * SigningModal — global tx confirmation surface.
 *
 * Mounts once at the app root. Listens to `useSigningStore` and renders
 * the modal whenever a tx is pending. Confirm/Reject resolves the
 * caller's `await signingModal.open(tx)` promise.
 *
 * Threat model:
 *   - This is the user's last chance to refuse a transaction. The modal
 *     MUST display canonical decoded calldata (lib/abi). Trust nothing
 *     supplied by the dApp beyond the raw tx envelope.
 *   - We render the risk badge ABOVE the action buttons so the user
 *     sees yellow/red before pressing confirm. The Confirm button
 *     stays enabled — heuristics never block, only inform.
 *   - We trap focus in the modal and rejectt on ESC / backdrop click
 *     (resolves with reason: "closed").
 *   - The modal's parent (App.tsx) is the only place that mounts this
 *     so we never end up with two listeners racing the same store.
 */
import { useEffect, useState } from "react"
import { type DecodedCall } from "../../lib/abi"
import RiskIndicator, { assessRisk, type RiskAssessment } from "./RiskIndicator"
import TxSummary from "./TxSummary"
import { useSigningStore } from "../../store/signing"
import { useSession } from "../../store/session"

export default function SigningModal() {
  const pending = useSigningStore((s) => s.pending)
  const confirm = useSigningStore((s) => s.confirm)
  const reject = useSigningStore((s) => s.reject)
  const cancel = useSigningStore((s) => s.cancel)
  const resolveWith = useSigningStore((s) => s.resolveWith)

  const [decoded, setDecoded] = useState<DecodedCall | null>(null)
  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [signing, setSigning] = useState(false)

  // Reset decode + signing state on every new tx.
  useEffect(() => {
    setDecoded(null)
    setRisk(null)
    setSigning(false)
  }, [pending?.from, pending?.to, pending?.data, pending?.value])

  // Re-assess whenever decode result changes.
  useEffect(() => {
    if (!pending) return
    setRisk(assessRisk(pending, decoded))
  }, [pending, decoded])

  // ESC closes the modal.
  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel("closed")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pending, cancel])

  // Confirm handler. For a custody tx, request the MPC threshold signature
  // from the backend and resolve with it; otherwise resolve the local-key
  // approval (the caller signs with the in-RAM mnemonic). A custody failure
  // resolves with reason:"error" — never a silent noop.
  const onConfirm = async () => {
    if (!pending) return
    if (!pending.custody) {
      confirm()
      return
    }
    setSigning(true)
    try {
      const res = await useSession.getState().signWithCustody({
        chainId: pending.chainId,
        payloadHash: pending.custody.payloadHash,
        scheme: pending.custody.scheme,
      })
      resolveWith({ approved: true, signature: res.signature })
    } catch (e) {
      resolveWith({
        approved: false,
        reason: "error",
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  if (!pending) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signing-title"
      style={backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel("closed")
      }}
    >
      <section style={panel}>
        <header style={panelHeader}>
          <h2 id="signing-title" style={title}>
            Confirm transaction
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => cancel("closed")}
            style={closeBtn}
          >
            ×
          </button>
        </header>

        {risk && (
          <div style={{ marginBottom: 12 }}>
            <RiskIndicator assessment={risk} />
          </div>
        )}

        <TxSummary tx={pending} onDecoded={setDecoded} />

        <footer style={footer}>
          <button type="button" onClick={reject} style={rejectBtn} disabled={signing}>
            Reject
          </button>
          <button type="button" onClick={onConfirm} style={confirmBtn} disabled={signing}>
            {signing ? "Signing…" : "Confirm"}
          </button>
        </footer>
      </section>
    </div>
  )
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 100,
}
const panel: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  width: "100%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflow: "auto",
  padding: 16,
  color: "#fff",
}
const panelHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
}
const title: React.CSSProperties = { fontSize: 18, fontWeight: 600, margin: 0 }
const closeBtn: React.CSSProperties = {
  background: "transparent",
  color: "rgba(255,255,255,0.6)",
  border: "none",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
}
const footer: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 16,
  justifyContent: "flex-end",
}
const rejectBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
}
const confirmBtn: React.CSSProperties = {
  padding: "10px 18px",
  background: "#fff",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}

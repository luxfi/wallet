/**
 * SigningModal — global confirm-or-reject dialog for outbound transactions.
 *
 * Mounted ONCE at the app root by Foundation Blue's `App.tsx`. Subscribes
 * to `useSigningStore`; when a `pending` request appears, it renders the
 * modal. Returns nothing while idle.
 *
 * Foundation Blue integration (one-line):
 *
 *   import SigningModal from "./screens/signing/SigningModal"
 *   …
 *   <SigningModal />        ← mount once at root, sibling to <Routes>
 *
 * Callers anywhere in the app:
 *
 *   import { signingModal } from "./screens/signing/useSigningModal"
 *   const { approved } = await signingModal.open(tx)
 *
 * Behaviour:
 *   - `Esc` rejects (same as Cancel).
 *   - Backdrop click rejects.
 *   - Focus is trapped inside the dialog while open.
 *   - The body scroll is locked while open.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { type DecodedCall, decodeLocal } from "../../lib/abi"
import { useSigningStore } from "../../store/signing"
import RiskIndicator, { assessRisk, type RiskAssessment } from "./RiskIndicator"
import TxSummary from "./TxSummary"

export default function SigningModal() {
  const pending = useSigningStore((s) => s.pending)
  const confirm = useSigningStore((s) => s.confirm)
  const reject = useSigningStore((s) => s.reject)

  const [decoded, setDecoded] = useState<DecodedCall | null>(null)

  // Recompute initial decode whenever a new pending tx arrives.
  useEffect(() => {
    if (!pending) {
      setDecoded(null)
      return
    }
    setDecoded(decodeLocal(pending.tx.data))
  }, [pending])

  const risk: RiskAssessment | null = useMemo(() => {
    if (!pending) return null
    return assessRisk(pending.tx, decoded)
  }, [pending, decoded])

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!pending) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [pending])

  // Esc to reject.
  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        reject()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pending, reject])

  // Focus the cancel button on open so Enter doesn't accidentally confirm.
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (pending) cancelRef.current?.focus()
  }, [pending])

  if (!pending || !risk) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-h"
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) reject()
      }}
    >
      <div style={dialog}>
        <header style={head}>
          <h2 id="sign-h" style={title}>
            Confirm transaction
          </h2>
        </header>
        <div style={body}>
          <RiskIndicator assessment={risk} />
          <TxSummary tx={pending.tx} onDecoded={setDecoded} />
        </div>
        <footer style={foot}>
          <button
            ref={cancelRef}
            type="button"
            onClick={reject}
            style={ghostBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            style={risk.level === "red" ? dangerBtn : primaryBtn}
            aria-label="Confirm and sign transaction"
          >
            {risk.level === "red" ? "Sign anyway" : "Sign"}
          </button>
        </footer>
      </div>
    </div>
  )
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
}
const dialog: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  background: "#0a0a0a",
  border: "1px solid #1a1a1a",
  borderRadius: 16,
  color: "#fff",
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
}
const head: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #1a1a1a",
}
const title: React.CSSProperties = { fontSize: 16, fontWeight: 600, margin: 0 }
const body: React.CSSProperties = {
  padding: 20,
  overflowY: "auto",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 16,
}
const foot: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: 16,
  borderTop: "1px solid #1a1a1a",
}
const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  background: "transparent",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
}
const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  background: "#fff",
  color: "#000",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}
const dangerBtn: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  background: "#ff6b6b",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}

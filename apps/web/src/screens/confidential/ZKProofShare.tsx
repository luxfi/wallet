/**
 * Z-Chain proof share screen — QR + copyable verifier link.
 *
 * Verifier URL: https://verify.lux.exchange/?proof=<base64>
 * QR is rendered inline as a pure-SVG using a small generator (no external
 * dependency). For production-quality QRs, swap in `qrcode` / `qrcode-svg`.
 */

import { useCallback, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { colors, layout, text } from "./styles"
import { confidentialStore } from "../../store/confidential"
import { renderQrSvg } from "./qr"

const VERIFIER_BASE = "https://verify.lux.exchange/"

function encodeProof(proof: string, publicInputs: string, circuit: string): string {
  // Pack the verifier-relevant data into a single base64url payload.
  const payload = JSON.stringify({ proof, publicInputs, circuit })
  if (typeof btoa !== "undefined") {
    return btoa(payload).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
  }
  // Node fallback (vitest etc.)
  return Buffer.from(payload).toString("base64url")
}

export function ZKProofShare() {
  const { id } = useParams<{ id: string }>()
  const proof = id ? confidentialStore.getProof(id) : undefined

  const verifyUrl = useMemo(() => {
    if (!proof) return ""
    const enc = encodeProof(proof.proof, proof.publicInputs, proof.circuit)
    return `${VERIFIER_BASE}?proof=${enc}`
  }, [proof])

  const qrSvg = useMemo(() => (verifyUrl ? renderQrSvg(verifyUrl) : ""), [verifyUrl])

  const [copied, setCopied] = useState(false)
  const onCopy = useCallback(async () => {
    if (!verifyUrl) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(verifyUrl)
      } else {
        const ta = document.createElement("textarea")
        ta.value = verifyUrl
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* swallow */
    }
  }, [verifyUrl])

  if (!proof) {
    return (
      <div style={layout.page}>
        <div style={layout.container}>
          <div style={layout.header}>
            <h1 style={text.h1}>Proof not found</h1>
            <Link to="/confidential/zk" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
              Back
            </Link>
          </div>
          <p style={text.muted}>
            This proof has been cleared from local memory. Re-generate to share again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={layout.page}>
      <div style={layout.container}>
        <div style={layout.header}>
          <h1 style={text.h1}>Share proof</h1>
          <Link to="/confidential/zk" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
            Back
          </Link>
        </div>

        <div style={layout.card}>
          <div style={text.h3}>{proof.claim.type}</div>
          {proof.claim.type === "BalanceGT" ? (
            <div style={{ ...text.muted, marginTop: 4 }}>
              Threshold: {proof.claim.threshold} {proof.claim.symbol}
            </div>
          ) : null}
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <span style={layout.badge}>Z-CHAIN</span>
            <span style={{ ...layout.badge, borderColor: colors.borderHi, color: colors.textMuted }}>
              {proof.circuit}
            </span>
          </div>
          <div style={{ ...text.muted, marginTop: 4 }}>
            Generated {new Date(proof.generatedAt).toLocaleString()}
          </div>
        </div>

        <div style={{ ...layout.card, display: "flex", justifyContent: "center", padding: 24 }}>
          <div
            style={{ background: "#fff", padding: 12, borderRadius: 8 }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        <div style={layout.card}>
          <div style={layout.label}>Verifier link</div>
          <div
            style={{
              ...layout.mono,
              background: colors.surface2,
              border: `1px solid ${colors.border}`,
              padding: 10,
              borderRadius: 8,
              wordBreak: "break-all",
            }}
          >
            {verifyUrl}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={layout.button} onClick={onCopy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              style={layout.buttonDanger}
              onClick={() => {
                if (proof) confidentialStore.removeProof(proof.id)
              }}
            >
              Revoke locally
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Z-Chain selective-disclosure proof generator.
 *
 * Preset claims:
 *   - BalanceGT(threshold, symbol) — prove balance > threshold without revealing it.
 *   - AccreditedUS — prove SEC-accredited investor status.
 *   - AgeGT18 — prove age > 18 without revealing DOB.
 *   - JurisdictionNotSanctioned — prove residency outside OFAC list.
 *
 * The claim type is in the URL (/confidential/zk/:claimType), so deep links
 * work. The generator builds the witness (currently from form input — in
 * production this comes from the wallet keystore + KYC attestations) and
 * dispatches to useZKProof.
 */

import { useCallback, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { colors, layout, text } from "./styles"
import type { ClaimParams, ClaimType } from "./types"
import { useZKProof } from "./useZKProof"

interface ClaimMeta {
  type: ClaimType
  title: string
  blurb: string
  needsParams: boolean
  /** True if the witness is derived from on-device data (no external attestation). */
  selfCustody: boolean
}

const CLAIMS: ClaimMeta[] = [
  {
    type: "BalanceGT",
    title: "I hold more than X",
    blurb: "Prove a balance threshold without revealing the actual balance.",
    needsParams: true,
    selfCustody: true,
  },
  {
    type: "AccreditedUS",
    title: "I am a US accredited investor",
    blurb: "Prove SEC-accredited status from a verified KYC attestation.",
    needsParams: false,
    selfCustody: false,
  },
  {
    type: "AgeGT18",
    title: "I am over 18",
    blurb: "Prove age threshold from a government ID attestation.",
    needsParams: false,
    selfCustody: false,
  },
  {
    type: "JurisdictionNotSanctioned",
    title: "My jurisdiction is not sanctioned",
    blurb: "Prove residency outside OFAC-listed jurisdictions.",
    needsParams: false,
    selfCustody: false,
  },
]

export function ZKProofGenerator() {
  const { claimType } = useParams<{ claimType?: string }>()
  const navigate = useNavigate()
  const { prove, generating, error, progress } = useZKProof()

  const meta = useMemo(
    () => CLAIMS.find((c) => c.type === claimType) ?? null,
    [claimType],
  )

  // BalanceGT params.
  const [threshold, setThreshold] = useState("100")
  const [symbol, setSymbol] = useState("LUX")

  const onGenerate = useCallback(async () => {
    if (!meta) return
    let claim: ClaimParams
    let witness: unknown
    switch (meta.type) {
      case "BalanceGT":
        claim = { type: "BalanceGT", threshold, symbol }
        // Real witness comes from the keystore — placeholder for now.
        witness = { source: "wallet-keystore" }
        break
      case "AccreditedUS":
        claim = { type: "AccreditedUS" }
        witness = { source: "kyc-attestation" }
        break
      case "AgeGT18":
        claim = { type: "AgeGT18" }
        witness = { source: "id-attestation" }
        break
      case "JurisdictionNotSanctioned":
        claim = { type: "JurisdictionNotSanctioned" }
        witness = { source: "id-attestation" }
        break
    }
    const r = await prove(claim, witness)
    if (r) {
      navigate(`/confidential/zk/share/${r.proof.id}`)
    }
  }, [meta, threshold, symbol, prove, navigate])

  if (!claimType || !meta) {
    // Picker view.
    return (
      <div style={layout.page}>
        <div style={layout.container}>
          <div style={layout.header}>
            <h1 style={text.h1}>ZK selective disclosure</h1>
            <Link to="/confidential" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
              Back
            </Link>
          </div>
          <p style={{ ...text.muted, marginBottom: 16 }}>
            Pick a claim. Your proof reveals only that the claim is true.
          </p>
          <div style={layout.col}>
            {CLAIMS.map((c) => (
              <Link
                key={c.type}
                to={`/confidential/zk/${c.type}`}
                style={{ ...layout.card, textDecoration: "none", color: colors.text, display: "block" }}
              >
                <div style={text.h3}>{c.title}</div>
                <div style={{ ...text.muted, marginTop: 4 }}>{c.blurb}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <span style={layout.badge}>Z-CHAIN</span>
                  {c.selfCustody ? (
                    <span style={{ ...layout.badge, borderColor: colors.success, color: colors.success }}>
                      self-custody
                    </span>
                  ) : (
                    <span style={{ ...layout.badge, borderColor: colors.warn, color: colors.warn }}>
                      requires attestation
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Param + generate view.
  return (
    <div style={layout.page}>
      <div style={layout.container}>
        <div style={layout.header}>
          <h1 style={text.h1}>{meta.title}</h1>
          <Link to="/confidential/zk" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
            Back
          </Link>
        </div>

        <div style={layout.warn}>
          Z-Chain proof — generation can take several seconds. Cost is roughly 3×
          a standard transfer (LP-063).
        </div>

        <div style={layout.card}>
          <p style={text.body}>{meta.blurb}</p>

          {meta.type === "BalanceGT" ? (
            <div style={{ ...layout.col, marginTop: 12 }}>
              <div>
                <div style={layout.label}>Threshold</div>
                <input
                  style={layout.input}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                />
              </div>
              <div>
                <div style={layout.label}>Asset</div>
                <select
                  style={layout.input}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                >
                  <option value="LUX">LUX</option>
                  <option value="ZOO">ZOO</option>
                  <option value="AI">AI</option>
                </select>
              </div>
            </div>
          ) : null}

          <button
            style={{ ...layout.button, marginTop: 16, opacity: generating ? 0.6 : 1 }}
            onClick={onGenerate}
            disabled={generating}
          >
            {generating ? `Generating proof… ${progress}%` : "Generate proof"}
          </button>

          {generating ? (
            <div
              style={{
                background: colors.surface2,
                border: `1px solid ${colors.border}`,
                height: 4,
                borderRadius: 999,
                overflow: "hidden",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: colors.accent,
                  transition: "width 200ms ease",
                }}
              />
            </div>
          ) : null}

          {error ? (
            <div style={{ ...layout.warn, color: colors.danger, borderColor: colors.danger, marginTop: 12 }}>
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

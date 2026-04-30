/**
 * Threshold-decrypt progress modal.
 *
 * The UI does NOT drive crypto — it only renders the committee's progress
 * as reported by the gateway's session-state endpoint. The threshold MPC
 * runs on the committee operators; we are an observer.
 */

import { colors, layout, text } from "./styles"
import type { DecryptSession, CommitteeMember } from "./types"

interface Props {
  session: DecryptSession | undefined
  onClose: () => void
}

function statusColor(status: CommitteeMember["status"]): string {
  switch (status) {
    case "signed":
      return colors.success
    case "signing":
      return colors.warn
    case "failed":
    case "timeout":
      return colors.danger
    default:
      return colors.textMuted
  }
}

function statusGlyph(status: CommitteeMember["status"]): string {
  switch (status) {
    case "signed":
      return "✓"
    case "signing":
      return "•"
    case "failed":
      return "✗"
    case "timeout":
      return "⏱"
    default:
      return "○"
  }
}

export function RevealCommittee({ session, onClose }: Props) {
  const signed = session?.members.filter((m) => m.status === "signed").length ?? 0
  const threshold = session?.threshold ?? 0
  const total = session?.total ?? 0
  const pct = threshold > 0 ? Math.min(100, (signed / threshold) * 100) : 0

  return (
    <div
      style={layout.modalScrim}
      role="dialog"
      aria-modal="true"
      aria-label="Threshold decryption"
      onClick={onClose}
    >
      <div style={layout.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...layout.row, marginBottom: 12 }}>
          <h2 style={text.h2}>Committee decryption</h2>
          <button style={layout.buttonGhost} onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        {!session ? (
          <p style={text.muted}>Starting session…</p>
        ) : (
          <>
            <p style={text.body}>
              <strong>
                {signed} / {threshold}
              </strong>{" "}
              committee signatures collected ({total} members total).
            </p>
            <div
              style={{
                background: colors.surface2,
                border: `1px solid ${colors.border}`,
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 16,
              }}
              aria-label="signature progress"
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: colors.accent,
                  transition: "width 200ms ease",
                }}
              />
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, ...layout.col }}>
              {session.members.map((m) => (
                <li
                  key={m.pubkeyFingerprint}
                  style={{
                    ...layout.row,
                    background: colors.surface2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span
                      style={{ color: statusColor(m.status), fontSize: 16, width: 16 }}
                      aria-label={m.status}
                    >
                      {statusGlyph(m.status)}
                    </span>
                    <strong style={text.h3}>{m.name}</strong>
                  </div>
                  <span style={{ ...layout.mono, color: colors.textMuted }}>
                    {m.pubkeyFingerprint}
                  </span>
                </li>
              ))}
            </ul>

            {session.error ? (
              <div style={{ ...layout.warn, marginTop: 12, color: colors.danger, borderColor: colors.danger }}>
                {session.error}
              </div>
            ) : null}

            {session.plaintext !== undefined ? (
              <p style={{ ...text.body, marginTop: 16, color: colors.success }}>
                Decryption complete — plaintext available for the next 30 seconds.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

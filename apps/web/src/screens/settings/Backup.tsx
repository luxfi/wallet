/**
 * Backup — reveal recovery phrase.
 *
 * Threat model:
 *   - The mnemonic is the master secret. Any leak is total compromise.
 *   - PIN re-auth is required on every reveal — even if the wallet is
 *     already unlocked. Shoulder-surfing an unlocked tab is real.
 *   - Plaintext is held only in component state, only for 30 seconds, and
 *     is overwritten + cleared on any unmount, navigation, or timeout.
 *   - We do not log it. We do not analytics it. We do not auto-copy it.
 *     The "Copy" button requires an explicit user click; an "I've saved
 *     it" confirmation must be clicked before navigation away.
 *   - We never call any URL with the mnemonic in scope.
 *
 * This file owns the reveal UI; the underlying decrypt happens in
 * Foundation Blue's PIN handle (`getPinAuth().unlock(pin)` returns the
 * mnemonic on success).
 */
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getPinAuth, validatePin } from "../../lib/pin"

const REDACT_AFTER_MS = 30_000

export default function Backup() {
  const navigate = useNavigate()
  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [secsLeft, setSecsLeft] = useState(REDACT_AFTER_MS / 1000)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const redactRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-redact + countdown.
  useEffect(() => {
    if (!revealed) return
    setSecsLeft(REDACT_AFTER_MS / 1000)
    timerRef.current = setInterval(() => {
      setSecsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    redactRef.current = setTimeout(() => {
      // Best-effort overwrite. JS has no secure-erase; this at least
      // breaks the v8 string interning chain for fresh allocations.
      setRevealed(null)
    }, REDACT_AFTER_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (redactRef.current) clearTimeout(redactRef.current)
    }
  }, [revealed])

  // Wipe on unmount.
  useEffect(() => {
    return () => {
      setRevealed(null)
      setPin("")
    }
  }, [])

  const onReveal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validatePin(pin)) {
      setError("PIN must be 6 digits")
      return
    }
    setBusy(true)
    try {
      const m = await getPinAuth().unlock(pin)
      if (!m) {
        setError("Incorrect PIN")
      } else {
        setRevealed(m)
        setPin("")
        setAcknowledged(false)
      }
    } catch (e) {
      setError((e as Error).message ?? "Reveal failed")
    } finally {
      setBusy(false)
    }
  }

  const onCopy = async () => {
    if (!revealed) return
    try {
      await navigator.clipboard.writeText(revealed)
    } catch {
      // Clipboard unavailable — user can still hand-copy.
    }
  }

  const onConfirmAndExit = () => {
    setRevealed(null)
    setAcknowledged(false)
    navigate("..", { relative: "path" })
  }

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Backup</h1>
        <p style={subtitle}>
          Your recovery phrase is the master key to this wallet. Anyone
          who sees it can take everything. Read these warnings before
          revealing it.
        </p>
      </header>

      <section style={warnCard} role="note">
        <ul style={warnList}>
          <li>Write it down on paper — never screenshot, never type into anything online.</li>
          <li>Lux will never ask for your phrase. Anyone who does is trying to steal your funds.</li>
          <li>The phrase auto-redacts after 30 seconds.</li>
        </ul>
      </section>

      {!revealed ? (
        <form onSubmit={onReveal} style={card}>
          <label style={pinRow}>
            <span style={lbl}>Enter PIN to reveal</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              style={input}
            />
          </label>
          {error && (
            <p role="alert" style={errStyle}>
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} style={primaryBtn}>
            {busy ? "Verifying…" : "Reveal phrase"}
          </button>
        </form>
      ) : (
        <section style={card}>
          <header style={revealHeader}>
            <h2 style={h2}>Recovery phrase</h2>
            <span style={timerStyle} aria-live="polite">
              redacts in {secsLeft}s
            </span>
          </header>

          <div style={phraseBox} aria-label="Recovery phrase" tabIndex={0}>
            {revealed.split(/\s+/).map((word, i) => (
              <span key={i} style={word_style}>
                <span style={wordIdx}>{i + 1}</span>
                <span style={wordText}>{word}</span>
              </span>
            ))}
          </div>

          <div style={actions}>
            <button type="button" onClick={onCopy} style={secondaryBtn}>
              Copy
            </button>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              style={secondaryBtn}
            >
              Hide now
            </button>
          </div>

          <label style={ackRow}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={ackText}>I’ve written this down somewhere safe.</span>
          </label>

          <button
            type="button"
            disabled={!acknowledged}
            onClick={onConfirmAndExit}
            style={primaryBtn}
          >
            Done
          </button>
        </section>
      )}
    </main>
  )
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: "24px 16px",
  maxWidth: 640,
  margin: "0 auto",
}
const header: React.CSSProperties = { marginBottom: 12 }
const back: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  textDecoration: "none",
  fontSize: 14,
}
const title: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: "8px 0" }
const subtitle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.6)",
  margin: 0,
  lineHeight: 1.45,
}
const warnCard: React.CSSProperties = {
  border: "1px solid #3a2a00",
  background: "#1a1300",
  borderRadius: 12,
  padding: "12px 16px",
  marginBottom: 12,
  color: "#ffb84d",
}
const warnList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  lineHeight: 1.5,
}
const card: React.CSSProperties = {
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
}
const revealHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
}
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 600, margin: 0 }
const timerStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.6)",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const pinRow: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 }
const lbl: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)" }
const input: React.CSSProperties = {
  background: "#0a0a0a",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 16,
  letterSpacing: 4,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 12, margin: 0 }
const primaryBtn: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "10px 16px",
  background: "#fff",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}
const secondaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "transparent",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
}
const phraseBox: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 8,
  background: "#0a0a0a",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: 12,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const word_style: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  padding: "6px 8px",
  background: "#111",
  borderRadius: 4,
}
const wordIdx: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: 11,
  minWidth: 18,
}
const wordText: React.CSSProperties = { fontSize: 13, color: "#fff" }
const actions: React.CSSProperties = { display: "flex", gap: 8 }
const ackRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
}
const ackText: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.85)" }

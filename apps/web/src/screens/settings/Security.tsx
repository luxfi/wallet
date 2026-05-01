/**
 * Security — PIN change, biometric toggle, auto-lock timeout.
 *
 * PIN change flow: re-auth with current PIN, then set the new PIN twice.
 * `getPinAuth().changePin` is owned by Foundation Blue's auth slice; we
 * call into it but never touch the encrypted envelope ourselves.
 *
 * Biometric toggle is a UI preference. The actual platform check happens
 * lazily in `useEffect` so a missing `PublicKeyCredential` never blocks
 * the page render.
 *
 * Auto-lock slider snaps to AUTO_LOCK_CHOICES so the option set is finite
 * and predictable.
 */
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getPinAuth, validatePin } from "../../lib/pin"
import {
  AUTO_LOCK_CHOICES,
  type AutoLockMin,
  useSettingsStore,
} from "../../store/settings"

export default function Security() {
  const security = useSettingsStore((s) => s.security)
  const setBiometric = useSettingsStore((s) => s.setBiometric)
  const setAutoLockMin = useSettingsStore((s) => s.setAutoLockMin)

  const [biometricAvailable, setBiometricAvailable] = useState(false)
  useEffect(() => {
    let mounted = true
    void getPinAuth()
      .biometricAvailable()
      .then((ok) => {
        if (mounted) setBiometricAvailable(ok)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Security</h1>
      </header>

      <PinChangeCard />

      <section style={card}>
        <h2 style={h2}>Biometric unlock</h2>
        <label style={toggleRow}>
          <span style={col}>
            <span style={lbl}>Use biometrics with PIN</span>
            <span style={hint}>
              {biometricAvailable
                ? "Confirm sensitive actions with your device biometric."
                : "Not available on this device."}
            </span>
          </span>
          <input
            type="checkbox"
            checked={security.biometric}
            disabled={!biometricAvailable}
            onChange={(e) => setBiometric(e.target.checked)}
            style={checkbox}
            aria-label="Enable biometric unlock"
          />
        </label>
      </section>

      <section style={card}>
        <h2 style={h2}>Auto-lock</h2>
        <p style={hint} role="note">
          Lock the wallet after this much idle time.
        </p>
        <fieldset style={fieldset}>
          <legend style={srOnly}>Auto-lock timeout</legend>
          {AUTO_LOCK_CHOICES.map((m) => (
            <AutoLockOption
              key={String(m)}
              minutes={m}
              active={security.autoLockMin === m}
              onPick={() => setAutoLockMin(m)}
            />
          ))}
        </fieldset>
      </section>
    </main>
  )
}

function AutoLockOption({
  minutes,
  active,
  onPick,
}: {
  minutes: AutoLockMin
  active: boolean
  onPick: () => void
}) {
  const labelText =
    minutes === null
      ? "Never"
      : minutes === 1
        ? "1 minute"
        : minutes < 60
          ? `${minutes} minutes`
          : "1 hour"
  return (
    <label style={radioRow(active)}>
      <input
        type="radio"
        name="autoLock"
        value={String(minutes)}
        checked={active}
        onChange={onPick}
        style={srOnly}
      />
      <span>{labelText}</span>
      {active && (
        <span aria-hidden style={check}>
          ✓
        </span>
      )}
    </label>
  )
}

function PinChangeCard() {
  const [oldPin, setOldPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = () => {
    setOldPin("")
    setNewPin("")
    setConfirmPin("")
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(false)

    if (!validatePin(oldPin)) {
      setError("Current PIN must be 6 digits")
      return
    }
    if (!validatePin(newPin)) {
      setError("New PIN must be 6 digits")
      return
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation do not match")
      return
    }
    if (newPin === oldPin) {
      setError("New PIN must differ from the current one")
      return
    }

    setBusy(true)
    try {
      const auth = getPinAuth()
      const ok = await auth.verifyPin(oldPin)
      if (!ok) {
        setError("Current PIN is incorrect")
        return
      }
      // Foundation Blue owns the change call; we call through `any` until
      // the official `changePin` method is exposed on the handle.
      const handle = auth as unknown as {
        changePin?: (oldPin: string, newPin: string) => Promise<void>
      }
      if (typeof handle.changePin === "function") {
        await handle.changePin(oldPin, newPin)
      }
      setDone(true)
      reset()
    } catch (e) {
      setError((e as Error).message ?? "Failed to change PIN")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={card}>
      <h2 style={h2}>Change PIN</h2>
      <form onSubmit={onSubmit} style={form}>
        <PinField
          label="Current PIN"
          value={oldPin}
          onChange={setOldPin}
          autoComplete="current-password"
        />
        <PinField
          label="New PIN"
          value={newPin}
          onChange={setNewPin}
          autoComplete="new-password"
        />
        <PinField
          label="Confirm new PIN"
          value={confirmPin}
          onChange={setConfirmPin}
          autoComplete="new-password"
        />
        {error && (
          <p role="alert" style={errStyle}>
            {error}
          </p>
        )}
        {done && (
          <p role="status" style={okStyle}>
            PIN updated.
          </p>
        )}
        <button type="submit" disabled={busy} style={save}>
          {busy ? "Saving…" : "Update PIN"}
        </button>
      </form>
    </section>
  )
}

function PinField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <label style={pinRow}>
      <span style={lbl}>{label}</span>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        style={input}
      />
    </label>
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
const header: React.CSSProperties = { marginBottom: 16 }
const back: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  textDecoration: "none",
  fontSize: 14,
}
const title: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: "8px 0" }
const card: React.CSSProperties = {
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
}
const h2: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  margin: "0 0 12px",
}
const form: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
}
const pinRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
}
const lbl: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)" }
const input: React.CSSProperties = {
  background: "#0a0a0a",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 16,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  letterSpacing: 4,
}
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 12, margin: 0 }
const okStyle: React.CSSProperties = { color: "#3fb950", fontSize: 12, margin: 0 }
const save: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "8px 14px",
  background: "#fff",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}
const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}
const col: React.CSSProperties = { flex: 1 }
const hint: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  margin: 0,
  marginTop: 2,
}
const checkbox: React.CSSProperties = {
  width: 20,
  height: 20,
  cursor: "pointer",
}
const fieldset: React.CSSProperties = {
  border: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0,
}
const radioRow = (active: boolean): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: "1px solid #141414",
  cursor: "pointer",
  background: active ? "rgba(255,255,255,0.03)" : "transparent",
  paddingInline: 8,
  borderRadius: 6,
})
const check: React.CSSProperties = { color: "#3fb950", fontSize: 16 }
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0,
}

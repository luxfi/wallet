/**
 * ConfirmSend — re-authenticate + sign step.
 *
 *   1. Show summary (from / to / amount / memo / fee).
 *   2. Re-auth via Foundation Blue's `getPinAuth().verifyPin()` (or
 *      biometric path if available).
 *   3. Once verified, call useSend().submit() which broadcasts and routes
 *      forward to /send/result/:hash.
 *
 * Re-auth is required even when the wallet is already unlocked. Send is a
 * high-trust action; we want a fresh auth check at the moment of broadcast.
 * A shoulder-surfer with an unlocked tab cannot push a tx.
 */
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import FeePreview from "./FeePreview"
import { useSend } from "./useSend"
import { useSendStore } from "../../store/send"
import { getPinAuth, validatePin } from "../../lib/pin"
import { CHAINS } from "../../lib/asset"

export default function ConfirmSend() {
  const navigate = useNavigate()
  const { asset, to, amount, memo, txHash, status, error } = useSendStore()
  const { submit, cancel } = useSend()

  const [pin, setPin] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getPinAuth()
      .biometricAvailable()
      .then((ok: boolean) => {
        if (!cancelled) setBiometricAvailable(ok)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // user navigated here directly without an asset — bounce back to /send.
  useEffect(() => {
    if (!asset) navigate("/send", { replace: true })
  }, [asset, navigate])

  // route forward once broadcast hands us a hash.
  useEffect(() => {
    if (status === "done" && txHash) {
      navigate(`/send/result/${txHash}`)
    }
  }, [status, txHash, navigate])

  if (!asset) return null

  const chain = CHAINS[asset.chainId]

  const onConfirm = async () => {
    setAuthError(null)
    const validation = validatePin(pin)
    if (validation) {
      setAuthError(validation)
      return
    }
    setAuthPending(true)
    try {
      const ok = await getPinAuth().verifyPin(pin)
      if (!ok) {
        setAuthError("Incorrect PIN")
        setAuthPending(false)
        return
      }
    } catch (e) {
      setAuthError((e as Error).message ?? "Re-authentication failed")
      setAuthPending(false)
      return
    }
    setAuthPending(false)
    await submit()
    // After submit completes, status is "done" or "error".
    // The useEffect above routes to /send/result/:hash on done.
    // On error we render the error inline below.
  }

  const onBack = () => {
    cancel()
    navigate("/send")
  }

  const broadcasting = status === "broadcasting"

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
        Confirm send
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.75rem",
          background: "var(--color2, #111)",
          borderRadius: "0.5rem",
        }}
      >
        <Row
          label="From"
          value={`${asset.symbol} on ${chain?.label ?? asset.chainId}`}
        />
        <Row label="To" value={to} mono />
        <Row label="Amount" value={`${amount} ${asset.symbol}`} mono />
        {memo ? <Row label="Memo" value={memo} /> : null}
        <FeePreview asset={asset} to={to} amount={amount} />
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
      >
        <label
          htmlFor="confirm-pin"
          style={{ color: "var(--color10, #888)", fontSize: "0.875rem" }}
        >
          Re-authenticate to send {biometricAvailable ? "(or use biometric)" : ""}
        </label>
        <input
          id="confirm-pin"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={authError !== null}
          style={input}
        />
        {authError ? (
          <p
            style={{
              color: "var(--red10, #c44)",
              fontSize: "0.75rem",
              margin: 0,
            }}
          >
            {authError}
          </p>
        ) : null}
      </div>

      {error && status === "error" ? (
        <p
          style={{
            color: "var(--red10, #c44)",
            fontSize: "0.875rem",
            margin: 0,
          }}
        >
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={onBack}
          disabled={broadcasting}
          style={{ ...btnSecondary, flex: 1 }}
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={broadcasting || authPending}
          style={{
            ...(broadcasting || authPending ? btnDisabled : btnPrimary),
            flex: 1,
          }}
        >
          {broadcasting
            ? "Broadcasting…"
            : authPending
            ? "Authenticating…"
            : "Confirm"}
        </button>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "0.5rem",
      }}
    >
      <span style={{ color: "var(--color10, #888)" }}>{label}</span>
      <span
        style={{
          textAlign: "right",
          flex: 1,
          wordBreak: "break-all",
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, monospace"
            : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

const input: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color6, #333)",
  background: "var(--color2, #111)",
  color: "var(--color12, #fff)",
  fontSize: "1rem",
  fontFamily: "inherit",
  width: "100%",
}

const btnPrimary: React.CSSProperties = {
  padding: "0.875rem 1rem",
  borderRadius: "0.5rem",
  border: "none",
  background: "var(--color12, #fff)",
  color: "var(--color1, #000)",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  padding: "0.875rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color6, #333)",
  background: "transparent",
  color: "var(--color12, #fff)",
  fontSize: "1rem",
  cursor: "pointer",
}

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: "var(--color6, #333)",
  color: "var(--color9, #666)",
  cursor: "not-allowed",
}

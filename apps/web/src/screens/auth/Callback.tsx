/**
 * OIDC callback — the redirect target for lux.id (`/auth/callback`).
 *
 * Validates `state`, exchanges the authorization code for tokens (via
 * `useSession.completeCallback` → `lib/iam.completeLogin`), then navigates to
 * the portfolio. On failure it shows the error and a link back to start over.
 *
 * Renders bare (no AppShell) — it runs before the app is "logged in".
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useBrand } from "../../hooks/useBrand"
import { useSession } from "../../store/session"

export default function Callback(): React.JSX.Element {
  const brand = useBrand()
  const navigate = useNavigate()
  const completeCallback = useSession((s) => s.completeCallback)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    completeCallback(window.location.search)
      .then(() => {
        if (!cancelled) navigate("/portfolio", { replace: true })
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [completeCallback, navigate])

  return (
    <div style={wrap}>
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" width={40} height={40} aria-hidden="true" style={{ marginBottom: 16 }} />
      ) : null}
      {error ? (
        <>
          <h1 style={title}>Sign-in failed</h1>
          <p style={msg}>{error}</p>
          <a href="/" style={link}>
            Back to {brand.walletName || "wallet"}
          </a>
        </>
      ) : (
        <>
          <h1 style={title}>Signing you in…</h1>
          <p style={msg}>Completing {brand.name || "lux.id"} authentication.</p>
        </>
      )}
    </div>
  )
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--surface1, #000)",
  color: "var(--neutral1, #fff)",
  padding: 24,
  textAlign: "center",
}
const title: React.CSSProperties = { fontSize: 20, fontWeight: 600, margin: "0 0 8px" }
const msg: React.CSSProperties = { fontSize: 14, color: "var(--neutral2, #888)", margin: "0 0 16px" }
const link: React.CSSProperties = { color: "var(--accent1, #fff)", fontSize: 14 }

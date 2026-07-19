/**
 * First-launch splash. Two paths: create new wallet, or import existing.
 * Foundation router mounts this at /auth.
 *
 * Styled with plain inline styles + brand CSS vars (the same pattern as
 * AppShell / Callback / Download) rather than @hanzo/gui primitives: the
 * gui-stub's Tamagui token props do not carry a working flex/centering
 * contract, which left the card top-anchored and the CTAs gap-less. This
 * screen owns its layout so it renders correctly on every brand + breakpoint.
 */
import { useNavigate } from "react-router-dom"
import { brand, getIamConfig } from "@luxfi/wallet-brand"
import { useSession } from "../../store/session"

const wrap: React.CSSProperties = {
  // Fill the AppShell content row (viewport minus header + main padding) and
  // center the card so there is no empty void beneath it on desktop.
  minHeight: "calc(100vh - 140px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
  padding: 16,
  boxSizing: "border-box",
}

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 24,
  borderRadius: 14,
  background: "var(--surface2, #f9f9f9)",
  border: "1px solid var(--surface3, #e5e5e5)",
  boxSizing: "border-box",
}

const buttonBase: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "12px 16px",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
}

const primaryButton: React.CSSProperties = {
  ...buttonBase,
  background: "var(--accent1, #000)",
  color: "var(--surface1, #fff)",
  border: "1px solid var(--accent1, #000)",
}

const outlinedButton: React.CSSProperties = {
  ...buttonBase,
  background: "transparent",
  color: "var(--neutral1, #111)",
  border: "1px solid var(--surface3, #d4d4d4)",
}

export default function Welcome() {
  const navigate = useNavigate()
  const login = useSession((s) => s.login)
  const status = useSession((s) => s.status)
  // Account login is additive — only offered when the brand has an IdP wired.
  const { issuer, clientId } = getIamConfig()
  const accountLoginEnabled = Boolean(issuer && clientId)
  const idpName = brand.shortName || brand.name || "Lux"

  return (
    <div style={wrap}>
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" width={56} height={56} aria-hidden="true" />
      ) : null}
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--neutral1, #111)" }}>
        {brand.walletName || "Wallet"}
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: 340,
          textAlign: "center",
          fontSize: 15,
          lineHeight: 1.5,
          color: "var(--neutral2, #666)",
        }}
      >
        {brand.description || "Self-custodial wallet for the Lux ecosystem."}
      </p>

      <div style={card}>
        <button type="button" style={primaryButton} onClick={() => navigate("/auth/create")}>
          Create new wallet
        </button>
        <button type="button" style={outlinedButton} onClick={() => navigate("/auth/import")}>
          Import existing
        </button>
        {accountLoginEnabled ? (
          <button
            type="button"
            style={{ ...outlinedButton, opacity: status === "loading" ? 0.6 : 1 }}
            disabled={status === "loading"}
            // Self-custody keys stay local; this adds a cloud account (lux.id)
            // for sync + MPC custody. Navigates to the IdP.
            onClick={() => {
              void login()
            }}
          >
            {status === "loading" ? "Connecting…" : `Sign in with ${idpName}`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

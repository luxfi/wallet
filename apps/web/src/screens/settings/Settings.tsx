/**
 * Settings — top-level menu.
 *
 * Hub for the settings sub-router. Keep this list short; deeper config
 * belongs on the per-section screens. Each row is a real link, not a
 * button, so middle-click / cmd-click open in a new tab as expected.
 */
import { Link } from "react-router-dom"

interface MenuItem {
  to: string
  label: string
  hint: string
}

const ITEMS: MenuItem[] = [
  { to: "networks", label: "Networks", hint: "Custom RPC endpoints" },
  { to: "security", label: "Security", hint: "PIN, biometrics, auto-lock" },
  { to: "backup", label: "Backup", hint: "Reveal recovery phrase" },
  { to: "language", label: "Language", hint: "App language" },
  { to: "theme", label: "Theme", hint: "Dark, light, or system" },
  { to: "currency", label: "Currency", hint: "Display fiat" },
  { to: "about", label: "About", hint: "Version, license, support" },
]

export default function Settings() {
  return (
    <main style={page}>
      <header style={header}>
        <h1 style={title}>Settings</h1>
      </header>
      <ul style={list}>
        {ITEMS.map((it) => (
          <li key={it.to} style={li}>
            <Link to={it.to} style={row}>
              <span style={col}>
                <span style={label}>{it.label}</span>
                <span style={hint}>{it.hint}</span>
              </span>
              <span aria-hidden style={chev}>
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
const header: React.CSSProperties = { marginBottom: 16 }
const title: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: "8px 0" }
const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  overflow: "hidden",
}
const li: React.CSSProperties = { borderBottom: "1px solid #1a1a1a" }
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  textDecoration: "none",
  color: "#fff",
}
const col: React.CSSProperties = { flex: 1 }
const label: React.CSSProperties = { display: "block", fontWeight: 500, fontSize: 14 }
const hint: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  marginTop: 2,
}
const chev: React.CSSProperties = {
  color: "rgba(255,255,255,0.4)",
  fontSize: 18,
}

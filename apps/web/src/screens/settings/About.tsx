/**
 * About — version, upstream commit, license, legal links.
 *
 * Renders synchronously (with `unknown` placeholders) and patches in the
 * upstream sha once `loadUpstreamSha()` resolves. License is GPL-3.0-or-later
 * — link to the canonical FSF page rather than bundling the full text.
 */
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getBrand } from "../../lib/brand"
import { VERSION, loadUpstreamSha, shortSha } from "../../lib/version"

export default function About() {
  const brand = getBrand().brand
  const [sha, setSha] = useState<string>("loading")

  useEffect(() => {
    let mounted = true
    loadUpstreamSha().then((s) => {
      if (mounted) setSha(s)
    })
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
        <h1 style={title}>About</h1>
      </header>

      <section style={card}>
        <Row label="App" value={brand.walletName} />
        <Row label="Version" value={VERSION} mono />
        <Row label="Source" value={shortSha(sha)} mono />
        <Row label="Domain" value={brand.appDomain} />
      </section>

      <section style={card}>
        <h2 style={h2}>Legal</h2>
        <Anchor href="https://www.gnu.org/licenses/gpl-3.0.html" label="License: GPL-3.0-or-later" />
        <Anchor href={brand.privacyUrl} label="Privacy Policy" />
        <Anchor href={brand.termsUrl} label="Terms of Service" />
      </section>

      <section style={card}>
        <h2 style={h2}>Support</h2>
        <Anchor href={brand.helpUrl} label="Documentation" />
        <Anchor href={`mailto:${brand.supportEmail}`} label={brand.supportEmail} />
        <Anchor href={brand.github} label="Source on GitHub" />
      </section>
    </main>
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
    <div style={row}>
      <span style={rowLabel}>{label}</span>
      <span style={mono ? valueMono : rowValue}>{value}</span>
    </div>
  )
}

function Anchor({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" style={anchor}>
      {label}
      <span aria-hidden style={anchorChev}>
        ↗
      </span>
    </a>
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
  padding: 4,
  marginBottom: 12,
}
const h2: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "rgba(255,255,255,0.5)",
  margin: "8px 12px 4px",
}
const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "1px solid #141414",
}
const rowLabel: React.CSSProperties = { color: "rgba(255,255,255,0.6)", fontSize: 13 }
const rowValue: React.CSSProperties = { fontSize: 13 }
const valueMono: React.CSSProperties = {
  fontSize: 13,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const anchor: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: "1px solid #141414",
  color: "#fff",
  textDecoration: "none",
  fontSize: 14,
}
const anchorChev: React.CSSProperties = { color: "rgba(255,255,255,0.4)", fontSize: 12 }

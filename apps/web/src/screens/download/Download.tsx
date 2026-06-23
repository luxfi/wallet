/**
 * Download screen — the per-brand native-download HOST surface served at
 * `wallet.<brand>/download`.
 *
 * Renders the brand's logo + name and a grid of every native target:
 *   macOS · Windows · Linux · iOS · Android · Browser extension.
 *
 * The binary URLs + versions come from `brand.downloads` (filled per brand in
 * `brand.json`, published by the native CI). Direct binaries use `url`; store
 * distributions (iOS/Android/extension) use `storeUrl`. Each card surfaces the
 * version and a "Verify signature" link to the published checksums when a
 * `checksumUrl` is present. A platform with no link degrades to "Coming soon".
 *
 * All brand strings come from the `brand` singleton (never hardcoded).
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import type { BrandDownload, BrandDownloads } from "@luxfi/wallet-brand"
import { useBrand } from "../../hooks/useBrand"

interface PlatformDef {
  key: keyof BrandDownloads
  label: string
  /** What the primary button installs/opens. */
  action: string
  /** Hint shown under the title when no link exists. */
  format: string
}

// Display order + per-platform metadata. The `action` label distinguishes a
// direct download from a store visit.
const PLATFORMS: PlatformDef[] = [
  { key: "mac", label: "macOS", action: "Download .dmg", format: "Apple silicon + Intel" },
  { key: "windows", label: "Windows", action: "Download installer", format: ".exe / .msi" },
  { key: "linux", label: "Linux", action: "Download", format: ".AppImage / .deb" },
  { key: "ios", label: "iOS", action: "App Store", format: "iPhone + iPad" },
  { key: "android", label: "Android", action: "Get it on Google Play", format: ".apk / Play" },
  { key: "extension", label: "Browser extension", action: "Add to browser", format: "Chrome · Firefox · Safari" },
]

export default function Download(): React.JSX.Element {
  const brand = useBrand()
  const downloads = brand.downloads ?? {}
  const name = brand.walletName || brand.name || "Wallet"

  return (
    <div style={wrap}>
      <header style={head}>
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="" width={48} height={48} aria-hidden="true" />
        ) : null}
        <div>
          <h1 style={title}>Download {name}</h1>
          <p style={subtitle}>
            Self-custodial {brand.name || ""} wallet for every platform. Verify each
            build's signature before installing.
          </p>
        </div>
      </header>

      <ul style={grid}>
        {PLATFORMS.map((p) => (
          <PlatformCard key={p.key} def={p} dl={downloads[p.key]} />
        ))}
      </ul>

      <footer style={foot}>
        Trouble installing? See{" "}
        <a href={brand.helpUrl || "#"} style={link} target="_blank" rel="noreferrer">
          {brand.docsDomain || "docs"}
        </a>
        .
      </footer>
    </div>
  )
}

function PlatformCard({ def, dl }: { def: PlatformDef; dl?: BrandDownload }): React.JSX.Element {
  // Direct binary first (mac/win/linux), then store link (ios/android/ext).
  const href = dl?.url ?? dl?.storeUrl
  const available = Boolean(href)

  return (
    <li style={card}>
      <div style={cardTop}>
        <span style={platLabel}>{def.label}</span>
        {dl?.version ? <span style={ver}>v{dl.version}</span> : null}
      </div>
      <span style={fmt}>{def.format}</span>

      {available ? (
        <a style={dlBtn} href={href} target="_blank" rel="noreferrer">
          {def.action}
        </a>
      ) : (
        <span style={soon} aria-disabled="true">
          Coming soon
        </span>
      )}

      {dl?.checksumUrl ? (
        <a style={verify} href={dl.checksumUrl} target="_blank" rel="noreferrer">
          Verify signature
        </a>
      ) : null}
    </li>
  )
}

const wrap: React.CSSProperties = { maxWidth: 920, margin: "0 auto", display: "grid", gap: 24 }
const head: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center" }
const title: React.CSSProperties = { fontSize: 24, fontWeight: 700, margin: 0 }
const subtitle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--neutral2, #888)",
  margin: "6px 0 0",
  maxWidth: 560,
}
const grid: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
}
const card: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 16,
  border: "1px solid var(--surface3, #222)",
  borderRadius: 12,
  background: "var(--surface2, #0c0c0c)",
}
const cardTop: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline" }
const platLabel: React.CSSProperties = { fontSize: 16, fontWeight: 600 }
const ver: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral2, #888)",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const fmt: React.CSSProperties = { fontSize: 12, color: "var(--neutral2, #888)" }
const dlBtn: React.CSSProperties = {
  display: "inline-block",
  textAlign: "center",
  marginTop: 4,
  padding: "10px 14px",
  background: "var(--accent1, #fff)",
  color: "var(--surface1, #000)",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
}
const soon: React.CSSProperties = {
  display: "inline-block",
  textAlign: "center",
  marginTop: 4,
  padding: "10px 14px",
  background: "transparent",
  color: "var(--neutral2, #666)",
  border: "1px solid var(--surface3, #222)",
  borderRadius: 8,
  fontSize: 14,
}
const verify: React.CSSProperties = { fontSize: 12, color: "var(--neutral2, #888)", textDecoration: "underline" }
const foot: React.CSSProperties = { fontSize: 13, color: "var(--neutral2, #888)" }
const link: React.CSSProperties = { color: "var(--accent1, #fff)" }

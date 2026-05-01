/**
 * Networks — list `brand.supportedChainIds`, allow per-chain RPC override.
 *
 * RPC override flows user funds, so we enforce HTTPS and never persist an
 * empty string. Empty input clears the override (falls back to
 * `getBootnodeRpcUrl(chainId)`).
 *
 * The list is sourced from `brand.supportedChainIds` so white-label
 * deployments narrow the surface automatically — Liquidity won't show
 * Lux mainnet, Lux won't show Liquidity, etc.
 */
import { useState } from "react"
import { Link } from "react-router-dom"
import { brand, chainLabel } from "../../lib/brand"
import { useSettingsStore, validateRpcUrl } from "../../store/settings"
import { getBootnodeRpcUrl } from "@luxfi/wallet-brand"

export default function Networks() {
  const networks = useSettingsStore((s) => s.networks)
  const setNetworkRpc = useSettingsStore((s) => s.setNetworkRpc)

  const ids = brand.supportedChainIds.length
    ? brand.supportedChainIds
    : [brand.defaultChainId]

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Networks</h1>
        <p style={subtitle}>
          Override the default RPC endpoint for each network. Leave blank
          to use the brand gateway.
        </p>
      </header>
      <ul style={list}>
        {ids.map((id) => {
          const override = networks[id]?.rpcOverride
          const fallback = getBootnodeRpcUrl(id) ?? "(no default)"
          return (
            <NetworkRow
              key={id}
              chainId={id}
              label={chainLabel(id)}
              fallback={fallback}
              override={override}
              onSave={(url) => setNetworkRpc(id, url)}
            />
          )
        })}
      </ul>
    </main>
  )
}

interface NetworkRowProps {
  chainId: number
  label: string
  fallback: string
  override?: string
  onSave: (url: string | undefined) => void
}

function NetworkRow({ chainId, label, fallback, override, onSave }: NetworkRowProps) {
  const [draft, setDraft] = useState(override ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const onChange = (v: string) => {
    setDraft(v)
    setSaved(false)
    setError(validateRpcUrl(v))
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateRpcUrl(draft)
    if (err) {
      setError(err)
      return
    }
    onSave(draft.trim() || undefined)
    setSaved(true)
  }

  return (
    <li style={li}>
      <form onSubmit={onSubmit} style={row}>
        <div style={col}>
          <span style={lbl}>{label}</span>
          <span style={hint}>
            id {chainId} · default {fallback}
          </span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://my-rpc.example.com"
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            style={input}
            aria-invalid={!!error}
            aria-label={`RPC URL for ${label}`}
          />
          {error && <span style={errStyle}>{error}</span>}
          {saved && !error && <span style={savedStyle}>Saved.</span>}
        </div>
        <button
          type="submit"
          style={save}
          disabled={!!error}
          aria-label={`Save RPC for ${label}`}
        >
          Save
        </button>
      </form>
    </li>
  )
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: "24px 16px",
  maxWidth: 720,
  margin: "0 auto",
}
const header: React.CSSProperties = { marginBottom: 16 }
const back: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  textDecoration: "none",
  fontSize: 14,
}
const title: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: "8px 0" }
const subtitle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.5)",
  margin: 0,
}
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
  alignItems: "flex-end",
  gap: 12,
  padding: "14px 16px",
}
const col: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", gap: 4 }
const lbl: React.CSSProperties = { fontWeight: 500, fontSize: 14 }
const hint: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
}
const input: React.CSSProperties = {
  marginTop: 6,
  background: "#0a0a0a",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 12 }
const savedStyle: React.CSSProperties = { color: "#3fb950", fontSize: 12 }
const save: React.CSSProperties = {
  alignSelf: "flex-start",
  marginTop: 22,
  padding: "8px 14px",
  background: "#fff",
  color: "#000",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

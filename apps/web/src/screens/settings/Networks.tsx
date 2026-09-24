/**
 * Networks — the chains this wallet reaches: the same measured list the chain
 * switcher, portfolio, receive and bridge read (`useMeasuredNetworks`). Each
 * shows the RPC and explorer it uses and, when it is not producing blocks,
 * that it is unavailable and why. A chain whose RPC does not answer is not
 * listed here either.
 */
import { Link } from "react-router-dom"
import { getBootnodeRpcUrl, getExplorerUrl } from "@luxfi/wallet-brand"
import { useMeasuredNetworks } from "../../hooks/useNetworks"

export default function Networks() {
  const { list, settled } = useMeasuredNetworks()

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Networks</h1>
        <p style={subtitle}>
          The chains this wallet reaches. A chain is listed once its RPC answers.
        </p>
      </header>
      <ul style={rows}>
        {list.map((n) => (
          <li key={n.id} style={li}>
            <div style={col}>
              <span style={lbl}>{n.label}</span>
              {n.unavailable && <span style={errStyle}>Unavailable. {n.unavailable}</span>}
              <span style={hint}>
                id {n.id} · {getBootnodeRpcUrl(n.id)}
              </span>
              {getExplorerUrl(n.id) && <span style={hint}>explorer {getExplorerUrl(n.id)}</span>}
            </div>
          </li>
        ))}
        {!settled && (
          <li style={li} role="status">
            <span style={hint}>Asking the remaining chains…</span>
          </li>
        )}
      </ul>
    </main>
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
const rows: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  overflow: "hidden",
}
const li: React.CSSProperties = { borderBottom: "1px solid #1a1a1a", padding: "14px 16px" }
const col: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", gap: 4 }
const lbl: React.CSSProperties = { fontWeight: 500, fontSize: 14 }
const hint: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  overflowWrap: "anywhere",
}
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 12 }

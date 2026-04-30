/**
 * DApps — landing screen.
 *
 * Top: trusted dApps grid (curated list — opens externally).
 * Bottom: connect new dApp CTA + summary of active sessions.
 *
 * External links use rel="noopener noreferrer" target="_blank" — defends
 * against window.opener tab-nabbing and reverse-tabnabbing attacks.
 */

import { Link } from "react-router-dom"
import { useDAppsStore } from "../../store/dapps"
import { useTrustedDApps } from "./useTrustedDApps"
import { useWalletConnect } from "./useWalletConnect"

const CATEGORY_LABEL: Record<string, string> = {
  dex: "DEX",
  exchange: "Exchange",
  lending: "Lending",
  nft: "NFT",
  bridge: "Bridge",
  other: "Other",
}

export function DApps() {
  // Initialise WalletConnect on landing so existing sessions hydrate.
  useWalletConnect()
  const { dapps, loading, error } = useTrustedDApps()
  const sessions = useDAppsStore((s) => s.sessions)

  return (
    <section style={{ padding: "1rem", display: "grid", gap: "1.25rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>dApps</h1>
        <p style={{ margin: "0.25rem 0", opacity: 0.7 }}>
          Connect to decentralised apps via WalletConnect.
        </p>
      </header>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link to="/dapps/connect">
          <button type="button" style={{ padding: "0.5rem 1rem" }}>
            Connect new dApp
          </button>
        </Link>
        <Link to="/dapps/sessions">
          <button type="button" style={{ padding: "0.5rem 1rem" }}>
            Active sessions ({sessions.length})
          </button>
        </Link>
      </div>

      <section aria-labelledby="trusted-dapps">
        <h2 id="trusted-dapps" style={{ margin: 0 }}>
          Trusted dApps
        </h2>
        {error ? (
          <div role="alert" style={{ color: "#c00" }}>
            {error}
          </div>
        ) : null}
        {loading ? (
          <p style={{ opacity: 0.7 }}>Loading trusted dApps…</p>
        ) : null}
        <ul
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            padding: 0,
            margin: 0,
          }}
        >
          {dapps.map((d) => (
            <li
              key={d.url}
              style={{
                listStyle: "none",
                padding: "0.75rem",
                border: "1px solid rgba(127,127,127,0.2)",
                borderRadius: 12,
                display: "grid",
                gap: "0.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{d.name}</strong>
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  {CATEGORY_LABEL[d.category] ?? d.category}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
                {d.description}
              </p>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12 }}
              >
                Open ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

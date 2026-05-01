/**
 * Currency picker — display fiat for price quotes.
 *
 * Source of prices: `https://${brand.gatewayDomain}/v1/prices?symbols=…&vs={currency}`.
 * This screen only writes the user's choice; the gateway converts on the
 * server side. We never rate-convert client-side from USD: that would
 * compound rounding error and expose us to stale FX.
 */
import { Link } from "react-router-dom"
import {
  CURRENCY_CHOICES,
  type Currency,
  useSettingsStore,
} from "../../store/settings"

const META: Record<Currency, { native: string; label: string; symbol: string }> = {
  USD: { native: "US Dollar", label: "USD", symbol: "$" },
  EUR: { native: "Euro", label: "EUR", symbol: "€" },
  JPY: { native: "Japanese Yen", label: "JPY", symbol: "¥" },
  GBP: { native: "British Pound", label: "GBP", symbol: "£" },
  CHF: { native: "Swiss Franc", label: "CHF", symbol: "Fr" },
  CAD: { native: "Canadian Dollar", label: "CAD", symbol: "$" },
}

export default function CurrencyScreen() {
  const currency = useSettingsStore((s) => s.currency)
  const setCurrency = useSettingsStore((s) => s.setCurrency)

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Currency</h1>
      </header>
      <ul style={list}>
        {CURRENCY_CHOICES.map((c) => {
          const m = META[c]
          const active = currency === c
          return (
            <li key={c} style={li}>
              <button
                type="button"
                style={row(active)}
                onClick={() => setCurrency(c)}
                aria-pressed={active}
              >
                <span style={sym}>{m.symbol}</span>
                <span style={col}>
                  <span style={label}>{m.label}</span>
                  <span style={hint}>{m.native}</span>
                </span>
                {active && (
                  <span aria-hidden style={check}>
                    ✓
                  </span>
                )}
              </button>
            </li>
          )
        })}
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
const back: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  textDecoration: "none",
  fontSize: 14,
}
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
const row = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "14px 16px",
  background: active ? "#0e0e0e" : "transparent",
  border: "none",
  color: "#fff",
  textAlign: "left",
  cursor: "pointer",
})
const sym: React.CSSProperties = {
  width: 28,
  textAlign: "center",
  fontSize: 18,
  color: "rgba(255,255,255,0.7)",
}
const col: React.CSSProperties = { flex: 1 }
const label: React.CSSProperties = { display: "block", fontWeight: 500, fontSize: 14 }
const hint: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  marginTop: 2,
}
const check: React.CSSProperties = { color: "#3fb950", fontSize: 16 }

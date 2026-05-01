/**
 * QuoteRoute — renders the route preview for a swap quote.
 *
 * Naming convention is LOCKED:
 *   amm-v2 → "AMM v2"
 *   amm-v3 → "AMM v3"
 *   dex-v4 → "DEX v4"
 *
 * Shows path (token symbol chain), pool fee tier, and price impact. Color
 * coding on price impact follows the canonical Uniswap thresholds (per
 * SCREENS.md §3):
 *   < 1%   → muted
 *   1–3%   → yellow ("Price impact warning")
 *   > 3%   → red    ("High price impact")
 */
import type { RouteKind, SwapQuote } from "../../store/swap"

interface Props {
  quote: SwapQuote | null
}

const KIND_LABEL: Record<RouteKind, string> = {
  "amm-v2": "AMM v2",
  "amm-v3": "AMM v3",
  "dex-v4": "DEX v4",
}

export function QuoteRoute({ quote }: Props) {
  if (!quote) {
    return (
      <div
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: 8,
          padding: 12,
          fontSize: 12,
          color: "#888",
        }}
      >
        Enter an amount to preview the route.
      </div>
    )
  }

  const impactPct = quote.priceImpactBps / 100
  const impactColor =
    quote.priceImpactBps === 0
      ? "#666"
      : quote.priceImpactBps < 100
        ? "#bbb"
        : quote.priceImpactBps < 300
          ? "#fbbf24"
          : "#ef4444"
  const impactLabel =
    quote.priceImpactBps === 0
      ? "—"
      : `${impactPct.toFixed(impactPct < 1 ? 3 : 2)}%`

  const feeLabel = quote.feeBps > 0 ? `${(quote.feeBps / 100).toFixed(2)}%` : "—"

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>Route</span>
        <span
          aria-label={`Route kind ${KIND_LABEL[quote.kind]}`}
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 999,
            padding: "1px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {KIND_LABEL[quote.kind]}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>Path</span>
        <span style={{ fontFamily: "monospace" }}>{quote.path.join(" → ")}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>Fee tier</span>
        <span>{feeLabel}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>Price impact</span>
        <span style={{ color: impactColor }}>{impactLabel}</span>
      </div>
    </div>
  )
}

export default QuoteRoute

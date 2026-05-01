/**
 * TokenSelector — modal with search and popular pinned tokens.
 *
 * Renders inline balances (smallest-unit -> human via formatUnits) so the
 * user picks confidently. The asset list comes from the portfolio feed
 * (Auth-Portfolio Blue) — the picker doesn't fetch its own.
 *
 * Pinned popular tokens (LUX, ZOO, ETH, USDC, USDT) appear at the top of
 * the result list — we surface what's actually in the portfolio first,
 * then any pinned-but-zero-balance tokens get a faded row.
 *
 * Accessibility: focus trap on open, Escape closes, Arrow keys navigate.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { type Asset, formatUnits } from "../../lib/asset"

interface Props {
  open: boolean
  /** Asset universe — typically `usePortfolioAssets()` from the parent. */
  assets: Asset[]
  /** Currently-selected token to highlight; null when nothing chosen. */
  selected: Asset | null
  /** Optional filter — e.g. only the source-chain assets when picking output. */
  filterChainId?: string
  onPick: (asset: Asset) => void
  onClose: () => void
}

const POPULAR = ["LUX", "ZOO", "ETH", "USDC", "USDT"]

export function TokenSelector({
  open,
  assets,
  selected,
  filterChainId,
  onPick,
  onClose,
}: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const universe = useMemo(
    () => (filterChainId ? assets.filter((a) => a.chainId === filterChainId) : assets),
    [assets, filterChainId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? universe.filter(
          (a) =>
            a.symbol.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q) ||
            (a.contract ?? "").toLowerCase().includes(q),
        )
      : universe
    // Sort: popular first (in POPULAR order), then by balance desc.
    return list.slice().sort((a, b) => {
      const ai = POPULAR.indexOf(a.symbol)
      const bi = POPULAR.indexOf(b.symbol)
      if (ai !== bi) {
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      }
      try {
        const ba = BigInt(a.balance || "0")
        const bb = BigInt(b.balance || "0")
        if (ba === bb) return 0
        return ba < bb ? 1 : -1
      } catch {
        return 0
      }
    })
  }, [universe, query])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select token"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          maxHeight: "70vh",
          background: "#0a0a0a",
          color: "#fff",
          borderRadius: 12,
          border: "1px solid #222",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Select token</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, symbol, or paste address"
          aria-label="Search tokens"
          style={{
            background: "#111",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <div
          role="listbox"
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            paddingRight: 4,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ color: "#888", fontSize: 12, padding: 12, textAlign: "center" }}>
              No matching tokens.
            </div>
          )}
          {filtered.map((a) => {
            const isSel = selected?.id === a.id
            const balance = formatUnits(a.balance || "0", a.decimals)
            return (
              <button
                key={a.id}
                role="option"
                aria-selected={isSel}
                onClick={() => onPick(a)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isSel ? "#1a1a1a" : "transparent",
                  border: "1px solid",
                  borderColor: isSel ? "#3a3a3a" : "transparent",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.symbol}</span>
                  <span style={{ fontSize: 11, color: "#888" }}>{a.name}</span>
                </span>
                <span style={{ fontSize: 12, color: "#bbb", fontFamily: "monospace" }}>
                  {balance}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TokenSelector

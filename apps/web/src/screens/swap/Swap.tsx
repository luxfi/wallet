/**
 * Swap — the canonical token-swap form. SCREENS.md §3.
 *
 *   ┌─────────────────────────────────────────┐
 *   │ ← Swap                              ⚙   │
 *   ├─────────────────────────────────────────┤
 *   │ From: [Token ▼]   [amount         ]    │
 *   │       Balance: 0.000 — Max              │
 *   │                  ⇅                      │
 *   │ To:   [Token ▼]   [amount (estimated)]  │
 *   │                                         │
 *   │ Route: AMM v3 — LUX → USDC              │
 *   │ Slippage: 0.50%                         │
 *   │       [   Confirm swap   ]              │
 *   └─────────────────────────────────────────┘
 *
 * Foundation Blue passes the asset list via prop (default `[]` so the
 * screen renders standalone). The router's lazy-load wraps this component
 * in `<SwapRoutes />` which calls `usePortfolioAssets()` to populate it.
 *
 * Slippage gate is enforced in two places:
 *   - UI shows a red-flag banner when impact > 3% AND slippage doesn't
 *     accommodate it.
 *   - On-chain router reverts on amountOutMinimum mismatch (defence in
 *     depth — UI cannot weaken the on-chain check).
 */
import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { useSwapStore } from "../../store/swap"
import { type Asset, formatUnits } from "../../lib/asset"
import { TokenSelector } from "./TokenSelector"
import { QuoteRoute } from "./QuoteRoute"
import { useSwapQuote } from "./useSwapQuote"
import { useSwapExecute } from "./useSwapExecute"

interface Props {
  /** Asset universe — typically `usePortfolioAssets()` from the parent. */
  assets: Asset[]
}

export function Swap({ assets }: Props) {
  const { address } = useAccount()
  const {
    fromAsset,
    toAsset,
    amount,
    slippageBps,
    quote,
    status,
    error,
    setFromAsset,
    setToAsset,
    flipAssets,
    setAmount,
    setSlippageBps,
    reset,
  } = useSwapStore()

  // Reset on mount — keeps stale quotes from leaking across sessions.
  useEffect(() => {
    reset()
  }, [reset])

  useSwapQuote()
  const { execute } = useSwapExecute()

  const [pickerSide, setPickerSide] = useState<"from" | "to" | null>(null)
  const [slippageOpen, setSlippageOpen] = useState(false)

  const fromBalance = fromAsset
    ? formatUnits(fromAsset.balance || "0", fromAsset.decimals)
    : null
  const toAmountDisplay =
    quote && toAsset ? formatUnits(quote.amountOut, toAsset.decimals) : ""

  const isBusy =
    status === "quoting" ||
    status === "approving" ||
    status === "swapping"
  const canSubmit =
    !!address &&
    !!fromAsset &&
    !!toAsset &&
    amount.trim() !== "" &&
    quote !== null &&
    status === "ready" &&
    !isBusy

  function buttonLabel(): string {
    if (!address) return "Connect wallet"
    if (!fromAsset || !toAsset) return "Select tokens"
    if (amount.trim() === "") return "Enter amount"
    switch (status) {
      case "quoting":
        return "Fetching route…"
      case "approving":
        return "Approving…"
      case "swapping":
        return "Swapping…"
      case "done":
        return "Swapped"
      default:
        return quote ? "Confirm swap" : "Enter amount"
    }
  }

  async function onSubmit() {
    try {
      await execute()
    } catch {
      // store captures the error
    }
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        background: "#0a0a0a",
        color: "#fff",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Swap</h1>
        <button
          onClick={() => setSlippageOpen((v) => !v)}
          aria-label="Slippage settings"
          aria-expanded={slippageOpen}
          style={{
            background: "transparent",
            color: "#aaa",
            border: "1px solid #222",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          ⚙ {(slippageBps / 100).toFixed(2)}%
        </button>
      </div>

      {slippageOpen && (
        <SlippagePopover
          slippageBps={slippageBps}
          onChange={setSlippageBps}
          onClose={() => setSlippageOpen(false)}
        />
      )}

      <SideRow
        side="from"
        asset={fromAsset}
        amount={amount}
        editable
        balanceLabel={fromBalance ? `${fromBalance} ${fromAsset?.symbol}` : null}
        onPick={() => setPickerSide("from")}
        onAmountChange={setAmount}
        onMax={() => fromBalance && setAmount(fromBalance)}
      />

      <FlipButton onFlip={flipAssets} />

      <SideRow
        side="to"
        asset={toAsset}
        amount={toAmountDisplay}
        editable={false}
        balanceLabel={
          toAsset
            ? `${formatUnits(toAsset.balance || "0", toAsset.decimals)} ${toAsset.symbol}`
            : null
        }
        onPick={() => setPickerSide("to")}
        onAmountChange={() => {}}
      />

      <QuoteRoute quote={quote} />

      {error && (
        <div
          role="alert"
          style={{
            background: "#2a0a0a",
            border: "1px solid #5a1a1a",
            color: "#ef4444",
            borderRadius: 6,
            padding: 8,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          background: canSubmit ? "#fff" : "#333",
          color: canSubmit ? "#000" : "#777",
          border: "none",
          borderRadius: 8,
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 600,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {buttonLabel()}
      </button>

      <TokenSelector
        open={pickerSide !== null}
        assets={assets}
        selected={pickerSide === "from" ? fromAsset : toAsset}
        filterChainId={
          // For the output side, prefer the same chain as the input — cross-
          // chain swaps go through Bridge, not Swap.
          pickerSide === "to" ? fromAsset?.chainId : undefined
        }
        onPick={(a) => {
          if (pickerSide === "from") setFromAsset(a)
          else if (pickerSide === "to") setToAsset(a)
          setPickerSide(null)
        }}
        onClose={() => setPickerSide(null)}
      />
    </div>
  )
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface SideRowProps {
  side: "from" | "to"
  asset: Asset | null
  amount: string
  editable: boolean
  balanceLabel: string | null
  onPick: () => void
  onAmountChange: (v: string) => void
  onMax?: () => void
}

function SideRow({
  side,
  asset,
  amount,
  editable,
  balanceLabel,
  onPick,
  onAmountChange,
  onMax,
}: SideRowProps) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#888",
          fontSize: 11,
        }}
      >
        <span>{side === "from" ? "From" : "To"}</span>
        {balanceLabel && (
          <span>
            Balance: {balanceLabel}
            {side === "from" && onMax && (
              <button
                onClick={onMax}
                style={{
                  background: "none",
                  color: "#fff",
                  border: "none",
                  fontSize: 11,
                  marginLeft: 6,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Max
              </button>
            )}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onPick}
          aria-label={`Select ${side === "from" ? "input" : "output"} token`}
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          {asset ? asset.symbol : "Select token"}
          <span style={{ fontSize: 9, color: "#888" }}>▼</span>
        </button>
        <input
          inputMode="decimal"
          value={amount}
          readOnly={!editable}
          onChange={(e) => editable && onAmountChange(e.target.value)}
          placeholder="0.0"
          aria-label={`${side === "from" ? "Input" : "Output"} amount`}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 24,
            minWidth: 0,
            textAlign: "right",
          }}
        />
      </div>
    </div>
  )
}

function FlipButton({ onFlip }: { onFlip: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0" }}>
      <button
        onClick={onFlip}
        aria-label="Flip tokens"
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          color: "#fff",
          width: 32,
          height: 32,
          borderRadius: 16,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        ⇅
      </button>
    </div>
  )
}

interface SlippageProps {
  slippageBps: number
  onChange: (bps: number) => void
  onClose: () => void
}

function SlippagePopover({ slippageBps, onChange, onClose }: SlippageProps) {
  const presets = [10, 50, 100] // 0.10 / 0.50 / 1.00 %
  const isPreset = presets.includes(slippageBps)
  const [custom, setCustom] = useState(
    isPreset ? "" : (slippageBps / 100).toFixed(2),
  )
  return (
    <div
      role="region"
      aria-label="Slippage tolerance"
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 11 }}>
        <span>Max slippage</span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "none",
            color: "#aaa",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {presets.map((bps) => (
          <button
            key={bps}
            onClick={() => {
              onChange(bps)
              setCustom("")
            }}
            style={{
              flex: 1,
              background: slippageBps === bps ? "#fff" : "#1a1a1a",
              color: slippageBps === bps ? "#000" : "#fff",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {(bps / 100).toFixed(2)}%
          </button>
        ))}
        <input
          value={custom}
          onChange={(e) => {
            const v = e.target.value
            setCustom(v)
            const pct = Number.parseFloat(v)
            if (Number.isFinite(pct) && pct >= 0.01 && pct <= 50) {
              onChange(Math.round(pct * 100))
            }
          }}
          placeholder="Custom"
          inputMode="decimal"
          aria-label="Custom slippage percent"
          style={{
            width: 90,
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
            textAlign: "right",
          }}
        />
      </div>
      {(slippageBps < 5 || slippageBps > 500) && (
        <div style={{ fontSize: 11, color: "#fbbf24" }}>
          Unusual slippage — review before submitting.
        </div>
      )}
    </div>
  )
}

export default Swap

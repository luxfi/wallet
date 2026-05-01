/**
 * Bridge form — top-level. SCREENS.md §5 mockup:
 *
 *   ┌─────────────────────────────────────────┐
 *   │ ← Bridge                                │
 *   ├─────────────────────────────────────────┤
 *   │ From: [Chain selector]                  │
 *   │ To:   [Chain selector]                  │
 *   │ Asset:[Token  ] [amount]                │
 *   │ Recipient: same wallet ▼                │
 *   │ Route preview: lock → MPC → mint        │
 *   │ ETA: ~30s • Fee: 0.5 ZOO                │
 *   │       [   Confirm bridge   ]            │
 *   └─────────────────────────────────────────┘
 *
 * Foundation Blue owns the brand-shell + chrome; this component renders the
 * inner panel.
 */
import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { useBridgeStore, type BridgeQuote } from "../../store/bridge"
import { CHAINS, formatUnits, type Asset } from "../../lib/asset"
import { useBridgeQuote } from "./useBridgeQuote"
import { useBridgeExecute } from "./useBridgeExecute"

interface Props {
  /** Asset list from portfolio. Same shape Send/Swap consume. */
  assets: Asset[]
  /**
   * Chain ids exposed in the bridge selector. Must match keys in `CHAINS`.
   * Defaults to the canonical Teleport-supported set (per SCREENS.md §5).
   */
  bridgeChains?: string[]
}

const DEFAULT_BRIDGE_CHAINS = [
  "lux-c",
  "lux-x",
  "lux-b",
  "lux-z",
  "zoo-l1",
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "avalanche",
]

export function Bridge({ assets, bridgeChains = DEFAULT_BRIDGE_CHAINS }: Props) {
  const { address } = useAccount()
  const {
    fromChainId,
    toChainId,
    asset,
    amount,
    recipient,
    quote,
    status,
    error,
    setFromChainId,
    setToChainId,
    setAsset,
    setAmount,
    setRecipient,
    flipChains,
  } = useBridgeStore()

  useBridgeQuote()
  const { execute } = useBridgeExecute()

  const [recipientMode, setRecipientMode] = useState<"self" | "other">("self")

  // Default the asset to the first portfolio asset that lives on the source
  // chain when the source flips (or on first mount). Stays sticky if the user
  // already chose one on the new chain.
  useEffect(() => {
    if (asset && asset.chainId === fromChainId) return
    const first = assets.find((a) => a.chainId === fromChainId)
    setAsset(first ?? null)
  }, [fromChainId, assets, asset, setAsset])

  const sourceAssets = useMemo(
    () => assets.filter((a) => a.chainId === fromChainId),
    [assets, fromChainId],
  )

  const isBusy =
    status === "quoting" ||
    status === "locking" ||
    status === "signing" ||
    status === "minting"
  const canSubmit =
    asset !== null &&
    amount !== "" &&
    quote !== null &&
    !isBusy &&
    fromChainId !== toChainId

  function buttonLabel(): string {
    switch (status) {
      case "quoting":
        return "Fetching route…"
      case "locking":
        return "Locking on source…"
      case "signing":
        return "MPC ceremony…"
      case "minting":
        return "Minting on destination…"
      case "done":
        return "Bridged"
      default:
        return quote ? "Confirm bridge" : "Enter amount"
    }
  }

  async function onSubmit() {
    try {
      await execute()
    } catch {
      // store captures error
    }
  }

  const effectiveRecipient = recipientMode === "self" ? address ?? "" : recipient

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
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18 }}>Bridge</h1>

      <ChainPair
        fromChainId={fromChainId}
        toChainId={toChainId}
        chains={bridgeChains}
        onFromChange={setFromChainId}
        onToChange={setToChainId}
        onFlip={flipChains}
      />

      <AssetAmount
        sourceAssets={sourceAssets}
        asset={asset}
        amount={amount}
        onAssetChange={setAsset}
        onAmountChange={setAmount}
      />

      <Recipient
        mode={recipientMode}
        ownAddress={address ?? null}
        recipient={recipient}
        onModeChange={setRecipientMode}
        onRecipientChange={setRecipient}
      />

      <RoutePreview
        fromChainId={fromChainId}
        toChainId={toChainId}
        asset={asset}
        quote={quote}
      />

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

      <div style={{ fontSize: 11, color: "#666" }}>
        Recipient: {effectiveRecipient || "—"}
      </div>

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
    </div>
  )
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface ChainPairProps {
  fromChainId: string
  toChainId: string
  chains: string[]
  onFromChange: (id: string) => void
  onToChange: (id: string) => void
  onFlip: () => void
}

function ChainPair({ fromChainId, toChainId, chains, onFromChange, onToChange, onFlip }: ChainPairProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <ChainSelect label="From" value={fromChainId} chains={chains} exclude={toChainId} onChange={onFromChange} />
      <button
        onClick={onFlip}
        aria-label="Flip chains"
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          color: "#fff",
          width: 28,
          height: 28,
          borderRadius: 14,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        ⇆
      </button>
      <ChainSelect label="To" value={toChainId} chains={chains} exclude={fromChainId} onChange={onToChange} />
    </div>
  )
}

interface ChainSelectProps {
  label: string
  value: string
  chains: string[]
  exclude: string
  onChange: (id: string) => void
}

function ChainSelect({ label, value, chains, exclude, onChange }: ChainSelectProps) {
  return (
    <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          color: "#fff",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 13,
        }}
      >
        {chains.map((id) => {
          const c = CHAINS[id]
          return (
            <option key={id} value={id} disabled={id === exclude}>
              {c?.label ?? id}
            </option>
          )
        })}
      </select>
    </label>
  )
}

interface AssetAmountProps {
  sourceAssets: Asset[]
  asset: Asset | null
  amount: string
  onAssetChange: (a: Asset | null) => void
  onAmountChange: (v: string) => void
}

function AssetAmount({ sourceAssets, asset, amount, onAssetChange, onAmountChange }: AssetAmountProps) {
  const balance = asset ? formatUnits(asset.balance, asset.decimals) : null
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
      <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 11 }}>
        <span>Asset</span>
        {balance && (
          <span>
            Balance: {balance} {asset?.symbol}
            {asset && (
              <button
                onClick={() => onAmountChange(balance)}
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
        <select
          value={asset?.id ?? ""}
          onChange={(e) => {
            const next = sourceAssets.find((a) => a.id === e.target.value) ?? null
            onAssetChange(next)
          }}
          aria-label="Asset"
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          {sourceAssets.length === 0 && <option value="">No assets on source</option>}
          {sourceAssets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol}
            </option>
          ))}
        </select>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.0"
          aria-label="Amount"
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

interface RecipientProps {
  mode: "self" | "other"
  ownAddress: string | null
  recipient: string
  onModeChange: (m: "self" | "other") => void
  onRecipientChange: (v: string) => void
}

function Recipient({ mode, ownAddress, recipient, onModeChange, onRecipientChange }: RecipientProps) {
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
      <div style={{ fontSize: 11, color: "#888" }}>Recipient</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onModeChange("self")}
          style={{
            flex: 1,
            background: mode === "self" ? "#fff" : "#1a1a1a",
            color: mode === "self" ? "#000" : "#fff",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Same wallet
        </button>
        <button
          onClick={() => onModeChange("other")}
          style={{
            flex: 1,
            background: mode === "other" ? "#fff" : "#1a1a1a",
            color: mode === "other" ? "#000" : "#fff",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Different address
        </button>
      </div>
      {mode === "other" ? (
        <input
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
          placeholder="0x… or *.lux"
          aria-label="Recipient address"
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#fff",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 13,
          }}
        />
      ) : (
        <div style={{ fontSize: 12, color: "#bbb", fontFamily: "monospace" }}>
          {ownAddress ?? "Not connected"}
        </div>
      )}
    </div>
  )
}

interface RoutePreviewProps {
  fromChainId: string
  toChainId: string
  asset: Asset | null
  quote: BridgeQuote | null
}

function RoutePreview({ fromChainId, toChainId, asset, quote }: RoutePreviewProps) {
  const fromLabel = CHAINS[fromChainId]?.label ?? fromChainId
  const toLabel = CHAINS[toChainId]?.label ?? toChainId

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
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div>Route: {fromLabel} → {toLabel}</div>
        <div>Enter an amount to preview ETA + fee.</div>
      </div>
    )
  }

  const eta = quote.etaSeconds < 60 ? `~${quote.etaSeconds}s` : `~${Math.round(quote.etaSeconds / 60)}m`
  const fee = asset ? `${formatUnits(quote.fee, asset.decimals)} ${asset.symbol}` : quote.fee
  const out = asset ? `${formatUnits(quote.amountOut, asset.decimals)} ${asset.symbol}` : quote.amountOut
  const path = quote.path.map((id) => CHAINS[id]?.label ?? id).join(" → ")

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
        <span>{path}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>ETA to finality</span>
        <span>{eta}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>Bridge fee</span>
        <span>{fee}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#888" }}>You receive</span>
        <span>{out}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
        <span>Threshold</span>
        <span>{quote.threshold}</span>
      </div>
    </div>
  )
}

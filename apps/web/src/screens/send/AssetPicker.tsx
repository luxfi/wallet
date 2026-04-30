/**
 * AssetPicker — modal that re-uses the portfolio's asset rows.
 *
 * Foundation Blue passes the canonical `assets` array down from a portfolio
 * context (same as Swap's TokenSelector pattern). We render rows in priority
 * order; the caller decides ordering.
 */
import { CHAINS, formatUnits, type Asset } from "../../lib/asset"

export interface AssetPickerProps {
  open: boolean
  assets: Asset[]
  onSelect: (asset: Asset) => void
  onClose: () => void
}

export default function AssetPicker({
  open,
  assets,
  onSelect,
  onClose,
}: AssetPickerProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick asset"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color1, #0a0a0a)",
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            Select asset
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
            }}
          >
            ×
          </button>
        </div>

        {assets.length === 0 ? (
          <p style={{ color: "var(--color10, #888)" }}>No assets yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {assets.map((asset) => (
              <li key={asset.id}>
                <AssetRow asset={asset} onSelect={() => onSelect(asset)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AssetRow({
  asset,
  onSelect,
}: {
  asset: Asset
  onSelect: () => void
}) {
  const chain = CHAINS[asset.chainId]
  const formatted = formatUnits(asset.balance, asset.decimals)
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        background: "transparent",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        color: "inherit",
        width: "100%",
      }}
    >
      {asset.iconUrl ? (
        <img
          src={asset.iconUrl}
          alt=""
          width={32}
          height={32}
          style={{ borderRadius: "999px" }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            background: "var(--color4, #222)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          {asset.symbol.slice(0, 2)}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 600 }}>{asset.symbol}</span>
        <span style={{ color: "var(--color10, #888)", fontSize: "0.75rem" }}>
          {chain?.label ?? asset.chainId}
        </span>
      </div>
      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
        {formatted}
      </span>
    </button>
  )
}

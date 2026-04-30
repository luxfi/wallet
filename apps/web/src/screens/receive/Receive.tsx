/**
 * Receive screen: chain switcher → address display → QR → copy/share.
 *
 * The address is derived locally from the unlocked mnemonic (BIP-44 per
 * chain). Nothing leaves the device. The QR encodes a `lux:<chain>:<addr>`
 * URI so a peer scanning it knows which chain we're advertising.
 *
 * Style is intentionally minimal — Foundation Blue owns the chrome and
 * brand tokens; we render the inner panel using plain markup so it inherits
 * the host shell's CSS variables (`--color1`, `--color10`, etc.).
 */
import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { CHAIN_LIST, CHAINS } from "../../lib/asset"
import { useReceiveAddress } from "./useReceiveAddress"

export default function Receive() {
  const [chainId, setChainId] = useState<string>("lux-c")
  const { address, qrUri, locked, error } = useReceiveAddress(chainId)
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const onShare = async () => {
    if (!address) return
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Lux address",
          text: address,
          url: qrUri,
        })
      } catch {
        // user cancelled — non-fatal
      }
    } else {
      await onCopy()
    }
  }

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "center",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Receive</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
        <label htmlFor="receive-chain" style={{ color: "var(--color10, #888)", fontSize: "0.875rem" }}>
          Chain
        </label>
        <select
          id="receive-chain"
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            background: "var(--color2, #111)",
            color: "var(--color12, #fff)",
            border: "1px solid var(--color6, #333)",
            borderRadius: "0.5rem",
            fontSize: "1rem",
          }}
        >
          {CHAIN_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {locked ? (
        <p style={{ color: "var(--red10, #c44)" }}>
          Wallet locked. Unlock to view your address.
        </p>
      ) : error ? (
        <p style={{ color: "var(--red10, #c44)" }}>{error}</p>
      ) : (
        <>
          <div
            style={{
              padding: "1rem",
              background: "var(--color1, #fff)",
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QRCodeSVG
              value={qrUri}
              size={224}
              level="M"
              includeMargin={false}
            />
          </div>

          <div
            style={{
              padding: "0.75rem",
              background: "var(--color2, #111)",
              borderRadius: "0.5rem",
              width: "100%",
            }}
          >
            <code
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "0.875rem",
                wordBreak: "break-all",
                display: "block",
                textAlign: "center",
              }}
            >
              {address}
            </code>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
            <button
              onClick={onCopy}
              style={btnPrimary}
              aria-label="Copy address"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <button
              onClick={onShare}
              style={btnSecondary}
              aria-label="Share address"
            >
              Share
            </button>
          </div>

          <p style={{ color: "var(--color10, #888)", fontSize: "0.75rem", margin: 0 }}>
            {CHAINS[chainId]?.label}
          </p>
        </>
      )}
    </div>
  )
}

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  fontSize: "1rem",
  cursor: "pointer",
  border: "1px solid var(--color6, #333)",
}

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "var(--color12, #fff)",
  color: "var(--color1, #000)",
  fontWeight: 600,
}

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "var(--color12, #fff)",
}

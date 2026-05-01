/**
 * TxSummary — from / to / amount / gas + nested ContractDecode.
 *
 * Pure presentation. Decoding state lives in `ContractDecode`. Risk
 * assessment is handled by the parent so it can drive the global
 * red/yellow/green badge above the summary.
 */
import { useEffect, useState } from "react"
import {
  type DecodedCall,
  decodeCalldata,
  decodeLocal,
} from "../../lib/abi"
import { chainLabel } from "../../lib/brand"
import { useSettingsStore } from "../../store/settings"
import { fetchPrices } from "../../lib/prices"
import type { UnsignedTx } from "../../store/signing"

export interface TxSummaryProps {
  tx: UnsignedTx
  /** Called once decode completes so the parent can run risk assessment. */
  onDecoded?: (decoded: DecodedCall | null) => void
}

export default function TxSummary({ tx, onDecoded }: TxSummaryProps) {
  return (
    <div style={wrap}>
      <Origin tx={tx} />
      <Field label="From">
        <Mono>{shortAddr(tx.from)}</Mono>
      </Field>
      <Field label="To">
        <Mono>{shortAddr(tx.to)}</Mono>
      </Field>
      <Field label="Chain">{chainLabel(tx.chainId)}</Field>
      <AmountField tx={tx} />
      <GasField tx={tx} />
      {tx.data !== "0x" && tx.data !== "0x0" && (
        <ContractDecode tx={tx} onDecoded={onDecoded} />
      )}
    </div>
  )
}

function Origin({ tx }: { tx: UnsignedTx }) {
  const map: Record<UnsignedTx["origin"], string> = {
    send: "Send",
    swap: "Swap",
    bridge: "Bridge",
    dapp: "Connected App",
  }
  const label = map[tx.origin]
  return (
    <div style={originRow}>
      <span style={originLabel}>{label}</span>
      {tx.origin === "dapp" && tx.dapp && (
        <span style={dapp}>
          {tx.dapp.name} · <span style={dappUrl}>{tx.dapp.url}</span>
        </span>
      )}
      {tx.summary && <span style={summary}>{tx.summary}</span>}
    </div>
  )
}

function AmountField({ tx }: { tx: UnsignedTx }) {
  const currency = useSettingsStore((s) => s.currency)
  const [usd, setUsd] = useState<number | null>(null)
  const native = formatWei(tx.value)
  const symbol = nativeSymbol(tx.chainId)

  useEffect(() => {
    let mounted = true
    fetchPrices([symbol], currency).then((m) => {
      if (mounted) setUsd(typeof m[symbol] === "number" ? m[symbol] : null)
    })
    return () => {
      mounted = false
    }
  }, [symbol, currency])

  const fiat =
    usd !== null && tx.value !== "0"
      ? `${formatFiat(Number(native) * usd, currency)} ${currency}`
      : null

  return (
    <Field label="Amount">
      <span>
        <span style={{ fontWeight: 500 }}>
          {native} {symbol}
        </span>
        {fiat && <span style={fiatHint}> ≈ {fiat}</span>}
      </span>
    </Field>
  )
}

function GasField({ tx }: { tx: UnsignedTx }) {
  if (!tx.gas && !tx.gasPrice) {
    return (
      <Field label="Network fee">
        <span style={{ color: "rgba(255,255,255,0.5)" }}>estimating…</span>
      </Field>
    )
  }
  const gas = tx.gas ? BigInt(tx.gas) : 0n
  const gasPrice = tx.gasPrice ? BigInt(tx.gasPrice) : 0n
  const fee = gas * gasPrice
  return (
    <Field label="Network fee">
      <Mono>{formatWei(fee.toString())} {nativeSymbol(tx.chainId)}</Mono>
    </Field>
  )
}

interface DecodeProps {
  tx: UnsignedTx
  onDecoded?: (decoded: DecodedCall | null) => void
}

/**
 * ContractDecode — surfaces the function name + decoded args.
 *
 * Synchronous local decode runs first. If unknown, an async network
 * 4byte lookup runs (opt-in flag, off by default). The user can
 * explicitly request the network lookup with the "Look up signature"
 * button so we never leak calldata over plaintext fallback paths
 * without consent.
 */
export function ContractDecode({ tx, onDecoded }: DecodeProps) {
  const [decoded, setDecoded] = useState<DecodedCall | null>(() =>
    decodeLocal(tx.data),
  )
  const [busy, setBusy] = useState(false)

  // Notify parent of initial decode (sync).
  useEffect(() => {
    onDecoded?.(decoded)
    // Only re-fire when the decoded object reference changes.
  }, [decoded, onDecoded])

  const onLookup = async () => {
    setBusy(true)
    try {
      const result = await decodeCalldata(tx.data, { network: true })
      setDecoded(result)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={decodeBox} aria-labelledby="decode-h">
      <header style={decodeHead}>
        <h3 id="decode-h" style={decodeTitle}>
          Contract call
        </h3>
        {decoded?.local === null && (
          <button type="button" style={lookupBtn} onClick={onLookup} disabled={busy}>
            {busy ? "Looking up…" : "Look up signature"}
          </button>
        )}
      </header>
      {!decoded ? (
        <pre style={raw}>0x{strip0x(tx.data).slice(0, 8)}…</pre>
      ) : (
        <>
          <div style={fnHeader}>
            <span style={fnName}>{decoded.name}</span>
            {decoded.signature && (
              <span style={fnSig}>{decoded.signature}</span>
            )}
            {decoded.local === false && (
              <span style={badge}>via 4byte directory</span>
            )}
            {decoded.local === null && <span style={badgeWarn}>unknown</span>}
          </div>
          <ul style={argsList}>
            {decoded.args.map((a, i) => (
              <li key={i} style={argRow}>
                <span style={argName}>
                  {a.name}
                  <span style={argType}>: {a.type}</span>
                </span>
                <span style={argValue}>{a.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={field}>
      <span style={fieldLabel}>{label}</span>
      <span style={fieldValue}>{children}</span>
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={monoStyle}>{children}</span>
}

function shortAddr(a: string): string {
  if (!a) return ""
  if (a.length <= 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function strip0x(s: string): string {
  return s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s
}

/** Format wei to native units (18 decimals) with up to 6 fractional digits. */
function formatWei(value: string): string {
  if (!value || value === "0") return "0"
  let big: bigint
  try {
    big = BigInt(value)
  } catch {
    return value
  }
  const neg = big < 0n
  const abs = neg ? -big : big
  const wei = abs.toString().padStart(19, "0")
  const head = wei.slice(0, wei.length - 18) || "0"
  const tail = wei.slice(wei.length - 18).slice(0, 6).replace(/0+$/, "")
  const out = tail ? `${head}.${tail}` : head
  return neg ? `-${out}` : out
}

function formatFiat(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "decimal",
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(n)
  } catch {
    return n.toFixed(2)
  }
}

function nativeSymbol(chainId: number): string {
  switch (chainId) {
    case 96369:
    case 96368:
    case 36963:
    case 36911:
    case 494949:
      return "LUX"
    case 200200:
      return "ZOO"
    case 1:
    case 42161:
    case 8453:
      return "ETH"
    case 137:
      return "MATIC"
    case 43114:
      return "AVAX"
    default:
      return "—"
  }
}

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 }
const originRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 0 12px",
  borderBottom: "1px solid #1a1a1a",
  marginBottom: 8,
}
const originLabel: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
}
const dapp: React.CSSProperties = { fontSize: 14, fontWeight: 500 }
const dappUrl: React.CSSProperties = { color: "rgba(255,255,255,0.5)", fontSize: 12 }
const summary: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)" }
const field: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid #141414",
}
const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
}
const fieldValue: React.CSSProperties = { fontSize: 13, textAlign: "right" }
const fiatHint: React.CSSProperties = { color: "rgba(255,255,255,0.5)", marginLeft: 6 }
const monoStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const decodeBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  background: "#0a0a0a",
  border: "1px solid #1a1a1a",
  borderRadius: 8,
}
const decodeHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}
const decodeTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "rgba(255,255,255,0.5)",
  margin: 0,
}
const lookupBtn: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  background: "transparent",
  color: "#fff",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  cursor: "pointer",
}
const fnHeader: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: 8,
  marginBottom: 8,
}
const fnName: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
}
const fnSig: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 11,
  color: "rgba(255,255,255,0.5)",
}
const badge: React.CSSProperties = {
  fontSize: 10,
  padding: "2px 6px",
  background: "#1a1a1a",
  borderRadius: 999,
  color: "rgba(255,255,255,0.6)",
}
const badgeWarn: React.CSSProperties = {
  fontSize: 10,
  padding: "2px 6px",
  background: "#3a2a00",
  borderRadius: 999,
  color: "#ffb84d",
}
const argsList: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0 }
const argRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "4px 0",
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
}
const argName: React.CSSProperties = { color: "rgba(255,255,255,0.7)" }
const argType: React.CSSProperties = { color: "rgba(255,255,255,0.4)" }
const argValue: React.CSSProperties = {
  color: "#fff",
  textAlign: "right",
  wordBreak: "break-all",
  maxWidth: "60%",
}
const raw: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 12,
  color: "rgba(255,255,255,0.6)",
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
}

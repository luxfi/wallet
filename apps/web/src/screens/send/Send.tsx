/**
 * Send form. Editable until the user taps "Sign & Send", at which point
 * we navigate to /send/confirm.
 *
 * Validation is per-chain (EVM checksum / Lux bech32 / Solana base58) and
 * gates the submit button. Insufficient-balance check is part of the same
 * gate so the UI never lets a doomed tx leave the form.
 *
 * Foundation Blue passes `assets` from a portfolio context; we don't fetch
 * here. Mounting `/send` resets the store so a stale form never replays.
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import AssetPicker from "./AssetPicker"
import FeePreview from "./FeePreview"
import { useSendStore } from "../../store/send"
import {
  CHAINS,
  formatUnits,
  parseUnits,
  type Asset,
} from "../../lib/asset"
import { validateAddress } from "../../lib/address"

export interface SendProps {
  /** Asset list from portfolio. Foundation Blue wires this from a context. */
  assets: Asset[]
}

export default function Send({ assets }: SendProps) {
  const navigate = useNavigate()
  const {
    to,
    amount,
    memo,
    asset,
    setTo,
    setAmount,
    setMemo,
    setAsset,
    reset,
  } = useSendStore()

  // Reset on mount per spec; keeps stale state from leaking across sessions.
  useEffect(() => {
    reset()
  }, [reset])

  const [pickerOpen, setPickerOpen] = useState(false)

  const chain = asset ? CHAINS[asset.chainId] : null

  const addressValidation = useMemo(() => {
    if (!chain || !to) return { ok: false as const, reason: "" }
    return validateAddress(to, chain.kind, chain.bech32Hrp)
  }, [chain, to])

  const amountValidation = useMemo(() => {
    if (!asset) return { ok: false as const, reason: "Pick an asset" }
    if (!amount) return { ok: false as const, reason: "" }
    let value: bigint
    try {
      value = parseUnits(amount, asset.decimals)
    } catch (e) {
      return { ok: false as const, reason: (e as Error).message }
    }
    if (value <= 0n) {
      return { ok: false as const, reason: "Must be greater than zero" }
    }
    let bal: bigint
    try {
      bal = BigInt(asset.balance)
    } catch {
      bal = 0n
    }
    if (value > bal) return { ok: false as const, reason: "Insufficient balance" }
    return { ok: true as const }
  }, [asset, amount])

  const canSubmit =
    asset !== null && addressValidation.ok && amountValidation.ok

  const usdQuote = useMemo(() => {
    if (!asset?.usdPrice || !amount) return null
    const n = Number(amount)
    if (!Number.isFinite(n)) return null
    return (n * asset.usdPrice).toFixed(2)
  }, [asset, amount])

  const onMax = () => {
    if (!asset) return
    setAmount(formatUnits(asset.balance, asset.decimals))
  }

  const onContinue = () => {
    navigate("/send/confirm")
  }

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Send</h1>

      <Field label="From">
        <button
          onClick={() => setPickerOpen(true)}
          style={inputBtn}
          aria-label="Select asset"
        >
          {asset
            ? `${asset.symbol} on ${chain?.label ?? asset.chainId}`
            : "Select asset"}
        </button>
        {asset ? (
          <Hint>
            Balance: {formatUnits(asset.balance, asset.decimals)} {asset.symbol}
          </Hint>
        ) : null}
      </Field>

      <Field label="To">
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={
            chain?.kind === "evm"
              ? "0x…"
              : chain?.kind === "solana"
              ? "base58 address"
              : "P-lux1… or X-lux1…"
          }
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={to.length > 0 && !addressValidation.ok}
          style={input}
        />
        {to.length > 0 && !addressValidation.ok && addressValidation.reason ? (
          <Error>{addressValidation.reason}</Error>
        ) : null}
      </Field>

      <Field label="Amount">
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={amount.length > 0 && !amountValidation.ok}
            style={{ ...input, flex: 1 }}
          />
          <button
            onClick={onMax}
            disabled={!asset}
            style={inputBtnSmall}
            aria-label="Max amount"
          >
            Max
          </button>
        </div>
        {usdQuote ? <Hint>≈ ${usdQuote} USD</Hint> : null}
        {amount.length > 0 && !amountValidation.ok && amountValidation.reason ? (
          <Error>{amountValidation.reason}</Error>
        ) : null}
      </Field>

      <Field label="Memo (optional)">
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="What's this for?"
          maxLength={200}
          style={input}
        />
      </Field>

      {asset && addressValidation.ok && amountValidation.ok ? (
        <FeePreview asset={asset} to={to} amount={amount} />
      ) : null}

      <button
        onClick={onContinue}
        disabled={!canSubmit}
        style={canSubmit ? btnPrimary : btnDisabled}
      >
        Sign & Send
      </button>

      <AssetPicker
        open={pickerOpen}
        assets={assets}
        onClose={() => setPickerOpen(false)}
        onSelect={(a: Asset) => {
          setAsset(a)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}

/* ───── inline atoms (style colocated; no design dep) ─────────────────── */

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label style={{ color: "var(--color10, #888)", fontSize: "0.875rem" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--color10, #888)", fontSize: "0.75rem", margin: 0 }}>
      {children}
    </p>
  )
}

function Error({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--red10, #c44)", fontSize: "0.75rem", margin: 0 }}>
      {children}
    </p>
  )
}

const input: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color6, #333)",
  background: "var(--color2, #111)",
  color: "var(--color12, #fff)",
  fontSize: "1rem",
  fontFamily: "inherit",
  width: "100%",
}

const inputBtn: React.CSSProperties = {
  ...input,
  cursor: "pointer",
  textAlign: "left",
}

const inputBtnSmall: React.CSSProperties = {
  padding: "0.625rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color6, #333)",
  background: "transparent",
  color: "var(--color12, #fff)",
  fontSize: "0.875rem",
  cursor: "pointer",
}

const btnPrimary: React.CSSProperties = {
  padding: "0.875rem 1rem",
  borderRadius: "0.5rem",
  border: "none",
  background: "var(--color12, #fff)",
  color: "var(--color1, #000)",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
}

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: "var(--color6, #333)",
  color: "var(--color9, #666)",
  cursor: "not-allowed",
}

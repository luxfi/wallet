/**
 * F-Chain confidential transfer screen.
 *
 * Flow:
 *   1. User enters recipient address.
 *   2. We look up the recipient's F-Chain pubkey. If unregistered, we block
 *      the transfer with a clear error.
 *   3. User enters amount + symbol. Amount is encrypted client-side under
 *      the recipient pubkey (via @l.x/fhe when present, gateway fallback
 *      otherwise — degraded mode is loud).
 *   4. Tx is submitted; we surface txHash on success.
 */

import { useCallback, useState } from "react"
import { Link } from "react-router-dom"
import { colors, layout, text } from "./styles"
import type { FHERecipient } from "./types"
import { useFHETransfer } from "./useFHETransfer"

interface Props {
  /** Connected wallet address. Foundation passes this in once connected. */
  fromAddress?: string
}

function isValidAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim())
}

export function ConfidentialTransfer({ fromAddress }: Props) {
  const { send, lookupRecipient, submitting, error, result } = useFHETransfer()

  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [symbol, setSymbol] = useState("LUX")
  const [recipient, setRecipient] = useState<FHERecipient | undefined>()
  const [lookupErr, setLookupErr] = useState<string | undefined>()
  const [lookingUp, setLookingUp] = useState(false)

  const onLookup = useCallback(async () => {
    setLookupErr(undefined)
    setRecipient(undefined)
    if (!isValidAddress(to)) {
      setLookupErr("Invalid 0x-prefixed address (40 hex chars).")
      return
    }
    setLookingUp(true)
    try {
      const r = await lookupRecipient(to.trim())
      setRecipient(r)
      if (!r.registered) {
        setLookupErr(
          "Recipient has no F-Chain pubkey registered — they cannot receive confidential transfers.",
        )
      }
    } catch (e) {
      setLookupErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLookingUp(false)
    }
  }, [to, lookupRecipient])

  const canSubmit = !!fromAddress && !!recipient?.registered && !!amount && !submitting

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!fromAddress || !recipient?.registered) return
      let bigAmount: bigint
      try {
        // Amount is decimal — convert assuming 18 decimals.
        const [whole, frac = ""] = amount.split(".")
        const fracPad = (frac + "0".repeat(18)).slice(0, 18)
        bigAmount = BigInt(whole + fracPad)
      } catch {
        return
      }
      await send({
        fromAddress,
        toAddress: recipient.address,
        symbol,
        amount: bigAmount,
      })
    },
    [fromAddress, recipient, amount, symbol, send],
  )

  return (
    <div style={layout.page}>
      <div style={layout.container}>
        <div style={layout.header}>
          <h1 style={text.h1}>Confidential transfer</h1>
          <Link to="/confidential" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
            Back
          </Link>
        </div>

        <div style={layout.warn}>
          F-Chain transfer — amounts encrypted under the recipient's TFHE public key.
          Cost is roughly 10× a standard transfer (LP-013).
        </div>

        {!fromAddress ? (
          <div style={{ ...layout.warn, color: colors.danger, borderColor: colors.danger }}>
            Connect a wallet to send confidential transfers.
          </div>
        ) : null}

        <form onSubmit={onSubmit} style={layout.col}>
          <div style={layout.card}>
            <div style={layout.label}>Recipient address</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={layout.input}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <button
                type="button"
                style={layout.buttonGhost}
                onClick={onLookup}
                disabled={lookingUp || !to}
              >
                {lookingUp ? "Looking up…" : "Lookup"}
              </button>
            </div>
            {lookupErr ? (
              <div style={{ ...layout.warn, marginTop: 8, marginBottom: 0 }}>{lookupErr}</div>
            ) : null}
            {recipient?.registered ? (
              <div style={{ marginTop: 8 }}>
                <span style={text.muted}>F-Chain pubkey: </span>
                <span style={layout.mono}>
                  {recipient.pubkey.slice(0, 16)}…{recipient.pubkey.slice(-8)}
                </span>
              </div>
            ) : null}
          </div>

          <div style={layout.card}>
            <div style={layout.label}>Amount</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={layout.input}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
              />
              <select
                style={{ ...layout.input, maxWidth: 120 }}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              >
                <option value="LUX">LUX</option>
                <option value="ZOO">ZOO</option>
                <option value="AI">AI</option>
              </select>
            </div>
            <div style={{ ...text.muted, marginTop: 8 }}>
              Amount is encrypted on this device. The validator never sees plaintext.
            </div>
          </div>

          <button
            type="submit"
            style={{ ...layout.button, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
            disabled={!canSubmit}
          >
            {submitting ? "Encrypting + signing…" : "Send confidential transfer"}
          </button>
        </form>

        {result ? (
          <div style={{ ...layout.card, marginTop: 16, borderColor: colors.success }}>
            <div style={text.h3}>Transfer submitted</div>
            <div style={{ ...layout.mono, marginTop: 8 }}>{result.txHash}</div>
            {result.degraded ? (
              <div style={{ ...layout.warn, marginTop: 12, marginBottom: 0 }}>
                Degraded mode: gateway-side encryption was used. Install the
                FHE WASM module for fully client-side encryption.
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div style={{ ...layout.warn, color: colors.danger, borderColor: colors.danger, marginTop: 16 }}>
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}

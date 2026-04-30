/**
 * StakeForm — pick a validator, enter amount, choose lock period.
 *
 * Wraps the validator list (read-only mode shown when a validator is
 * pre-selected via the URL). Submits via useStake. After success, replaces
 * the form with a confirmation panel and a link back to /stake.
 *
 * Defenses:
 *   - Amount field uses inputMode="decimal" + a strict regex on input;
 *     only digits and a single dot are permitted.
 *   - All BigInt construction is wrapped in try/catch with explicit
 *     overflow checks so an attacker pasting "1e999" cannot DOS the form.
 *   - Lock period slider is bounded; min/max are enforced before submit.
 */

import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  PCHAIN_MAX_STAKE_DURATION_SECONDS,
  PCHAIN_MIN_DELEGATOR_STAKE_NLUX,
  PCHAIN_MIN_STAKE_DURATION_SECONDS,
  useStakeStore,
  type Validator,
} from "../../store/stake"
import { useStake } from "./useStake"
import { useValidators } from "./useValidators"
import { ValidatorList } from "./ValidatorList"

const NODE_ID_RE = /^NodeID-[1-9A-HJ-NP-Za-km-z]{32,50}$/
const AMOUNT_RE = /^\d{0,12}(\.\d{0,9})?$/

function luxStringToNLux(amount: string): bigint | null {
  if (!AMOUNT_RE.test(amount)) return null
  if (!amount || amount === ".") return null
  const [whole, frac = ""] = amount.split(".")
  const padded = (frac + "000000000").slice(0, 9)
  try {
    const w = BigInt(whole || "0")
    const f = BigInt(padded || "0")
    if (w > 1_000_000_000n) return null // 1B LUX upper bound — supply guard
    return w * 1_000_000_000n + f
  } catch {
    return null
  }
}

function durationLabel(seconds: number): string {
  const days = Math.round(seconds / (24 * 60 * 60))
  if (days < 14) return `${days} days (below minimum)`
  if (days < 60) return `${days} days`
  const months = Math.round(days / 30)
  return `${months} months (${days} days)`
}

const DURATION_PRESETS_DAYS = [14, 30, 90, 180, 365]

export function StakeForm() {
  useValidators()
  const params = useParams<{ nodeID?: string }>()
  const navigate = useNavigate()
  const validators = useStakeStore((s) => s.validators)
  const { submit, submitting, error } = useStake()

  const [nodeID, setNodeID] = useState<string>(params.nodeID ?? "")
  const [amount, setAmount] = useState("")
  const [days, setDays] = useState(30)
  const [success, setSuccess] = useState<{ txID: string } | null>(null)

  // If params change (deep link to /stake/:nodeID), update the selection.
  useEffect(() => {
    if (params.nodeID && NODE_ID_RE.test(params.nodeID)) {
      setNodeID(params.nodeID)
    }
  }, [params.nodeID])

  const selected: Validator | undefined = useMemo(
    () => validators.find((v) => v.nodeID === nodeID),
    [validators, nodeID],
  )

  const amountNLux = useMemo(() => luxStringToNLux(amount), [amount])
  const durationSeconds = days * 24 * 60 * 60

  const validation: string | null = (() => {
    if (!nodeID) return "Select a validator"
    if (!NODE_ID_RE.test(nodeID)) return "Invalid validator node ID"
    if (selected?.jailed) return "Validator is jailed"
    if (!amountNLux) return "Enter an amount"
    if (amountNLux < PCHAIN_MIN_DELEGATOR_STAKE_NLUX) {
      return `Minimum stake is 25 LUX`
    }
    if (durationSeconds < PCHAIN_MIN_STAKE_DURATION_SECONDS) {
      return "Lock period must be at least 14 days"
    }
    if (durationSeconds > PCHAIN_MAX_STAKE_DURATION_SECONDS) {
      return "Lock period cannot exceed 365 days"
    }
    return null
  })()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validation || !amountNLux) return
    try {
      const out = await submit({
        role: "delegator",
        nodeID,
        amountNLux,
        durationSeconds,
      })
      setSuccess({ txID: out.txID })
    } catch {
      // useStake already populates `error`.
    }
  }

  if (success) {
    return (
      <section aria-labelledby="stake-success" style={{ padding: "1rem" }}>
        <h2 id="stake-success">Delegation submitted</h2>
        <p>Your delegation is broadcasting to the Lux P-Chain.</p>
        <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
          Tx ID: {success.txID}
        </p>
        <button type="button" onClick={() => navigate("/stake")}>
          Back to staking
        </button>
      </section>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ padding: "1rem", display: "grid", gap: "1rem" }}
      noValidate
    >
      <header>
        <Link to="/stake">← Back</Link>
        <h2 style={{ margin: "0.5rem 0" }}>Delegate LUX</h2>
      </header>

      <fieldset style={{ border: "1px solid rgba(127,127,127,0.3)", padding: "0.75rem" }}>
        <legend>Validator</legend>
        {selected ? (
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>{selected.name ?? selected.nodeID}</strong>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{selected.nodeID}</div>
            <div style={{ fontSize: 12 }}>
              APY {selected.apy.toFixed(2)}% · Uptime{" "}
              {(selected.uptime * 100).toFixed(2)}% · Fee{" "}
              {(selected.delegationFeeBps / 100).toFixed(2)}%
            </div>
            <button
              type="button"
              onClick={() => setNodeID("")}
              style={{ marginTop: "0.5rem" }}
            >
              Change validator
            </button>
          </div>
        ) : (
          <ValidatorList
            selectedNodeID={nodeID}
            onSelect={(v) => setNodeID(v.nodeID)}
          />
        )}
      </fieldset>

      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Amount (LUX)</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="25.00"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(",", ".")
            if (v === "" || AMOUNT_RE.test(v)) setAmount(v)
          }}
          aria-label="Stake amount in LUX"
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8 }}
          required
        />
        <small style={{ opacity: 0.7 }}>Minimum 25 LUX. 9 decimal places.</small>
      </label>

      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Lock period</span>
        <input
          type="range"
          min={14}
          max={365}
          step={1}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Lock period in days"
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{durationLabel(durationSeconds)}</span>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {DURATION_PRESETS_DAYS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDays(d)}
                aria-pressed={days === d}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </label>

      {validation ? (
        <div role="status" style={{ opacity: 0.8 }}>
          {validation}
        </div>
      ) : null}
      {error ? (
        <div role="alert" style={{ color: "#c00" }}>
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!!validation || submitting}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        {submitting ? "Submitting…" : "Sign & delegate"}
      </button>
    </form>
  )
}

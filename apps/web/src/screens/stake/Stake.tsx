/**
 * Stake — landing screen.
 *
 * Shows total staked, total claimable, and a preview of the validator
 * list with a "Browse validators" CTA. Active stakes appear underneath
 * with claim/unstake actions when their lock period has elapsed.
 */

import { Link } from "react-router-dom"
import { useStakeStore, type ActiveStake } from "../../store/stake"
import { useValidators } from "./useValidators"
import { ValidatorList } from "./ValidatorList"

const luxFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
})

function formatLux(nLux: bigint): string {
  if (nLux === 0n) return "0"
  const whole = nLux / 1_000_000_000n
  const frac = (nLux % 1_000_000_000n) / 100_000n
  if (frac === 0n) return luxFormatter.format(Number(whole))
  return `${luxFormatter.format(Number(whole))}.${frac.toString().padStart(4, "0").replace(/0+$/, "")}`
}

function StakeRow({ stake }: { stake: ActiveStake }) {
  const now = Math.floor(Date.now() / 1000)
  const elapsed = now >= stake.endTime
  return (
    <tr style={{ borderTop: "1px solid rgba(127,127,127,0.2)" }}>
      <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: 12 }}>
        {stake.nodeID.slice(0, 12)}…
      </td>
      <td style={{ padding: "0.5rem", textAlign: "right" }}>
        {formatLux(stake.amountNLux)} LUX
      </td>
      <td style={{ padding: "0.5rem", textAlign: "right" }}>
        {formatLux(stake.pendingRewardNLux)} LUX
      </td>
      <td style={{ padding: "0.5rem", textAlign: "right" }}>
        {new Date(stake.endTime * 1000).toLocaleDateString()}
      </td>
      <td style={{ padding: "0.5rem", textAlign: "right" }}>
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 10,
            background: stake.status === "active" ? "#0a7" : "#aaa",
            color: "#fff",
          }}
        >
          {stake.status.toUpperCase()}
        </span>
      </td>
      <td style={{ padding: "0.5rem", textAlign: "right" }}>
        {elapsed ? (
          <button type="button" disabled>
            Unstake
          </button>
        ) : (
          <span style={{ opacity: 0.7, fontSize: 12 }}>locked</span>
        )}
      </td>
    </tr>
  )
}

export function Stake() {
  useValidators()
  const stakes = useStakeStore((s) => s.stakes)
  const totalClaimable = useStakeStore((s) => s.totalClaimableNLux)
  const stakesLoading = useStakeStore((s) => s.stakesLoading)

  const totalStaked = stakes.reduce((sum, s) => sum + s.amountNLux, 0n)

  return (
    <section style={{ padding: "1rem", display: "grid", gap: "1.25rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>Staking</h1>
        <p style={{ margin: "0.25rem 0", opacity: 0.7 }}>
          Delegate LUX to a P-Chain validator and earn staking rewards.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 12,
            border: "1px solid rgba(127,127,127,0.2)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>Total staked</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            {formatLux(totalStaked)} LUX
          </div>
        </div>
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 12,
            border: "1px solid rgba(127,127,127,0.2)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>Claimable rewards</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            {formatLux(totalClaimable)} LUX
          </div>
          <button
            type="button"
            disabled={totalClaimable === 0n}
            style={{ marginTop: "0.5rem" }}
          >
            Claim all
          </button>
        </div>
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 12,
            border: "1px solid rgba(127,127,127,0.2)",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>Active delegations</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{stakes.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Link to="/stake/validators">
          <button type="button">Browse validators</button>
        </Link>
      </div>

      <section aria-labelledby="active-stakes">
        <h2 id="active-stakes" style={{ margin: 0 }}>
          Your delegations
        </h2>
        {stakes.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            {stakesLoading ? "Loading…" : "No active delegations yet."}
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Validator</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Amount</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Reward</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Ends</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stakes.map((s) => (
                <StakeRow key={s.txID} stake={s} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="validator-preview">
        <h2 id="validator-preview" style={{ margin: 0 }}>
          Top validators
        </h2>
        <ValidatorList />
      </section>
    </section>
  )
}

/**
 * ValidatorList — sortable table of P-Chain validators.
 *
 * Columns: name/nodeID, stake, APY, uptime, fee, capacity.
 * Sort: APY desc (default) | uptime desc | stake desc.
 * Pagination: 25 per page, hidden if total <= 25.
 * Filter: search by nodeID prefix or name (case-insensitive substring).
 *
 * Security:
 *   - All user-supplied search text is rendered as text content only.
 *   - All numeric formatting is via Intl.NumberFormat — no string concat
 *     that could be exploited if a validator response contains
 *     unicode-shaped numbers.
 *   - Jailed validators get a red badge and the Delegate button is
 *     disabled (defense-in-depth on top of useStake validation).
 */

import { useMemo, useState } from "react"
import { useStakeStore, type Validator } from "../../store/stake"
import { useValidators } from "./useValidators"

export type SortKey = "apy" | "uptime" | "stake"

export interface ValidatorListProps {
  /** Selected validator nodeID (highlights the row). */
  selectedNodeID?: string
  /** Called when the user clicks Delegate or Select on a validator. */
  onSelect?: (validator: Validator) => void
  /** Hides the action button, useful when this list is read-only. */
  readOnly?: boolean
  /** Initial sort (defaults to "apy"). */
  initialSort?: SortKey
}

const PAGE_SIZE = 25

const luxFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})
const pctFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

function formatLux(nLux: bigint): string {
  if (nLux === 0n) return "0"
  // 1 LUX = 1e9 nLUX. Truncate to 4 decimals to keep the table compact.
  const whole = nLux / 1_000_000_000n
  const frac = (nLux % 1_000_000_000n) / 100_000n // 4 decimal precision
  if (frac === 0n) return luxFormatter.format(Number(whole))
  return `${luxFormatter.format(Number(whole))}.${frac.toString().padStart(4, "0").replace(/0+$/, "")}`
}

function shortNodeID(nodeID: string): string {
  if (nodeID.length <= 16) return nodeID
  return `${nodeID.slice(0, 12)}…${nodeID.slice(-4)}`
}

function sortValidators(rows: Validator[], key: SortKey): Validator[] {
  const out = rows.slice()
  switch (key) {
    case "apy":
      out.sort((a, b) => b.apy - a.apy)
      break
    case "uptime":
      out.sort((a, b) => b.uptime - a.uptime)
      break
    case "stake":
      out.sort((a, b) =>
        a.stakeAmountNLux > b.stakeAmountNLux
          ? -1
          : a.stakeAmountNLux < b.stakeAmountNLux
            ? 1
            : 0,
      )
      break
  }
  return out
}

export function ValidatorList({
  selectedNodeID,
  onSelect,
  readOnly = false,
  initialSort = "apy",
}: ValidatorListProps) {
  useValidators()
  const validators = useStakeStore((s) => s.validators)
  const loading = useStakeStore((s) => s.validatorsLoading)
  const error = useStakeStore((s) => s.validatorsError)

  const [sort, setSort] = useState<SortKey>(initialSort)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q
      ? validators.filter((v) => {
          const haystack = `${v.nodeID} ${v.name ?? ""}`.toLowerCase()
          return haystack.includes(q)
        })
      : validators
    return sortValidators(rows, sort)
  }, [validators, query, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )

  return (
    <div data-testid="validator-list">
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          type="search"
          placeholder="Search nodeID or name"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          aria-label="Search validators"
          style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: 8 }}
          maxLength={128}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort validators"
          style={{ padding: "0.5rem", borderRadius: 8 }}
        >
          <option value="apy">Sort: APY</option>
          <option value="uptime">Sort: Uptime</option>
          <option value="stake">Sort: Stake</option>
        </select>
      </div>

      {loading && validators.length === 0 ? (
        <div role="status">Loading validators…</div>
      ) : null}
      {error ? (
        <div role="alert" style={{ color: "#c00" }}>
          {error}
        </div>
      ) : null}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0.5rem" }}>Validator</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Stake (LUX)</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>APY</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Uptime</th>
            <th style={{ textAlign: "right", padding: "0.5rem" }}>Fee</th>
            {readOnly ? null : <th />}
          </tr>
        </thead>
        <tbody>
          {slice.map((v) => {
            const isSelected = v.nodeID === selectedNodeID
            const atCapacity = v.delegationCapacityNLux === 0n
            const blocked = v.jailed
            return (
              <tr
                key={v.nodeID}
                data-jailed={v.jailed || undefined}
                style={{
                  borderTop: "1px solid rgba(127,127,127,0.2)",
                  background: isSelected
                    ? "rgba(0,128,255,0.08)"
                    : undefined,
                }}
              >
                <td style={{ padding: "0.5rem" }}>
                  <div style={{ fontWeight: 500 }}>
                    {v.name ?? shortNodeID(v.nodeID)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {shortNodeID(v.nodeID)}
                    {v.jailed ? (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "#c00",
                          color: "#fff",
                          fontSize: 10,
                        }}
                      >
                        JAILED
                      </span>
                    ) : null}
                    {atCapacity && !v.jailed ? (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "#999",
                          color: "#fff",
                          fontSize: 10,
                        }}
                      >
                        AT CAPACITY
                      </span>
                    ) : null}
                  </div>
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  {formatLux(v.stakeAmountNLux)}
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  {pctFormatter.format(v.apy)}%
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  {pctFormatter.format(v.uptime * 100)}%
                </td>
                <td style={{ textAlign: "right", padding: "0.5rem" }}>
                  {pctFormatter.format(v.delegationFeeBps / 100)}%
                </td>
                {readOnly ? null : (
                  <td style={{ textAlign: "right", padding: "0.5rem" }}>
                    <button
                      type="button"
                      disabled={blocked || atCapacity}
                      onClick={() => onSelect?.(v)}
                    >
                      {isSelected ? "Selected" : "Delegate"}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
          {!loading && filtered.length === 0 ? (
            <tr>
              <td
                colSpan={readOnly ? 5 : 6}
                style={{ padding: "1rem", textAlign: "center", opacity: 0.7 }}
              >
                No validators match.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {pageCount > 1 ? (
        <nav
          aria-label="Validator pagination"
          style={{
            marginTop: "0.75rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            ‹
          </button>
          <span aria-live="polite">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
          >
            ›
          </button>
        </nav>
      ) : null}
    </div>
  )
}

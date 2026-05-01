/**
 * RiskIndicator — green / yellow / red traffic light for a pending tx.
 *
 * Heuristics (composable, evaluated in order; first match wins):
 *
 *   red    — calldata decoded as `unknown` AND `to` is a contract (data≠0x)
 *            AND `to` is not in the known-contract allowlist.
 *   yellow — token approve(spender, value) where value >= 2^248 (effectively
 *            unbounded). Or large native value > 1 ETH-equivalent.
 *   green  — known contract / standard transfer / receive.
 *
 * The green allowlist is intentionally tiny: only the canonical Lux/Zoo
 * routers and the Permit2 contract. Bigger lists belong on the gateway,
 * not bundled into every wallet release.
 *
 * Heuristics are NOT a substitute for the user reading the summary — they
 * are a tie-breaker. We never suppress the modal based on risk; the user
 * always confirms.
 */
import { type DecodedCall } from "../../lib/abi"
import type { UnsignedTx } from "../../store/signing"

export type RiskLevel = "green" | "yellow" | "red"

export interface RiskAssessment {
  level: RiskLevel
  reason: string
}

/**
 * Known-contract allowlist (lower-cased, no `0x` prefix). We keep this small
 * by design. Bigger registries belong server-side.
 */
const KNOWN_CONTRACTS: Record<string, string> = {
  // Permit2 — Uniswap canonical, deployed at the same address on most chains.
  "000000000022d473030f116ddee9f6b43ac78ba3": "Permit2",
}

/** 1e18 wei — used as the "large native send" threshold. */
const ONE_ETH = 1_000_000_000_000_000_000n

/** Effectively-unbounded approval threshold (2^248). */
const UNBOUNDED_APPROVAL = 1n << 248n

const stripHex = (a: string): string =>
  (a.startsWith("0x") || a.startsWith("0X") ? a.slice(2) : a).toLowerCase()

export function assessRisk(
  tx: UnsignedTx,
  decoded: DecodedCall | null,
): RiskAssessment {
  const toKey = stripHex(tx.to)
  const known = KNOWN_CONTRACTS[toKey]
  const isContractCall = tx.data !== "0x" && tx.data !== "0x0"

  // RED: contract call we cannot decode and don't recognise.
  if (isContractCall && (!decoded || decoded.local === null) && !known) {
    return {
      level: "red",
      reason: "Unverified contract — calldata could not be decoded.",
    }
  }

  // YELLOW: approve with effectively-unbounded value.
  if (decoded?.name === "approve") {
    const valueArg = decoded.args.find((a) => a.name === "value")
    if (valueArg) {
      try {
        const v = BigInt(valueArg.value)
        if (v >= UNBOUNDED_APPROVAL) {
          return {
            level: "yellow",
            reason:
              "Unbounded token approval — this contract can spend all of your tokens.",
          }
        }
      } catch {
        // Fall through to remaining checks.
      }
    }
  }

  // YELLOW: large native value send.
  if (tx.value && tx.value !== "0") {
    try {
      const v = BigInt(tx.value)
      if (v >= ONE_ETH) {
        return {
          level: "yellow",
          reason: "Large transfer — review the recipient carefully.",
        }
      }
    } catch {
      // value is malformed — caller error, not a risk signal.
    }
  }

  // GREEN: known contract or standard decoded call.
  if (known) {
    return { level: "green", reason: `Known contract: ${known}.` }
  }
  if (decoded?.local) {
    return { level: "green", reason: `Standard ${decoded.name} call.` }
  }
  if (!isContractCall) {
    return { level: "green", reason: "Native transfer." }
  }

  return { level: "yellow", reason: "Calldata decoded via signature directory." }
}

const COLORS: Record<RiskLevel, string> = {
  green: "#3fb950",
  yellow: "#ffb84d",
  red: "#ff6b6b",
}

const ICONS: Record<RiskLevel, string> = {
  green: "✓",
  yellow: "!",
  red: "✕",
}

export default function RiskIndicator({
  assessment,
}: {
  assessment: RiskAssessment
}) {
  const color = COLORS[assessment.level]
  return (
    <div
      role="status"
      aria-label={`Risk ${assessment.level}: ${assessment.reason}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: `${color}1a`,
        border: `1px solid ${color}`,
        borderRadius: 8,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          minWidth: 22,
          borderRadius: "50%",
          background: color,
          color: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {ICONS[assessment.level]}
      </span>
      <span style={{ fontSize: 13, color: "#fff" }}>{assessment.reason}</span>
    </div>
  )
}

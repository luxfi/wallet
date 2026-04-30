/**
 * useValidators — fetches the current P-Chain validator set.
 *
 * Source order:
 *   1. Gateway:  https://${brand.gatewayDomain}/v1/p-chain/validators
 *      (authenticated, server-derived APY/uptime/labels — preferred path)
 *   2. P-Chain RPC fallback: platform.getCurrentValidators
 *      (raw on-chain data; APY/uptime computed client-side from rewards
 *       and connectivity reports)
 *
 * Validator nodeID format is enforced before commit to the store. This
 * defends against gateway response tampering trying to inject HTML or
 * malformed identifiers into the table.
 *
 * Refresh: poll every 30s while screen is mounted; on tab visibility
 * change resume polling (avoid burning rate-limit while hidden).
 */

import { useEffect, useRef } from "react"
import { stakeStore, type Validator } from "../../store/stake"
import { loadRuntimeConfig, pchainRpc } from "../_shared/runtime"

const NODE_ID_RE = /^NodeID-[1-9A-HJ-NP-Za-km-z]{32,50}$/
const POLL_MS = 30_000

interface RawGatewayValidator {
  nodeID?: string
  name?: string
  stakeAmount?: string
  apy?: number
  uptime?: number
  startTime?: number | string
  endTime?: number | string
  delegationFee?: number | string
  delegationCapacity?: string
  jailed?: boolean
}

interface RawRpcValidator {
  nodeID?: string
  stakeAmount?: string
  weight?: string
  uptime?: string
  startTime?: string
  endTime?: string
  delegationFee?: string
  potentialReward?: string
  connected?: boolean
}

function safeBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return BigInt(Math.trunc(value))
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value)
  return fallback
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function normaliseGateway(rows: RawGatewayValidator[]): Validator[] {
  const out: Validator[] = []
  for (const r of rows) {
    if (typeof r.nodeID !== "string" || !NODE_ID_RE.test(r.nodeID)) continue
    out.push({
      nodeID: r.nodeID,
      name: typeof r.name === "string" ? r.name.slice(0, 64) : undefined,
      stakeAmountNLux: safeBigInt(r.stakeAmount),
      apy: Math.max(0, Math.min(100, safeNumber(r.apy))),
      uptime: Math.max(0, Math.min(1, safeNumber(r.uptime))),
      startTime: safeNumber(r.startTime),
      endTime: safeNumber(r.endTime),
      delegationFeeBps: Math.round(
        Math.max(0, Math.min(10000, safeNumber(r.delegationFee) * 100)),
      ),
      delegationCapacityNLux: safeBigInt(r.delegationCapacity),
      jailed: r.jailed === true,
    })
  }
  return out
}

function normaliseRpc(rows: RawRpcValidator[]): Validator[] {
  const out: Validator[] = []
  for (const r of rows) {
    if (typeof r.nodeID !== "string" || !NODE_ID_RE.test(r.nodeID)) continue
    const stake = safeBigInt(r.stakeAmount ?? r.weight)
    const startTime = safeNumber(r.startTime)
    const endTime = safeNumber(r.endTime)
    const reward = safeBigInt(r.potentialReward)
    // Approximate APY from reward over the validation period.
    const periodSeconds = Math.max(1, endTime - startTime)
    const periodYears = periodSeconds / (365 * 24 * 60 * 60)
    const apy =
      stake > 0n && periodYears > 0
        ? Math.min(
            100,
            (Number(reward) / Number(stake) / periodYears) * 100,
          )
        : 0
    const uptime = Math.max(0, Math.min(1, safeNumber(r.uptime)))
    out.push({
      nodeID: r.nodeID,
      stakeAmountNLux: stake,
      apy,
      uptime,
      startTime,
      endTime,
      delegationFeeBps: Math.round(safeNumber(r.delegationFee) * 100),
      delegationCapacityNLux: 0n,
      jailed: r.connected === false,
    })
  }
  return out
}

async function fetchFromGateway(
  gatewayDomain: string,
  signal: AbortSignal,
): Promise<Validator[]> {
  const url = `https://${gatewayDomain}/v1/p-chain/validators`
  const res = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  })
  if (!res.ok) throw new Error(`gateway ${res.status}`)
  const json = (await res.json()) as { validators?: RawGatewayValidator[] }
  if (!Array.isArray(json.validators)) {
    throw new Error("gateway: invalid response shape")
  }
  return normaliseGateway(json.validators)
}

async function fetchFromRpc(
  rpcUrl: string,
  signal: AbortSignal,
): Promise<Validator[]> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "platform.getCurrentValidators",
      params: { subnetID: null, nodeIDs: [] },
    }),
  })
  if (!res.ok) throw new Error(`rpc ${res.status}`)
  const json = (await res.json()) as {
    error?: { message: string }
    result?: { validators?: RawRpcValidator[] }
  }
  if (json.error) throw new Error(`rpc: ${json.error.message}`)
  const rows = json.result?.validators
  if (!Array.isArray(rows)) throw new Error("rpc: invalid response shape")
  return normaliseRpc(rows)
}

export function useValidators(): void {
  const aborter = useRef<AbortController | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false

    const tick = async () => {
      if (stopped) return
      stakeStore.set({ validatorsLoading: true, validatorsError: null })
      const ac = new AbortController()
      aborter.current = ac
      try {
        const cfg = await loadRuntimeConfig()
        const gateway = cfg.brand.gatewayDomain
        let validators: Validator[] = []
        let lastErr: unknown = null
        if (gateway) {
          try {
            validators = await fetchFromGateway(gateway, ac.signal)
          } catch (err) {
            lastErr = err
          }
        }
        if (validators.length === 0) {
          try {
            validators = await fetchFromRpc(pchainRpc(cfg), ac.signal)
          } catch (err) {
            lastErr = err
          }
        }
        if (stopped) return
        if (validators.length === 0 && lastErr) {
          stakeStore.set({
            validators: [],
            validatorsLoading: false,
            validatorsError:
              lastErr instanceof Error ? lastErr.message : "unknown error",
          })
          return
        }
        stakeStore.set({
          validators,
          validatorsLoading: false,
          validatorsError: null,
        })
      } catch (err) {
        if (stopped || ac.signal.aborted) return
        stakeStore.set({
          validatorsLoading: false,
          validatorsError:
            err instanceof Error ? err.message : "validator fetch failed",
        })
      }
    }

    tick()
    timer.current = window.setInterval(() => {
      if (!document.hidden) tick()
    }, POLL_MS)

    const visibility = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener("visibilitychange", visibility)

    return () => {
      stopped = true
      if (timer.current) window.clearInterval(timer.current)
      aborter.current?.abort()
      document.removeEventListener("visibilitychange", visibility)
    }
  }, [])
}

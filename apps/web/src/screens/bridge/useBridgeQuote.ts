/**
 * useBridgeQuote — keeps `useBridgeStore.quote` in sync with the form.
 *
 * Endpoint: `https://${brand.gatewayDomain}/v1/bridge/quote`.
 *
 * Why a single endpoint (vs on-chain fallback like swap)?
 *
 *   The bridge route requires committee state (which validators are online,
 *   what the current threshold is, what the destination mint contract is)
 *   that lives in M-Chain consensus and can't be queried with a single RPC
 *   call. The gateway is the canonical aggregation point — there is no
 *   useful client-only fallback.
 *
 *   When the gateway is unreachable we surface "no quote" rather than show
 *   a stale or fabricated route.
 *
 * Debounce 300ms, 5s timeout, AbortController on input change.
 */
import { useEffect, useRef } from "react"
import { brand } from "@luxfi/wallet-brand"
import { useBridgeStore, type BridgeQuote } from "../../store/bridge"
import { CHAINS, parseUnits } from "../../lib/asset"

const GATEWAY_TIMEOUT_MS = 5_000
const DEBOUNCE_MS = 300

interface RawQuote {
  amountOut?: string
  fee?: string
  etaSeconds?: number
  path?: string[]
  threshold?: string
  mintContract?: string
}

function isHex0x(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function useBridgeQuote(): void {
  const fromChainId = useBridgeStore((s) => s.fromChainId)
  const toChainId = useBridgeStore((s) => s.toChainId)
  const asset = useBridgeStore((s) => s.asset)
  const amount = useBridgeStore((s) => s.amount)
  const setQuote = useBridgeStore((s) => s.setQuote)
  const setStatus = useBridgeStore((s) => s.setStatus)
  const setError = useBridgeStore((s) => s.setError)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gen = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!asset || !amount) {
      setQuote(null)
      setStatus("idle")
      setError(null)
      return
    }
    if (fromChainId === toChainId) {
      setQuote(null)
      setStatus("error")
      setError("Pick two different chains")
      return
    }
    if (!CHAINS[fromChainId] || !CHAINS[toChainId]) {
      setQuote(null)
      setStatus("error")
      setError("Unknown chain selection")
      return
    }

    let amountWei: bigint
    try {
      amountWei = parseUnits(amount, asset.decimals)
    } catch {
      setQuote(null)
      setStatus("idle")
      return
    }
    if (amountWei <= 0n) {
      setQuote(null)
      setStatus("idle")
      return
    }

    setStatus("quoting")
    setError(null)
    const myGen = ++gen.current
    const ctrl = new AbortController()

    debounceRef.current = setTimeout(async () => {
      const gateway = brand.gatewayDomain
      if (!gateway) {
        if (myGen !== gen.current) return
        setStatus("error")
        setError("Bridge gateway not configured")
        return
      }
      const params = new URLSearchParams({
        from: fromChainId,
        to: toChainId,
        asset: asset.id,
        amount: amountWei.toString(),
      })
      const url = `https://${gateway}/v1/bridge/quote?${params.toString()}`
      const timeout = setTimeout(() => ctrl.abort(), GATEWAY_TIMEOUT_MS)
      try {
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-cache" })
        if (!res.ok) throw new Error(`gateway ${res.status}`)
        const raw = (await res.json()) as RawQuote
        if (myGen !== gen.current) return
        if (!raw.amountOut || !raw.fee || typeof raw.etaSeconds !== "number") {
          throw new Error("malformed bridge quote")
        }
        const path = Array.isArray(raw.path) && raw.path.length >= 2
          ? raw.path.slice(0, 5).map(String)
          : [fromChainId, "lux-m", toChainId]
        const quote: BridgeQuote = {
          amountOut: raw.amountOut,
          fee: raw.fee,
          etaSeconds: clampEta(raw.etaSeconds),
          path,
          threshold: typeof raw.threshold === "string" ? raw.threshold : "2/3",
          mintContract: isHex0x(raw.mintContract) ? raw.mintContract : undefined,
          ts: Date.now(),
        }
        setQuote(quote)
        setStatus("ready")
      } catch (err) {
        if (myGen !== gen.current) return
        if (err instanceof DOMException && err.name === "AbortError") return
        setStatus("error")
        setError(err instanceof Error ? err.message : "quote failed")
      } finally {
        clearTimeout(timeout)
      }
    }, DEBOUNCE_MS)

    return () => {
      ctrl.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [
    fromChainId,
    toChainId,
    asset,
    amount,
    setQuote,
    setStatus,
    setError,
  ])
}

function clampEta(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 24 * 3600) return 24 * 3600
  return Math.floor(n)
}

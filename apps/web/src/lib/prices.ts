/**
 * Price fetcher — single canonical surface used by Send / Swap / Bridge /
 * Signing. Routes through the brand gateway so each white-label deployment
 * pins its own pricing source.
 *
 *   GET https://${brand.gatewayDomain}/v1/prices?symbols=LUX,ETH&vs=USD
 *   → { LUX: 2.34, ETH: 3120.55 }
 *
 * Behaviour:
 *   - Returns `{}` on any error. Call sites must handle missing keys.
 *   - In-flight calls are deduped per (symbols, vs) tuple.
 *   - Results cached for 30s in-memory. Wallets show stale-but-acceptable
 *     prices; the user's signing modal does NOT block on a fresh fetch.
 *   - We never ship calldata or addresses to the gateway from this path —
 *     only ticker symbols. PII-clean.
 *
 * Note: gateway URL is built lazily so callers don't need to await
 * `loadBrandConfig()` themselves; an empty `gatewayDomain` short-circuits
 * to `{}` (dev / preview without a gateway).
 */
import { brand } from "@luxfi/wallet-brand"

export type PriceMap = Record<string, number>

interface CacheEntry {
  at: number
  data: PriceMap
}

const TTL_MS = 30_000

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<PriceMap>>()

function cacheKey(symbols: string[], vs: string): string {
  return `${vs.toUpperCase()}|${[...symbols].map((s) => s.toUpperCase()).sort().join(",")}`
}

export async function fetchPrices(
  symbols: string[],
  vs = "USD",
): Promise<PriceMap> {
  if (!symbols.length) return {}
  const key = cacheKey(symbols, vs)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.at < TTL_MS) return cached.data

  const inFlight = inflight.get(key)
  if (inFlight) return inFlight

  const fetchOnce = (async () => {
    if (!brand.gatewayDomain) return {}
    try {
      const url =
        `https://${brand.gatewayDomain}/v1/prices` +
        `?symbols=${encodeURIComponent(symbols.join(","))}` +
        `&vs=${encodeURIComponent(vs)}`
      const res = await fetch(url, { headers: { accept: "application/json" } })
      if (!res.ok) return {}
      const json = (await res.json()) as PriceMap
      // Normalise: upper-case keys, numeric values.
      const out: PriceMap = {}
      for (const [k, v] of Object.entries(json)) {
        const n = Number(v)
        if (Number.isFinite(n)) out[k.toUpperCase()] = n
      }
      cache.set(key, { at: Date.now(), data: out })
      return out
    } catch {
      return {}
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, fetchOnce)
  return fetchOnce
}

/** Convert a native-units amount to the user's display currency. */
export function convertToCurrency(
  nativeAmount: number,
  unitPrice: number,
): number {
  if (!Number.isFinite(nativeAmount) || !Number.isFinite(unitPrice)) return 0
  return nativeAmount * unitPrice
}

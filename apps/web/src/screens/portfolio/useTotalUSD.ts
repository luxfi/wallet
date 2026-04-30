/**
 * Aggregate USD value across all chains and tokens.
 *
 * Price source contract: a thin fetcher hitting the brand's gateway at
 * `/v1/prices?symbols=...`. The Foundation slice will own the actual
 * price service URL resolution (brand.api.prices). For now we point at
 * `${brand.gatewayDomain}/v1/prices` and gracefully degrade to `undefined`
 * when prices are unavailable — totalUSD reports only the chains we could
 * price.
 */
import { useEffect, useMemo } from "react"
import { brand } from "@luxfi/wallet-brand"
import { usePortfolio } from "../../store/portfolio"

interface PriceMap {
  [symbol: string]: number
}

async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  if (!brand.gatewayDomain || symbols.length === 0) return {}
  const url = `https://${brand.gatewayDomain}/v1/prices?symbols=${encodeURIComponent(symbols.join(","))}`
  try {
    const res = await fetch(url)
    if (!res.ok) return {}
    return (await res.json()) as PriceMap
  } catch {
    return {}
  }
}

export function useTotalUSD(): { totalUSD: number; pricesLoaded: boolean } {
  const perChain = usePortfolio((s) => s.perChain)
  const setPortfolio = usePortfolio((s) => s.setPortfolio)
  const totalUSD = usePortfolio((s) => s.totalUSD)

  const symbols = useMemo(() => {
    const set = new Set<string>()
    for (const c of perChain) {
      set.add(c.native.symbol)
      for (const t of c.tokens) set.add(t.symbol)
    }
    return [...set]
  }, [perChain])

  useEffect(() => {
    if (symbols.length === 0) return
    let cancelled = false
    fetchPrices(symbols).then((prices) => {
      if (cancelled) return
      let total = 0
      const enriched = perChain.map((c) => {
        const native = {
          ...c.native,
          usd: prices[c.native.symbol]
            ? Number(c.native.balance) * prices[c.native.symbol]!
            : undefined,
        }
        if (native.usd) total += native.usd
        const tokens = c.tokens.map((t) => {
          const usd = prices[t.symbol] ? Number(t.balance) * prices[t.symbol]! : undefined
          if (usd) total += usd
          return { ...t, usd }
        })
        return { ...c, native, tokens }
      })
      setPortfolio(enriched, total)
    })
    return () => {
      cancelled = true
    }
    // Depend on the symbol set as a stable string; perChain reference changes
    // each fetch but symbol set is what determines the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), setPortfolio])

  return { totalUSD, pricesLoaded: totalUSD > 0 }
}

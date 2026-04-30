/**
 * useTrustedDApps — returns the curated list of dApps for the current
 * deployment.
 *
 * Source order:
 *   1. brand.trustedDApps (white-label override; mounted via brand.json)
 *   2. Hardcoded fallback (Lux/Liquid/Zoo defaults)
 *
 * The fallback never includes Liquidity-internal hosts in non-Liquidity
 * builds — host selection is keyed off brand.appDomain so a hijacked
 * brand.json cannot inject arbitrary entries.
 *
 * URLs are normalised to absolute https origins; entries that fail the
 * URL parser are dropped.
 */

import { useEffect, useState } from "react"
import { loadRuntimeConfig, type TrustedDApp } from "../_shared/runtime"

const FALLBACK_LUX: TrustedDApp[] = [
  {
    name: "Lux DEX",
    url: "https://dex.lux.exchange",
    description: "Native DEX on Lux C-Chain.",
    chainIds: [96369],
    category: "dex",
  },
  {
    name: "Lux Bridge",
    url: "https://bridge.lux.network",
    description: "Cross-chain bridge to/from Lux.",
    chainIds: [96369, 1, 42161, 8453],
    category: "bridge",
  },
  {
    name: "Zoo Exchange",
    url: "https://zoo.exchange",
    description: "Trade ZOO and animal-themed assets.",
    chainIds: [200200],
    category: "exchange",
  },
  {
    name: "Pars Market",
    url: "https://pars.market",
    description: "Marketplace.",
    chainIds: [96369],
    category: "nft",
  },
]

const FALLBACK_LIQUIDITY: TrustedDApp[] = [
  {
    name: "",
    url: "https://swap.",
    description: " DEX.",
    chainIds: [],
    category: "dex",
  },
  {
    name: "Liquidity Exchange",
    url: "https://exchange.",
    description: ".",
    chainIds: [],
    category: "exchange",
  },
]

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === "https:"
  } catch {
    return false
  }
}

function sanitiseEntries(entries: unknown): TrustedDApp[] {
  if (!Array.isArray(entries)) return []
  const out: TrustedDApp[] = []
  for (const e of entries) {
    if (!e || typeof e !== "object") continue
    const r = e as Record<string, unknown>
    if (typeof r.name !== "string" || r.name.length === 0) continue
    if (typeof r.url !== "string" || !isHttpsUrl(r.url)) continue
    const category: TrustedDApp["category"] = [
      "dex",
      "exchange",
      "lending",
      "nft",
      "bridge",
      "other",
    ].includes(r.category as string)
      ? (r.category as TrustedDApp["category"])
      : "other"
    out.push({
      name: r.name.slice(0, 64),
      url: r.url,
      description:
        typeof r.description === "string" ? r.description.slice(0, 256) : "",
      iconUrl:
        typeof r.iconUrl === "string" && isHttpsUrl(r.iconUrl)
          ? r.iconUrl
          : undefined,
      chainIds:
        Array.isArray(r.chainIds) && r.chainIds.every((c) => typeof c === "number")
          ? (r.chainIds as number[]).slice(0, 32)
          : [],
      category,
    })
  }
  return out
}

function selectFallback(appDomain: string | undefined): TrustedDApp[] {
  if (!appDomain) return FALLBACK_LUX
  const d = appDomain.toLowerCase()
  if (d.endsWith("") || d.endsWith("")) {
    return FALLBACK_LIQUIDITY
  }
  return FALLBACK_LUX
}

export function useTrustedDApps(): {
  dapps: TrustedDApp[]
  loading: boolean
  error: string | null
} {
  const [state, setState] = useState<{
    dapps: TrustedDApp[]
    loading: boolean
    error: string | null
  }>({ dapps: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    loadRuntimeConfig()
      .then((cfg) => {
        if (cancelled) return
        const fromBrand = sanitiseEntries(
          (cfg.brand as { trustedDApps?: unknown }).trustedDApps,
        )
        const dapps =
          fromBrand.length > 0 ? fromBrand : selectFallback(cfg.brand.appDomain)
        setState({ dapps, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          dapps: selectFallback(undefined),
          loading: false,
          error: err instanceof Error ? err.message : "config load failed",
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

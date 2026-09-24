/**
 * Runtime config shim for screen modules.
 *
 * Reads `/brand.json` (mounted by K8s ConfigMap, copied from
 * @luxfi/wallet-brand at build time). Returns `RuntimeConfig` with brand,
 * chains, rpc and walletConnect.
 *
 * Foundation Blue owns the canonical loader at apps/web/src/config/. Until
 * that lands, this shim provides the same shape so screens can be authored
 * and tested independently. When Foundation ships, replace the import in
 * screen modules with `@/config/runtime` — the surface is identical.
 *
 * Single fetch per page load, deduped via a module-level promise.
 */

export interface RuntimeBrand {
  name: string
  title: string
  shortName: string
  walletName: string
  appDomain: string
  gatewayDomain: string
  helpUrl: string
  primaryColor: string
  defaultChainId: number
  supportedChainIds: number[]
  walletConnectProjectId: string
  trustedDApps?: TrustedDApp[]
}

export interface TrustedDApp {
  name: string
  url: string
  description: string
  iconUrl?: string
  chainIds: number[]
  category: "dex" | "exchange" | "lending" | "nft" | "bridge" | "other"
}

export interface RuntimeConfig {
  brand: RuntimeBrand
  chains: { defaultChainId: number; supported: number[] }
  rpc: Record<string, string>
  api: { gateway: string; insights: string }
  walletConnect: { projectId: string }
}

let cached: RuntimeConfig | null = null
let pending: Promise<RuntimeConfig> | null = null

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (cached) return Promise.resolve(cached)
  if (pending) return pending
  pending = fetch("/brand.json", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`brand.json ${res.status}`)
      const json = await res.json()
      const cfg: RuntimeConfig = {
        brand: json.brand ?? {},
        chains: json.chains ?? { defaultChainId: 96369, supported: [96369] },
        rpc: json.rpc ?? {},
        api: json.api ?? { gateway: "", insights: "" },
        walletConnect: json.walletConnect ?? { projectId: "" },
      }
      cached = cfg
      return cfg
    })
    .finally(() => {
      pending = null
    })
  return pending
}

export function getRuntimeConfigSync(): RuntimeConfig | null {
  return cached
}

/**
 * The P-Chain RPC, when the brand serves one: `brand.json:rpc.platform`. It is
 * never derived from the gateway host: a brand serves a P-Chain only when it
 * names one.
 */
export function pchainRpc(cfg: RuntimeConfig): string | undefined {
  return cfg.rpc["platform"] || undefined
}

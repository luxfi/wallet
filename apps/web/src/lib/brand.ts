/**
 * Brand config accessor.
 *
 * The canonical white-label config is fetched once from `/brand.json` at app
 * boot (Foundation Blue). This module exposes a sync getter for code paths
 * that run after boot. If Foundation Blue's `loadBrand()` runs first (it
 * does — see `main.tsx`), this getter returns the loaded config; if called
 * before boot completes (test, SSR), it returns the embedded fallback.
 *
 * The fallback shape MUST mirror `apps/web/public/brand.json`. We hard-code
 * only the fields screens read at runtime; the live brand is always the
 * source of truth at boot.
 *
 * One obvious way: every screen that needs brand data calls `getBrand()`.
 * No prop drilling, no React context, no per-component fetches.
 */

export interface BrandConfig {
  brand: {
    name: string
    walletName: string
    appDomain: string
    docsDomain: string
    gatewayDomain: string
    helpUrl: string
    termsUrl: string
    privacyUrl: string
    supportEmail: string
    github: string
    defaultChainId: number
    supportedChainIds: number[]
  }
  rpc: Record<string, string>
}

const FALLBACK: BrandConfig = {
  brand: {
    name: "Lux Wallet",
    walletName: "Lux Wallet",
    appDomain: "wallet.lux.network",
    docsDomain: "docs.lux.network",
    gatewayDomain: "api.lux.network",
    helpUrl: "https://docs.lux.network/wallet",
    termsUrl: "https://lux.network/terms",
    privacyUrl: "https://lux.network/privacy",
    supportEmail: "hi@lux.network",
    github: "https://github.com/luxfi",
    defaultChainId: 96369,
    supportedChainIds: [
      96369, 96368, 200200, 36963, 36911, 494949, 1, 42161, 8453, 137, 43114,
    ],
  },
  rpc: {
    "96369": "https://api.lux.network/mainnet/ext/bc/C/rpc",
    "96368": "https://api.lux.network/testnet/ext/bc/C/rpc",
    "200200": "https://api.zoo.network/rpc",
    "1": "https://eth.llamarpc.com",
    "42161": "https://arb1.arbitrum.io/rpc",
    "8453": "https://mainnet.base.org",
    "137": "https://polygon-rpc.com",
    "43114": "https://api.avax.network/ext/bc/C/rpc",
  },
}

let cached: BrandConfig | null = null

/**
 * Loads brand.json from `/brand.json` once and caches it. Idempotent.
 * Foundation Blue may also pre-load and call `setBrand()` to inject.
 */
export async function loadBrand(): Promise<BrandConfig> {
  if (cached) return cached
  if (typeof fetch === "undefined") {
    cached = FALLBACK
    return cached
  }
  try {
    const res = await fetch("/brand.json", { cache: "no-cache" })
    if (!res.ok) throw new Error(`brand fetch ${res.status}`)
    cached = (await res.json()) as BrandConfig
  } catch {
    cached = FALLBACK
  }
  return cached
}

/** Sync getter; returns FALLBACK until `loadBrand()` resolves. */
export function getBrand(): BrandConfig {
  return cached ?? FALLBACK
}

/** Foundation Blue can inject the loaded brand to skip the fetch. */
export function setBrand(b: BrandConfig): void {
  cached = b
}

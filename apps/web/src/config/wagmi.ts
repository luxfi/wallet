/**
 * Wagmi config — derived from `@luxfi/wallet-brand`'s runtime brand.
 *
 * Chain set: `brand.supportedChainIds`. Defaults to all 11 chains in the
 * shipped Lux brand (Lux mainnet/testnet C-Chain, Zoo L1, Hanzo L1, Q-Chain,
 * F-Chain, Ethereum, Arbitrum, Base, Polygon, Avalanche). White-labels
 * narrow this list at runtime via `/brand.json`.
 *
 * RPC endpoints: `getBootnodeRpcUrl(chainId)` — pulls `runtimeConfig.rpc[id]`
 * overrides first, then falls back to `https://<gatewayDomain>/v1/rpc/<id>`.
 * Never empty-string. Chains without a resolvable RPC are dropped from the
 * config (they cannot be queried anyway, and emitting `http("")` would
 * silently coerce to the bundler's origin which is wrong).
 *
 * NOTE: This module reads `brand` and `runtimeConfig` AFTER `loadBrandConfig()`
 * has populated them. Do not import this module from a top-level side-effect
 * before bootstrap; use a memoized factory call inside the React tree.
 */
import { createConfig, http, type Config } from "wagmi"
import type { Chain, Transport } from "viem"
import { brand, getBootnodeRpcUrl } from "@luxfi/wallet-brand"

/** Static metadata for chains we know — keyed by EIP-155 id. */
const CHAIN_DEFS: Record<number, Omit<Chain, "rpcUrls"> & { defaultRpc?: string }> = {
  1: {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorers: { default: { name: "Etherscan", url: "https://etherscan.io" } },
  },
  137: {
    id: 137,
    name: "Polygon",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorers: { default: { name: "Polygonscan", url: "https://polygonscan.com" } },
  },
  8453: {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorers: { default: { name: "Arbiscan", url: "https://arbiscan.io" } },
  },
  43114: {
    id: 43114,
    name: "Avalanche",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    blockExplorers: { default: { name: "SnowTrace", url: "https://snowtrace.io" } },
  },
  // Lux + Zoo + Hanzo native chains. RPC always resolves through the brand
  // gateway; explorers are looked up at runtime.
  96369: {
    id: 96369,
    name: "Lux Mainnet C-Chain",
    nativeCurrency: { name: "Lux", symbol: "LUX", decimals: 18 },
  },
  96368: {
    id: 96368,
    name: "Lux Testnet C-Chain",
    nativeCurrency: { name: "Lux", symbol: "LUX", decimals: 18 },
    testnet: true,
  },
  200200: {
    id: 200200,
    name: "Zoo L1",
    nativeCurrency: { name: "Zoo", symbol: "ZOO", decimals: 18 },
  },
  36963: {
    id: 36963,
    name: "Hanzo L1",
    nativeCurrency: { name: "Hanzo", symbol: "HAN", decimals: 18 },
  },
  36911: {
    id: 36911,
    name: "Q-Chain",
    nativeCurrency: { name: "Q", symbol: "Q", decimals: 18 },
  },
  494949: {
    id: 494949,
    name: "F-Chain",
    nativeCurrency: { name: "F", symbol: "F", decimals: 18 },
  },
}

/**
 * Build the Wagmi config from the runtime brand. Call this AFTER
 * `loadBrandConfig()` has resolved.
 */
export function buildWagmiConfig(): Config {
  const ids = brand.supportedChainIds.length ? brand.supportedChainIds : [brand.defaultChainId]

  const chains: Chain[] = []
  const transports: Record<number, Transport> = {}

  for (const id of ids) {
    const def = CHAIN_DEFS[id]
    if (!def) {
      // Unknown chain — skip rather than fail. Brand config is the source of
      // truth and may legitimately list a chain we don't have static metadata
      // for yet (e.g., a white-label private network).
      continue
    }
    const rpc = getBootnodeRpcUrl(id)
    if (!rpc) {
      // No URL means no transport. Drop this chain — never construct
      // `http("")` which silently coerces to window.location.origin.
      continue
    }
    const chain: Chain = {
      ...def,
      rpcUrls: { default: { http: [rpc] } },
    }
    chains.push(chain)
    transports[id] = http(rpc)
  }

  if (chains.length === 0) {
    // Last-resort fallback: if no chain resolved an RPC, instantiate a
    // dummy mainnet config so wagmi hooks don't crash. Screens that need
    // a live chain will surface "no chain configured" via `useAccount`.
    const fallback: Chain = {
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://cloudflare-eth.com"] } },
    }
    chains.push(fallback)
    transports[1] = http("https://cloudflare-eth.com")
  }

  // wagmi requires a non-empty tuple type for `chains`.
  return createConfig({
    chains: chains as unknown as readonly [Chain, ...Chain[]],
    transports,
    ssr: false,
  })
}

/**
 * Wagmi config — derived from `@luxfi/wallet-brand`'s runtime brand.
 *
 * Chain set: `brand.supportedChainIds`, intersected with the EVM chains the
 * canonical registry (`@luxwallet/chains`, via `lib/chains`) knows. The
 * registry is the single source of chain metadata (name, native asset);
 * `lib/chains.evmChainDef` shapes it into viem `Chain`s. White-labels narrow
 * the active list at runtime via `/brand.json`.
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
import { brand } from "@luxfi/wallet-brand"
import { viemChain } from "../lib/chains"

/**
 * Build the Wagmi config from the runtime brand. Call this AFTER
 * `loadBrandConfig()` has resolved.
 */
export function buildWagmiConfig(): Config {
  const ids = brand.supportedChainIds.length ? brand.supportedChainIds : [brand.defaultChainId]

  const chains: Chain[] = []
  const transports: Record<number, Transport> = {}

  for (const id of ids) {
    // Skip a chain the registry doesn't know (a white-label private network
    // or a non-EVM family wagmi cannot drive) or one with no resolvable RPC —
    // never construct `http("")`, which silently coerces to the page origin.
    const chain = viemChain(id)
    if (!chain) continue
    chains.push(chain)
    transports[id] = http(chain.rpcUrls.default.http[0])
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

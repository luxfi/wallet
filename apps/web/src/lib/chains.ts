/**
 * Chain metadata — sourced from `@luxwallet/chains`, the canonical registry.
 *
 * `@luxwallet/chains` (MIT) is the ONE source of truth for every chain the
 * Lux Wallet recognises and holds: Lux C/X/P/Q/Z, the sovereign L1s
 * (Hanzo, Zoo, Pars, Sparkle Pony), the external EVM bridge endpoints
 * (Ethereum, Arbitrum, Base, Polygon, Avalanche), and the non-EVM bridge
 * families (Bitcoin, Solana, TON, XRP, Polkadot). 25 chains in total.
 *
 * This module is the thin wallet-side adapter over that registry:
 *   - `chainLabel(id)`   — display name for an EIP-155 id.
 *   - `evmChainDef(id)`  — viem `Chain` metadata (name + nativeCurrency +
 *                          explorer) for the wagmi config.
 *   - `evmChainIds()`    — every EVM chain id the registry knows.
 *   - `registryChains()` — the full registry (EVM + non-EVM) for screens
 *                          that list everything the wallet holds.
 *
 * Block explorers are not part of the registry (they are a UI concern,
 * not signing metadata), so the small explorer overlay lives here keyed
 * by EIP-155 id. Everything else — name, symbol, decimals, family — is
 * read straight from the registry so there is exactly one list.
 *
 * The keyring / signing path is unchanged: this module is metadata only.
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo. `@luxwallet/chains`
 * is consumed as an MIT dependency (compatible).
 */
import { allChains, getChain, type ChainEntry } from "@luxwallet/chains"
import type { Chain } from "viem"

/** Block-explorer overlay, keyed by EIP-155 id. UI-only; not in the registry. */
const EXPLORERS: Record<number, { name: string; url: string }> = {
  1: { name: "Etherscan", url: "https://etherscan.io" },
  137: { name: "Polygonscan", url: "https://polygonscan.com" },
  8453: { name: "Basescan", url: "https://basescan.org" },
  42161: { name: "Arbiscan", url: "https://arbiscan.io" },
  43114: { name: "SnowTrace", url: "https://snowtrace.io" },
}

/** The full registry — every chain the wallet recognises and holds. */
export function registryChains(): readonly ChainEntry[] {
  return allChains()
}

/** Every EVM (EIP-155) chain id in the registry. */
export function evmChainIds(): number[] {
  return allChains()
    .filter((c) => c.evmChainId !== undefined)
    .map((c) => c.evmChainId as number)
}

/**
 * Display label for an EIP-155 chain id, from the registry. Falls back to
 * `Chain {id}` for an id the registry does not know (e.g. a white-label
 * private network listed only in the brand config).
 */
export function chainLabel(id: number): string {
  return getChain(id)?.name ?? `Chain ${id}`
}

/**
 * viem `Chain` metadata (name, nativeCurrency, optional explorer) for an
 * EIP-155 id, built from the registry. Returns undefined when the id is
 * not an EVM chain the registry knows — the wagmi builder skips those.
 *
 * `rpcUrls` is intentionally omitted: the caller resolves the RPC via the
 * brand gateway (`getBootnodeRpcUrl`) and merges it in.
 */
export function evmChainDef(id: number): (Omit<Chain, "rpcUrls">) | undefined {
  const entry = getChain(id)
  if (!entry || entry.evmChainId === undefined) return undefined
  const explorer = EXPLORERS[id]
  return {
    id: entry.evmChainId,
    name: entry.name,
    nativeCurrency: {
      name: entry.nativeAsset.symbol,
      symbol: entry.nativeAsset.symbol,
      decimals: entry.nativeAsset.decimals,
    },
    testnet: entry.testnet,
    ...(explorer ? { blockExplorers: { default: explorer } } : {}),
  }
}

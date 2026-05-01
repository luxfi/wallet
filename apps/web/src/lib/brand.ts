/**
 * Brand façade for screens.
 *
 * The canonical brand singleton lives in `@luxfi/wallet-brand`. Screens
 * import from this file so future refactors (e.g. context-based brand)
 * touch one path. We also expose `chainLabel(id)` here because every
 * screen pretty-prints chain ids and a single source keeps the labels
 * consistent.
 */
import { brand as runtimeBrand, type BrandConfig } from "@luxfi/wallet-brand"

/** Compatibility shape for stash code that called `getBrand().brand`. */
export interface BrandHandle {
  brand: BrandConfig
}

/** Synchronous brand accessor — `brand` is mutated in place by `loadBrandConfig`. */
export function getBrand(): BrandHandle {
  return { brand: runtimeBrand }
}

/** Direct named export for code that just wants the singleton. */
export const brand = runtimeBrand

const CHAIN_LABELS: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  43114: "Avalanche",
  96369: "Lux",
  96368: "Lux Testnet",
  96370: "Lux DEX",
  200200: "Zoo",
  200201: "Zoo Testnet",
  36963: "Hanzo",
  36964: "Hanzo Testnet",
  36911: "Q-Chain",
  36910: "Q-Chain Testnet",
  494949: "F-Chain",
  7071: "F-Chain Testnet",
}

/** Render a chain id as a readable label, or `Chain {id}` if unknown. */
export function chainLabel(id: number): string {
  return CHAIN_LABELS[id] ?? `Chain ${id}`
}

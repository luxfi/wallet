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
import { chainLabel as registryChainLabel } from "./chains"

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

/**
 * Render a chain id as a readable label. Delegates to `@luxwallet/chains`
 * (the canonical registry) via `lib/chains` so every surface shows the same
 * name. Re-exported here for the screens that already import it from `brand`.
 */
export const chainLabel = registryChainLabel

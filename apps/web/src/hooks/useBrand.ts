/**
 * `useBrand()` — React-friendly accessor for the brand singleton.
 *
 * The `brand` object from `@luxfi/wallet-brand` is mutated in-place by
 * `loadBrandConfig()` on bootstrap. Because mutation happens before first
 * render, components can read it synchronously. This hook exists so we can
 * later swap to a context-based brand if a screen needs reactive brand
 * updates without a code-site change.
 */
import { brand, type BrandConfig } from "@luxfi/wallet-brand"

export function useBrand(): BrandConfig {
  return brand
}

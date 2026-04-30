/**
 * Asset feed adapter — the contract between Send and Auth-Portfolio Blue.
 *
 * Send doesn't fetch its own asset list. Auth-Portfolio Blue owns a
 * portfolio store whose `assets` array is the canonical multi-chain feed
 * (per SCREENS.md §1). When that store lands, this hook collapses to:
 *
 *     return usePortfolioStore((s) => s.assets)
 *
 * Until then the picker renders empty — which is the correct behavior:
 * an unprovisioned wallet has no assets to send.
 */
import type { Asset } from "../../lib/asset"

export function usePortfolioAssets(): Asset[] {
  return []
}

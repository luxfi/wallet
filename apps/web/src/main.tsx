/**
 * Bootstrap entry. Load brand config (logo, theme, RPC, gateway) BEFORE
 * first render so the SPA never flashes Lux branding on a Liquidity (or
 * other white-label) deploy.
 *
 * Brand resolution order:
 *   1. K8s ConfigMap mount → /brand.json (white-label deploys overlay this)
 *   2. Bundled brand.json copied by `copyBrandJson` Vite plugin (default Lux)
 *   3. Hardcoded defaults from `@luxfi/wallet-brand`
 */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { brand, loadBrandConfig } from "@luxfi/wallet-brand"
import App from "./App"
import { useAppStore } from "./store"

loadBrandConfig().finally(() => {
  // The store's `chainId` is seeded from `brand.defaultChainId` at module
  // eval — which runs BEFORE this async load mutates the brand singleton.
  // Re-sync it now (before first paint) so the active chain follows the
  // white-label brand (e.g. Hanzo → 36963, Zoo → 200200), not the bundled
  // Lux default. `brand` stays the single source of truth.
  const { chainId, setChainId } = useAppStore.getState()
  if (chainId !== brand.defaultChainId) setChainId(brand.defaultChainId)

  const el = document.getElementById("root")
  if (!el) throw new Error("missing #root")
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

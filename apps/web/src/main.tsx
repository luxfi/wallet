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
import { loadBrandConfig } from "@luxfi/wallet-brand"
import App from "./App"

loadBrandConfig().finally(() => {
  const el = document.getElementById("root")
  if (!el) throw new Error("missing #root")
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

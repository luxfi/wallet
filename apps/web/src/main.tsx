import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { loadBrandConfig } from "@luxfi/wallet-brand"
import App from "./App"

// Apply brand config (logo, theme, RPC, gateway) BEFORE first render so the
// SPA never flashes Lux branding on a Liquidity (or other white-label) deploy.
loadBrandConfig().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

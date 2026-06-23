/**
 * Provider tree:
 *   <GuiProvider>          — @hanzo/gui v7 wrapper (passthrough today; see GuiProvider.tsx)
 *     <QueryClientProvider> — react-query for RPC/balance caching
 *       <WagmiProvider>    — EVM wallet state, chain switching
 *         <RouterProvider> — react-router-dom v7 routes
 *
 * Wagmi config is built AFTER `loadBrandConfig()` resolved (main.tsx awaits
 * it before rendering), so `brand.supportedChainIds` and `runtimeConfig.rpc`
 * are populated. The config is memoized at module init via a lazy ref so
 * StrictMode's double render does not re-instantiate WalletConnect.
 */
import { lazy, Suspense, useEffect, useMemo } from "react"
import { RouterProvider } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { GuiProvider } from "./components/GuiProvider"
import { buildWagmiConfig } from "./config/wagmi"
import { queryClient } from "./config/queryClient"
import { router } from "./router"
import { useSession } from "./store/session"

// Lazy-load the signing modal so the auth/portfolio bootstrap path doesn't
// pull abi.ts + prices.ts into the initial bundle. The modal mounts at
// app root and any slice can trigger it via `useSigningModal().open(tx)`.
const SigningModal = lazy(() => import("./screens/signing/SigningModal"))

export default function App(): React.JSX.Element {
  // Build the wagmi config once. `useMemo` keeps StrictMode's double render
  // from creating two configs; module-level instantiation would force
  // execution before `loadBrandConfig()` finished in some test harnesses.
  const wagmiConfig = useMemo(() => buildWagmiConfig(), [])

  // Restore the lux.id session (from sessionStorage) + custody wallets on
  // boot. Fire-and-forget — a failed hydrate just leaves the app logged out.
  useEffect(() => {
    void useSession.getState().hydrate()
  }, [])

  return (
    <GuiProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RouterProvider router={router} />
          <Suspense fallback={null}>
            <SigningModal />
          </Suspense>
        </WagmiProvider>
      </QueryClientProvider>
    </GuiProvider>
  )
}

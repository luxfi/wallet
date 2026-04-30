/**
 * Router — react-router-dom v7. Lazy-loads each screen so the initial
 * bundle is the AppShell + auth state only. Screen Blues fill the
 * `./screens/{name}/index.tsx` files; their changes don't ripple here.
 *
 * `/` redirects to `/portfolio` — the canonical landing page per
 * SCREENS.md §1.
 */
import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom"
import { AppShell } from "./components/AppShell"

const Portfolio = lazy(() => import("./screens/portfolio"))
const Send = lazy(() => import("./screens/send"))
const Receive = lazy(() => import("./screens/receive"))
const Swap = lazy(() => import("./screens/swap"))
const Bridge = lazy(() => import("./screens/bridge"))
const Stake = lazy(() => import("./screens/stake"))
const DApps = lazy(() => import("./screens/dapps"))
const Confidential = lazy(() => import("./screens/confidential"))
const Settings = lazy(() => import("./screens/settings"))

function ScreenFallback(): React.JSX.Element {
  return (
    <div
      role="status"
      style={{
        padding: 24,
        color: "var(--neutral2, #888)",
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  )
}

const SCREEN_ROUTES: RouteObject[] = [
  { index: true, element: <Navigate to="/portfolio" replace /> },
  { path: "portfolio", element: <Portfolio /> },
  { path: "send", element: <Send /> },
  { path: "receive", element: <Receive /> },
  { path: "swap", element: <Swap /> },
  { path: "bridge", element: <Bridge /> },
  { path: "stake", element: <Stake /> },
  { path: "dapps", element: <DApps /> },
  { path: "confidential", element: <Confidential /> },
  { path: "settings", element: <Settings /> },
  { path: "*", element: <Navigate to="/portfolio" replace /> },
]

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<ScreenFallback />}>
        <AppShell />
      </Suspense>
    ),
    children: SCREEN_ROUTES,
  },
])

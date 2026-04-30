/**
 * GuiProvider — wraps `@hanzo/gui` v7's `HanzoguiProvider` when the package
 * is buildable; falls back to a passthrough fragment otherwise.
 *
 * Why the shim:
 *   `@hanzo/gui@7.0.0` ships a publishing oversight — `package.json:exports`
 *   point at `./dist/esm/index.mjs` but the npm tarball does NOT include a
 *   `dist/` directory. Importing the package directly causes the bundler to
 *   error with "Cannot find module" or to crash at runtime when the empty
 *   stub re-export hits a missing path. Until upstream republishes a fixed
 *   v7 (or we cut over to v7.0.1+), Foundation cannot wire `HanzoguiProvider`.
 *
 *   The brand pattern already drives theming via CSS custom properties
 *   (`--accent1`, `--surface1`, etc.) populated by `loadBrandConfig()`. Every
 *   primitive in this Foundation slice reads those CSS vars directly, so the
 *   absence of `HanzoguiProvider` is transparent at the rendering layer.
 *
 *   Once `@hanzo/gui` v7 republishes its dist artifact, swap the body of
 *   this component to:
 *
 *     import { HanzoguiProvider, type HanzoguiConfig } from "@hanzo/gui"
 *     return <HanzoguiProvider config={config} defaultTheme="dark">{children}</HanzoguiProvider>
 *
 *   No call-site changes required — every consumer wraps with `<GuiProvider>`.
 *
 * Threat model note: the brand-driven CSS vars are set during bootstrap by
 * code we own (`loadBrandConfig()` mutates `document.documentElement.style`).
 * No third-party DOM mutation enters the theme path.
 */
import type { ReactNode } from "react"

export interface GuiProviderProps {
  children: ReactNode
}

export function GuiProvider({ children }: GuiProviderProps): ReactNode {
  // Today: passthrough — CSS variables are the theme channel.
  // Tomorrow: HanzoguiProvider once @hanzo/gui v7 ships dist/.
  return <>{children}</>
}

import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

/**
 * Copy the canonical `brand.json` from `@luxfi/wallet-brand` into the SPA's
 * served root so `loadBrandConfig()` can fetch it. White-label deployments
 * overlay this file via a K8s ConfigMap mount — no code change required.
 */
function copyBrandJson(): Plugin {
  const src = resolve(__dirname, "../../pkgs/brand/brand.json")
  const writeTo = (dest: string) => {
    if (!existsSync(src)) return
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }
  return {
    name: "luxfi-wallet-brand-json",
    buildStart() {
      // Ensure dev server can serve `/brand.json`.
      writeTo(resolve(__dirname, "public/brand.json"))
    },
    closeBundle() {
      writeTo(resolve(__dirname, "dist/brand.json"))
    },
  }
}

export default defineConfig({
  plugins: [
    react({
      // `@hanzo/gui` ships React-only on web; default automatic JSX runtime.
      jsxRuntime: "automatic",
    }),
    copyBrandJson(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
  },
  server: {
    port: 3000,
    strictPort: false,
  },
})

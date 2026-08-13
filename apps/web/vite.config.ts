import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { getWordmarkAdaptiveSVG, getWordmarkSquareSVG } from "@luxfi/logo"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

/**
 * The files the SPA serves but nobody authors here.
 *
 * `brand.json` is the canonical one from `@luxfi/wallet-brand`; white-label
 * deployments overlay it via a K8s ConfigMap mount — no code change required.
 *
 * The Lux marks come from `@luxfi/logo`, which is where the geometry lives.
 * They used to be committed SVGs, and the one the header drew was a purple
 * diamond that appears in no Lux brand. Generating them means the wallet
 * cannot drift from the mark: a new version of the package is the only way
 * they change. Written to `public/` for the dev server and `dist/` for the
 * build, both from the same list.
 */
function served(): Plugin {
  const brandJson = resolve(__dirname, "../../pkgs/brand/brand.json")
  const files = (): Record<string, string | null> => ({
    "brand.json": existsSync(brandJson) ? readFileSync(brandJson, "utf8") : null,
    // Horizontal for the header, squared for the tab and the home screen.
    "brands/lux.svg": getWordmarkAdaptiveSVG(),
    "brands/lux-square.svg": getWordmarkSquareSVG(),
  })
  const writeInto = (root: string) => {
    for (const [name, body] of Object.entries(files())) {
      if (body == null) continue
      const dest = resolve(__dirname, root, name)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, body)
    }
  }
  return {
    name: "luxfi-wallet-served",
    buildStart() {
      writeInto("public")
    },
    closeBundle() {
      writeInto("dist")
    },
  }
}

export default defineConfig({
  plugins: [
    react({
      // `@hanzo/gui` ships React-only on web; default automatic JSX runtime.
      jsxRuntime: "automatic",
    }),
    served(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // @hanzo/gui v7 npm publish ships without dist/ (its package.json
      // exports point at ./dist/esm/index.mjs which doesn't exist). Until
      // upstream republishes a fixed v7, alias to a local stub with
      // minimal primitives. Tokenized props map to CSS vars set by
      // loadBrandConfig() at boot.
      "@hanzo/gui": resolve(__dirname, "src/lib/gui-stub.tsx"),
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

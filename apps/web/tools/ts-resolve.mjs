/**
 * TS resolve hook for the Node built-in test runner.
 *
 * The repo's `*.test.ts` files use bundler-style imports (no `.ts` extension),
 * which Vite resolves at build time but Node's ESM loader does not. This
 * registers a synchronous resolve hook that maps an extensionless relative
 * specifier (`./foo`, `../bar`) to `./foo.ts` / `.tsx` / `.js` or
 * `./foo/index.ts`, so `node --test` can load them. Node 22+ strips the TS
 * types natively — no transpiler dependency.
 *
 * Used by the `test` script: `node --import ./tools/ts-resolve.mjs --test ...`.
 *
 * GPL-3.0-or-later — inherited from the wallet monorepo.
 */
import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as pathResolve } from "node:path"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier)) {
      const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd()
      const base = pathResolve(dirname(parentPath), specifier)
      const candidates = [
        base + ".ts",
        base + ".tsx",
        base + ".js",
        base + "/index.ts",
        base + "/index.tsx",
      ]
      for (const c of candidates) {
        if (existsSync(c)) return { url: pathToFileURL(c).href, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})

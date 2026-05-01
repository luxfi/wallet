/**
 * Version + upstream commit metadata for the About screen.
 *
 * `VERSION` is the SPA's `package.json` version, embedded by Vite at build
 * time via `import.meta.env`. We DO NOT import package.json directly —
 * that would force-bundle every `package.json` field into the client.
 *
 * `loadUpstreamSha()` fetches `/.upstream-sha` (a static file dropped by
 * CI containing the source commit hash). Returns `"unknown"` if the file
 * is missing in dev / preview.
 *
 * Mirror of `screens/_shared/version.ts`. Kept here so screens that import
 * from `lib/` don't have to reach into the `_shared` neighbourhood.
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_VERSION?: string
  }
}

export const VERSION =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_VERSION) ||
  "0.1.0"

let cachedSha: string | null = null

export async function loadUpstreamSha(): Promise<string> {
  if (cachedSha !== null) return cachedSha
  if (typeof fetch === "undefined") {
    cachedSha = "unknown"
    return cachedSha
  }
  try {
    const res = await fetch("/.upstream-sha", { cache: "no-cache" })
    if (!res.ok) {
      cachedSha = "unknown"
      return cachedSha
    }
    const text = (await res.text()).trim()
    cachedSha = text.length > 0 ? text : "unknown"
  } catch {
    cachedSha = "unknown"
  }
  return cachedSha
}

export function shortSha(sha: string): string {
  if (sha === "unknown") return sha
  return sha.slice(0, 7)
}

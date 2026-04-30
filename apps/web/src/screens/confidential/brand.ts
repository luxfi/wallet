/**
 * Brand seam — the Foundation owns @luxfi/wallet-brand. Until that ships,
 * read window.__BRAND__ if injected by the host (via `/brand.json`), else
 * fall back to a Lux-default gateway domain.
 *
 * This is the ONLY place in the Confidential slice that reaches outside
 * for runtime config. When Foundation lands `@luxfi/wallet-brand`, swap
 * the import here in one place.
 */

interface MinimalBrand {
  gatewayDomain: string
}

declare global {
  interface Window {
    __BRAND__?: Partial<MinimalBrand>
  }
}

export function getGatewayDomain(): string {
  if (typeof window !== "undefined" && window.__BRAND__?.gatewayDomain) {
    return window.__BRAND__.gatewayDomain
  }
  return "api.lux.network"
}

export function gatewayUrl(path: string): string {
  const domain = getGatewayDomain()
  const clean = path.startsWith("/") ? path : `/${path}`
  return `https://${domain}${clean}`
}

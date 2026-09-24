/**
 * Where the Confidential slice sends its calls: the gateway `brand.json`
 * names in `api.confidential`, which serves `/v1/fhe/*` and `/v1/zkp/*`.
 * There is no fallback host. A brand that names none serves no confidential
 * transfers or proofs, and the wallet offers neither: the nav item is hidden
 * and the route says so.
 */
import { getApiUrl } from "@luxfi/wallet-brand"

/** True when this brand serves confidential transfers and proofs. */
export function confidentialServed(): boolean {
  return getApiUrl("confidential") !== ""
}

export function gatewayUrl(path: string): string {
  const base = getApiUrl("confidential")
  if (!base) throw new Error("Confidential transfers are not served on this network.")
  const clean = path.startsWith("/") ? path : `/${path}`
  return `${base}${clean}`
}

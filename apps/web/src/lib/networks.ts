/**
 * The networks this wallet offers. One list; every screen that names a chain
 * reads it.
 *
 * A network is offered when the brand serves it — `brand.json` lists it in
 * `chains.supported` and names the RPC it answers on in `rpc` — and that RPC
 * answers `eth_chainId` with the chain's own id. A listed chain whose RPC does
 * not answer is left out, because nothing can be read from it or sent to it.
 * Asking each time keeps the list equal to what is served.
 *
 * A network can be offered and still unavailable: its RPC answers reads, but
 * it is not producing blocks (`brand.json` `chains.unavailable`). It stays in
 * the list, marked, so its balances still show, and a transaction on it is
 * refused with the reason rather than signed and never mined.
 */
import { brand, getBootnodeRpcUrl, getUnavailableReason } from "@luxfi/wallet-brand"
import { chainLabel } from "./chains"

export interface Network {
  /** EIP-155 chain id. */
  id: number
  label: string
  /** Why it takes no transaction now; undefined when it does. */
  unavailable?: string
}

/** What the brand declares it serves, in `brand.json` order, before any RPC is asked. */
export function declaredNetworks(): Network[] {
  const ids = brand.supportedChainIds.length ? brand.supportedChainIds : [brand.defaultChainId]
  return ids.map((id) => ({ id, label: chainLabel(id), unavailable: getUnavailableReason(id) }))
}

const CHAIN_ID_CALL = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] })

/** True when `rpc` answers `eth_chainId` with `id` within `timeoutMs`. */
export async function answers(id: number, rpc: string, timeoutMs = 6000): Promise<boolean> {
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: CHAIN_ID_CALL,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return false
    const body = (await res.json()) as { result?: unknown }
    return typeof body.result === "string" && Number.parseInt(body.result, 16) === id
  } catch {
    return false
  }
}

/** The declared networks whose RPC answers, asked in parallel. */
export async function offeredNetworks(): Promise<Network[]> {
  const declared = declaredNetworks()
  const answered = await Promise.all(
    declared.map((n) => {
      const rpc = getBootnodeRpcUrl(n.id)
      return rpc ? answers(n.id, rpc) : Promise.resolve(false)
    }),
  )
  return declared.filter((_, i) => answered[i])
}

/**
 * Refuse a transaction on a chain that is not producing blocks. Every path
 * that signs (send, swap, bridge) calls this before it signs, so an
 * unavailable chain fails at once with its reason.
 */
export function assertAvailable(id: number | undefined): void {
  if (id === undefined) return
  const reason = getUnavailableReason(id)
  if (reason) throw new Error(`${chainLabel(id)} is unavailable. ${reason}`)
}

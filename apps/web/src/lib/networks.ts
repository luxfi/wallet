/**
 * The networks this wallet offers. One list; every screen that names a chain
 * reads it.
 *
 * A network is offered when the brand serves it — `brand.json` lists it in
 * `chains.supported` and names the RPC it answers on in `rpc` — and that RPC
 * answers `eth_chainId` with the chain's own id. A listed chain whose RPC does
 * not answer is left out, because nothing can be read from it or sent to it.
 *
 * An offered network is unavailable when its latest block is older than
 * `STALLED_AFTER_MS`: its RPC answers reads, but it is not producing blocks.
 * This is measured from the chain every time, not declared, so a chain that
 * halts is marked without anyone editing a file and a chain that resumes is
 * cleared the same way. It stays listed, marked, so its balances still show,
 * and a transaction on it is refused with the reason rather than signed and
 * never mined.
 */
import { brand, getBootnodeRpcUrl } from "@luxfi/wallet-brand"
import { chainLabel } from "./chains"

export interface Network {
  /** EIP-155 chain id. */
  id: number
  label: string
  /** Why it takes no transaction now; undefined when it does. */
  unavailable?: string
}

/**
 * A chain whose newest block is older than this is not producing blocks. Lux
 * family chains build a block only when a transaction is waiting, so the bound
 * is a day rather than minutes: an idle chain is not a halted one.
 */
export const STALLED_AFTER_MS = 24 * 60 * 60 * 1000

/** The chain ids the brand declares, in `brand.json` order, before any RPC is asked. */
export function declaredChainIds(): number[] {
  return brand.supportedChainIds.length ? brand.supportedChainIds : [brand.defaultChainId]
}

async function call(rpc: string, method: string, params: unknown[], signal: AbortSignal): Promise<unknown> {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const body = (await res.json()) as { result?: unknown }
  return body.result
}

/**
 * Ask a chain's RPC, now: `null` when it does not answer `eth_chainId` with
 * `id` within `timeoutMs`; otherwise the network, marked unavailable when its
 * latest block is older than `STALLED_AFTER_MS`.
 */
export async function measure(id: number, timeoutMs = 6000, now = Date.now()): Promise<Network | null> {
  const rpc = getBootnodeRpcUrl(id)
  if (!rpc) return null
  const signal = AbortSignal.timeout(timeoutMs)
  try {
    const [chainId, latest] = await Promise.all([
      call(rpc, "eth_chainId", [], signal),
      call(rpc, "eth_getBlockByNumber", ["latest", false], signal).catch(() => undefined),
    ])
    if (typeof chainId !== "string" || Number.parseInt(chainId, 16) !== id) return null
    const label = chainLabel(id)
    const ts = (latest as { timestamp?: unknown } | undefined)?.timestamp
    if (typeof ts !== "string") {
      return { id, label, unavailable: "Its RPC does not return its latest block." }
    }
    const at = Number.parseInt(ts, 16) * 1000
    if (now - at > STALLED_AFTER_MS) {
      const day = new Date(at).toISOString().slice(0, 10)
      return {
        id,
        label,
        unavailable: `No block since ${day}. A transaction sent to it now may never be mined.`,
      }
    }
    return { id, label }
  } catch {
    return null
  }
}

/** The declared networks whose RPC answers, asked in parallel, in `brand.json` order. */
export async function offeredNetworks(timeoutMs?: number): Promise<Network[]> {
  const measured = await Promise.all(declaredChainIds().map((id) => measure(id, timeoutMs)))
  return measured.filter((n): n is Network => n !== null)
}

/**
 * Refuse a transaction on a chain that is not producing blocks. Every path
 * that signs (send, swap, bridge) awaits this before it signs; it asks the
 * chain at that moment, so it fails at once with the reason.
 */
export async function assertAvailable(id: number | undefined): Promise<void> {
  if (id === undefined) return
  const n = await measure(id)
  if (!n) throw new Error(`${chainLabel(id)} is unavailable. Its RPC does not answer.`)
  if (n.unavailable) throw new Error(`${chainLabel(id)} is unavailable. ${n.unavailable}`)
}

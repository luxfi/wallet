/**
 * Per-chain balance fetcher for the portfolio view.
 *
 * Strategy:
 *   - EVM chains: viem publicClient(getBootnodeRpcUrl) → native balance and
 *     (later) erc20 multicall in a single round-trip.
 *   - Lux non-EVM (P/X/Q/A/B/M): JSON-RPC `*.getBalance` via the same
 *     gateway URL helper. Each chain has its own route; the gateway
 *     resolves it.
 *   - F-Chain (confidential): we never fetch plaintext — the row renders
 *     as "Hidden 🔒" with an unwrap action.
 *
 * RPC URLs come ONLY from `getBootnodeRpcUrl(chainId)`. Never empty
 * strings; never inline literals. If a URL resolution fails we skip the
 * chain rather than firing a request to "" (the Solana hazard).
 *
 * Foundation Blue owns:
 *   - `getBootnodeRpcUrl` from `@luxfi/wallet-brand`
 *   - The wagmi config + active address via `useAccount`
 *
 * This hook composes those without owning them.
 */
import { useEffect, useState } from "react"
import { createPublicClient, http, formatUnits, type Address, erc20Abi } from "viem"
import { getBootnodeRpcUrl } from "@luxfi/wallet-brand"
import { usePortfolio, type ChainPortfolio } from "../../store/portfolio"

/**
 * Lux ecosystem chain registry. Source of truth for the portfolio view.
 * Mirrors brand.json `chains.supported` + the spec's per-LLM chain set.
 */
export interface ChainEntry {
  chainId: number
  symbol: string
  name: string
  decimals: number
  kind: "evm" | "lux-p" | "lux-x" | "lux-q" | "fhe"
}

export const CHAINS: ChainEntry[] = [
  // Lux mainnet C-Chain (EVM)
  { chainId: 96369, symbol: "LUX", name: "Lux C-Chain", decimals: 18, kind: "evm" },
  { chainId: 96368, symbol: "LUX", name: "Lux C-Chain (testnet)", decimals: 18, kind: "evm" },
  // Lux non-EVM chains (P/X/Q stake/exchange/quasar)
  { chainId: 9000, symbol: "LUX", name: "Lux P-Chain", decimals: 9, kind: "lux-p" },
  { chainId: 9001, symbol: "LUX", name: "Lux X-Chain", decimals: 9, kind: "lux-x" },
  { chainId: 9003, symbol: "LUX", name: "Lux Q-Chain", decimals: 9, kind: "lux-q" },
  // Lux Z-Chain (ZK selective disclosure) — EVM-compatible
  { chainId: 200201, symbol: "LUX", name: "Lux Z-Chain", decimals: 18, kind: "evm" },
  // Lux F-Chain (FHE confidential) — encrypted balances
  { chainId: 200202, symbol: "LUX", name: "Lux F-Chain", decimals: 18, kind: "fhe" },
  // Zoo L1
  { chainId: 200200, symbol: "ZOO", name: "Zoo L1", decimals: 18, kind: "evm" },
  // Hanzo
  { chainId: 36963, symbol: "AI", name: "Hanzo", decimals: 18, kind: "evm" },
  { chainId: 36964, symbol: "AI", name: "Hanzo (testnet)", decimals: 18, kind: "evm" },
  // SPC
  { chainId: 36911, symbol: "SPC", name: "SPC", decimals: 18, kind: "evm" },
  { chainId: 36910, symbol: "SPC", name: "SPC (testnet)", decimals: 18, kind: "evm" },
  // Pars
  { chainId: 494949, symbol: "PRS", name: "Pars", decimals: 18, kind: "evm" },
  { chainId: 7071, symbol: "PRS", name: "Pars (devnet)", decimals: 18, kind: "evm" },
]

async function fetchEvmBalance(entry: ChainEntry, address: Address): Promise<ChainPortfolio | null> {
  const url = getBootnodeRpcUrl(entry.chainId)
  if (!url) return null
  const client = createPublicClient({ transport: http(url) })
  try {
    const native = await client.getBalance({ address })
    return {
      chainId: entry.chainId,
      native: {
        address: "native",
        symbol: entry.symbol,
        name: entry.name,
        decimals: entry.decimals,
        balance: formatUnits(native, entry.decimals),
      },
      tokens: [],
    }
  } catch {
    return null
  }
}

async function fetchLuxNonEvmBalance(entry: ChainEntry, address: Address): Promise<ChainPortfolio | null> {
  // Non-EVM chains use platform/AVM JSON-RPC. Foundation Blue's gateway resolves
  // /v1/rpc/{chainId} to the right chain endpoint.
  const url = getBootnodeRpcUrl(entry.chainId)
  if (!url) return null
  try {
    const method =
      entry.kind === "lux-p" ? "platform.getBalance"
      : entry.kind === "lux-x" ? "avm.getBalance"
      : "quasar.getBalance"
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: { address: address as string, assetID: entry.symbol },
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: { balance?: string } }
    const raw = data.result?.balance ?? "0"
    return {
      chainId: entry.chainId,
      native: {
        address: "native",
        symbol: entry.symbol,
        name: entry.name,
        decimals: entry.decimals,
        balance: formatUnits(BigInt(raw), entry.decimals),
      },
      tokens: [],
    }
  } catch {
    return null
  }
}

function placeholderFheBalance(entry: ChainEntry): ChainPortfolio {
  // Confidential chain — we don't fetch plaintext. Render as "Hidden 🔒".
  return {
    chainId: entry.chainId,
    native: {
      address: "native",
      symbol: entry.symbol,
      name: entry.name,
      decimals: entry.decimals,
      balance: "hidden",
    },
    tokens: [],
  }
}

export function useChainBalances(address: Address | undefined): {
  perChain: ChainPortfolio[]
  isLoading: boolean
  refresh: () => void
} {
  const setPortfolio = usePortfolio((s) => s.setPortfolio)
  const setLoading = usePortfolio((s) => s.setLoading)
  const perChain = usePortfolio((s) => s.perChain)
  const isLoading = usePortfolio((s) => s.isLoading)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!address) return
    let cancelled = false
    setLoading(true)
    Promise.all(
      CHAINS.map((entry) => {
        if (entry.kind === "evm") return fetchEvmBalance(entry, address)
        if (entry.kind === "fhe") return Promise.resolve(placeholderFheBalance(entry))
        return fetchLuxNonEvmBalance(entry, address)
      }),
    ).then((results) => {
      if (cancelled) return
      const filled = results.filter((r): r is ChainPortfolio => r !== null)
      // Total USD wired up in useTotalUSD; here we only commit balances.
      setPortfolio(filled, 0)
    })
    return () => {
      cancelled = true
    }
  }, [address, tick, setPortfolio, setLoading])

  return { perChain, isLoading, refresh: () => setTick((t) => t + 1) }
}

export const ERC20_ABI = erc20Abi

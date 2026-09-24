/**
 * Per-chain balance fetcher for the portfolio view.
 *
 * The chains are the brand's served networks (`lib/networks`), every one an
 * EVM chain with a declared RPC: a native balance read through viem. A chain
 * whose RPC does not answer returns no row. The list is not written here, so
 * the portfolio asks exactly the chains the brand serves.
 *
 * A chain that is not producing blocks still answers reads, so its balance is
 * shown, named as unavailable.
 */
import { useEffect, useState } from "react"
import { createPublicClient, http, formatUnits, type Address, erc20Abi } from "viem"
import { getBootnodeRpcUrl } from "@luxfi/wallet-brand"
import { usePortfolio, type ChainPortfolio } from "../../store/portfolio"
import { evmChainDef } from "../../lib/chains"
import { declaredNetworks, type Network } from "../../lib/networks"

async function fetchBalance(n: Network, address: Address): Promise<ChainPortfolio | null> {
  const url = getBootnodeRpcUrl(n.id)
  const def = evmChainDef(n.id)
  if (!url || !def) return null
  const { symbol, decimals } = def.nativeCurrency
  const client = createPublicClient({ transport: http(url) })
  try {
    const native = await client.getBalance({ address })
    return {
      chainId: n.id,
      native: {
        address: "native",
        symbol,
        name: n.unavailable ? `${n.label} (unavailable)` : n.label,
        decimals,
        balance: formatUnits(native, decimals),
      },
      tokens: [],
    }
  } catch {
    return null
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
    Promise.all(declaredNetworks().map((n) => fetchBalance(n, address))).then((results) => {
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

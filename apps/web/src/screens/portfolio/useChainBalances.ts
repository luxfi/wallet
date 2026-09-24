/**
 * Per-chain balance fetcher for the portfolio view.
 *
 * The chains are the offered networks (`useMeasuredNetworks`): the brand's
 * declared chains whose RPC answered with their own id. Each is read through
 * viem once it has answered; a chain that did not answer is never asked, so
 * the portfolio sends nothing to an RPC that is down.
 *
 * A chain that is not producing blocks still answers reads, so its balance is
 * shown, named as unavailable.
 */
import { useEffect, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { createPublicClient, http, formatUnits, type Address, erc20Abi } from "viem"
import { getBootnodeRpcUrl } from "@luxfi/wallet-brand"
import { usePortfolio, type ChainPortfolio } from "../../store/portfolio"
import { evmChainDef } from "../../lib/chains"
import { type Network } from "../../lib/networks"
import { useMeasuredNetworks } from "../../hooks/useNetworks"

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
  const perChain = usePortfolio((s) => s.perChain)
  const { list, settled } = useMeasuredNetworks()
  const [tick, setTick] = useState(0)

  // One read per offered chain, started as soon as that chain has answered.
  const { rows, fetching } = useQueries({
    queries: list.map((n) => ({
      queryKey: ["balance", n.id, n.unavailable ?? "", address, tick],
      queryFn: () => fetchBalance(n, address as Address),
      enabled: !!address,
      staleTime: 30_000,
      retry: false,
    })),
    combine: (results) => ({
      rows: results.flatMap((r) => (r.data ? [r.data] : [])),
      fetching: results.some((r) => r.isFetching),
    }),
  })

  const key = rows.map((r) => `${r.chainId}:${r.native.balance}:${r.native.name}`).join("|")
  useEffect(() => {
    // Total USD wired up in useTotalUSD; here we only commit balances.
    setPortfolio(rows, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPortfolio])

  return {
    perChain,
    isLoading: !!address && (!settled || fetching),
    refresh: () => setTick((t) => t + 1),
  }
}

export const ERC20_ABI = erc20Abi

/**
 * The offered networks (see `lib/networks`), each chain measured on its own
 * and kept for five minutes. A chain is listed once its RPC has answered, so a
 * fast chain shows at once, a slow one when it answers, and one that does not
 * answer never does. Nothing is listed on the strength of `brand.json` alone.
 */
import { useQueries } from "@tanstack/react-query"
import { chainLabel } from "../lib/chains"
import { declaredChainIds, measure, type Network } from "../lib/networks"

export interface Measured {
  /** The chains whose RPC answered with their own id, in `brand.json` order. */
  list: Network[]
  /** The chains whose RPC was asked and did not answer. */
  down: number[]
  /** Every declared chain has been asked. */
  settled: boolean
}

export function useMeasuredNetworks(): Measured {
  const ids = declaredChainIds()
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["network", id],
      queryFn: () => measure(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
    combine: (results) => ({
      list: results.flatMap((r) => (r.data ? [r.data] : [])),
      down: ids.filter((_, i) => results[i].isSuccess && results[i].data === null),
      settled: results.every((r) => !r.isPending),
    }),
  })
}

/** The offered networks: the declared chains whose RPC answered. */
export function useNetworks(): Network[] {
  return useMeasuredNetworks().list
}

/**
 * The active chain as a `Network`. When its RPC did not answer it is not
 * offered, and it comes back marked unavailable for that reason, so the screen
 * says so instead of showing a chain nothing reaches. While it is still being
 * asked it comes back unmarked.
 */
export function useActiveNetwork(chainId: number): Network {
  const { list, down } = useMeasuredNetworks()
  const offered = list.find((n) => n.id === chainId)
  if (offered) return offered
  const label = chainLabel(chainId)
  return down.includes(chainId)
    ? { id: chainId, label, unavailable: "Its RPC does not answer." }
    : { id: chainId, label }
}

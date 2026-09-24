/**
 * `useNetworks()` — the offered networks (see `lib/networks`), asked once and
 * kept for five minutes. Until the RPCs have answered it returns the declared
 * list, so a switcher never renders empty; once they have, a network whose
 * RPC did not answer is gone from it.
 */
import { useQuery } from "@tanstack/react-query"
import { chainLabel } from "../lib/chains"
import { declaredNetworks, offeredNetworks, type Network } from "../lib/networks"

export function useNetworks(): Network[] {
  const { data } = useQuery({
    queryKey: ["networks"],
    queryFn: offeredNetworks,
    staleTime: 5 * 60_000,
  })
  return data ?? declaredNetworks()
}

/**
 * The active chain as a `Network`. When its RPC did not answer it is no longer
 * offered, and it comes back marked unavailable for that reason, so the screen
 * says so instead of showing a chain nothing reaches.
 */
export function useActiveNetwork(chainId: number): Network {
  const networks = useNetworks()
  return (
    networks.find((n) => n.id === chainId) ?? {
      id: chainId,
      label: chainLabel(chainId),
      unavailable: "Its RPC does not answer.",
    }
  )
}

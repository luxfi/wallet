/**
 * Asset feed for the Send / Swap / Bridge pickers.
 *
 * Auth-Portfolio Blue owns balance fetching; it writes per-chain balances
 * into the portfolio store keyed by numeric EIP-155 id, in major-unit strings.
 * This adapter reshapes that feed into the string-keyed, smallest-unit `Asset`
 * rows the pickers expect. Chains the canonical registry doesn't map by
 * EIP-155 id are skipped — they have no EVM send path here.
 */
import { useMemo } from "react"
import { chainByEvmId, parseUnits, type Asset } from "../../lib/asset"
import { usePortfolio, type TokenBalance } from "../../store/portfolio"

function toSmallestUnits(major: string, decimals: number): string | null {
  try {
    return parseUnits(major, decimals).toString()
  } catch {
    return null
  }
}

export function usePortfolioAssets(): Asset[] {
  const perChain = usePortfolio((s) => s.perChain)

  return useMemo(() => {
    const assets: Asset[] = []
    for (const cp of perChain) {
      const chain = chainByEvmId(cp.chainId)
      if (!chain) continue

      const add = (t: TokenBalance, contract?: `0x${string}`) => {
        const balance = toSmallestUnits(t.balance, t.decimals)
        if (balance === null) return
        assets.push({
          id: contract ? `${chain.id}:${contract}` : `${chain.id}:native`,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          chainId: chain.id,
          contract,
          balance,
        })
      }

      add(cp.native)
      for (const token of cp.tokens) add(token, token.address as `0x${string}`)
    }
    return assets
  }, [perChain])
}

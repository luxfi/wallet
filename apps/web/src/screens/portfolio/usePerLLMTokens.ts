/**
 * Per-LLM token balances on the Zoo chain.
 *
 * Zoo L1 emits a chain-specific token per model variant
 * (ZEN4-NANO/MINI/LARGE/ULTRA). The contract addresses live in a Zoo-published
 * registry; for now we hard-code the four canonical entries against Zoo
 * mainnet (chainId 200200). White-labels can override via brand.json.
 *
 * Returns [] when not on a Zoo chain — keeping the consumer trivial.
 */
import { useEffect, useState } from "react"
import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem"
import { getBootnodeRpcUrl } from "@luxfi/wallet-brand"
import type { TokenBalance } from "../../store/portfolio"

const ZOO_CHAIN_ID = 200200

interface PerLLMEntry {
  address: Address
  symbol: string
  name: string
}

// Source: zoo-per-llm-chains paper §3 (canonical addresses).
// White-labels override via brand.runtime.perLLMTokens (Foundation slice).
const PER_LLM_TOKENS: PerLLMEntry[] = [
  { address: "0x0000000000000000000000000000000000004041", symbol: "ZEN4-NANO", name: "ZEN4 Nano" },
  { address: "0x0000000000000000000000000000000000004042", symbol: "ZEN4-MINI", name: "ZEN4 Mini" },
  { address: "0x0000000000000000000000000000000000004043", symbol: "ZEN4-LARGE", name: "ZEN4 Large" },
  { address: "0x0000000000000000000000000000000000004044", symbol: "ZEN4-ULTRA", name: "ZEN4 Ultra" },
]

export function usePerLLMTokens(chainId: number, address: Address | undefined): TokenBalance[] {
  const [tokens, setTokens] = useState<TokenBalance[]>([])

  useEffect(() => {
    if (chainId !== ZOO_CHAIN_ID || !address) {
      setTokens([])
      return
    }
    const url = getBootnodeRpcUrl(chainId)
    if (!url) return

    let cancelled = false
    const client = createPublicClient({ transport: http(url) })

    Promise.all(
      PER_LLM_TOKENS.map(async (t) => {
        try {
          const balance = await client.readContract({
            address: t.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          })
          return {
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            decimals: 18,
            balance: formatUnits(balance, 18),
          } satisfies TokenBalance
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setTokens(results.filter((r): r is TokenBalance => r !== null && Number(r.balance) > 0))
    })

    return () => {
      cancelled = true
    }
  }, [chainId, address])

  return tokens
}

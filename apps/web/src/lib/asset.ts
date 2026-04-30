/**
 * Asset and chain models shared across Send / Receive / Swap / Bridge / Portfolio.
 *
 * The portfolio screen (Foundation slice) is the canonical source of asset
 * rows; Swap + Bridge re-use this `Asset` shape verbatim so AssetPicker /
 * TokenSelector can render the same data the portfolio renders. When
 * Foundation merges its asset module we keep this file as the stable type
 * contract — Foundation can re-export from here, or we collapse into one
 * module (one obvious way).
 */

export type ChainKind = "evm" | "lux-pchain" | "lux-xchain" | "solana"

export interface Chain {
  /** Stable id used in URLs, QR prefixes, and store keys. */
  id: string
  /** Human label shown in UI. */
  label: string
  kind: ChainKind
  /** EIP-155 chain id for EVM chains; undefined otherwise. */
  evmChainId?: number
  /** Native token symbol displayed alongside fee previews. */
  nativeSymbol: string
  /** BIP-44 coin_type per SLIP-0044. Lux P/X = 9000, EVM = 60, Solana = 501. */
  bip44Coin: number
  /** Bech32 HRP for Lux P/X chains; e.g. "lux". Undefined otherwise. */
  bech32Hrp?: string
}

export const CHAINS: Record<string, Chain> = {
  "lux-c": {
    id: "lux-c",
    label: "Lux C-Chain",
    kind: "evm",
    evmChainId: 96369,
    nativeSymbol: "LUX",
    bip44Coin: 60,
  },
  "lux-p": {
    id: "lux-p",
    label: "Lux P-Chain",
    kind: "lux-pchain",
    nativeSymbol: "LUX",
    bip44Coin: 9000,
    bech32Hrp: "lux",
  },
  "lux-x": {
    id: "lux-x",
    label: "Lux X-Chain",
    kind: "lux-xchain",
    nativeSymbol: "LUX",
    bip44Coin: 9000,
    bech32Hrp: "lux",
  },
  "lux-b": {
    id: "lux-b",
    label: "Lux B-Chain",
    kind: "evm",
    evmChainId: 36963,
    nativeSymbol: "LUX",
    bip44Coin: 60,
  },
  "lux-z": {
    id: "lux-z",
    label: "Lux Z-Chain",
    kind: "evm",
    evmChainId: 36911,
    nativeSymbol: "LUX",
    bip44Coin: 60,
  },
  "lux-f": {
    id: "lux-f",
    label: "Lux F-Chain",
    kind: "evm",
    evmChainId: 494949,
    nativeSymbol: "LUX",
    bip44Coin: 60,
  },
  "zoo-l1": {
    id: "zoo-l1",
    label: "Zoo L1",
    kind: "evm",
    evmChainId: 200200,
    nativeSymbol: "ZOO",
    bip44Coin: 60,
  },
  ethereum: {
    id: "ethereum",
    label: "Ethereum",
    kind: "evm",
    evmChainId: 1,
    nativeSymbol: "ETH",
    bip44Coin: 60,
  },
  arbitrum: {
    id: "arbitrum",
    label: "Arbitrum",
    kind: "evm",
    evmChainId: 42161,
    nativeSymbol: "ETH",
    bip44Coin: 60,
  },
  base: {
    id: "base",
    label: "Base",
    kind: "evm",
    evmChainId: 8453,
    nativeSymbol: "ETH",
    bip44Coin: 60,
  },
  polygon: {
    id: "polygon",
    label: "Polygon",
    kind: "evm",
    evmChainId: 137,
    nativeSymbol: "MATIC",
    bip44Coin: 60,
  },
  avalanche: {
    id: "avalanche",
    label: "Avalanche C-Chain",
    kind: "evm",
    evmChainId: 43114,
    nativeSymbol: "AVAX",
    bip44Coin: 60,
  },
  solana: {
    id: "solana",
    label: "Solana",
    kind: "solana",
    nativeSymbol: "SOL",
    bip44Coin: 501,
  },
}

export const CHAIN_LIST: Chain[] = Object.values(CHAINS)

export interface Asset {
  /** Stable id, e.g. `"lux-c:native"`, `"zoo-l1:0xabc…"`. */
  id: string
  symbol: string
  name: string
  /** Decimals for parsing user input. */
  decimals: number
  chainId: string
  /** Smart-contract address for ERC-20-style assets; undefined for natives. */
  contract?: `0x${string}`
  /** Balance in smallest unit (string to preserve precision). */
  balance: string
  /** Spot USD value used for the inline quote; undefined if unknown. */
  usdPrice?: number
  /** Optional URL for the icon. */
  iconUrl?: string
}

/** Format a smallest-unit balance as a decimal string with `decimals` places. */
export function formatUnits(raw: string, decimals: number): string {
  if (!raw) return "0"
  const neg = raw.startsWith("-")
  const s = neg ? raw.slice(1) : raw
  if (decimals === 0) return (neg ? "-" : "") + s
  const padded = s.padStart(decimals + 1, "0")
  const head = padded.slice(0, padded.length - decimals)
  const tail = padded.slice(padded.length - decimals).replace(/0+$/, "")
  return (neg ? "-" : "") + (tail ? `${head}.${tail}` : head)
}

/** Parse a human-entered decimal string into smallest units. Throws on garbage. */
export function parseUnits(input: string, decimals: number): bigint {
  const trimmed = input.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("invalid decimal")
  }
  const neg = trimmed.startsWith("-")
  const body = neg ? trimmed.slice(1) : trimmed
  const [head, tail = ""] = body.split(".")
  if (tail.length > decimals) throw new Error("too many fractional digits")
  const padded = tail.padEnd(decimals, "0")
  const big = BigInt((head || "0") + padded)
  return neg ? -big : big
}

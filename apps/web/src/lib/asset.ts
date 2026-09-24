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

import { evmChainDef } from "./chains"

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

/**
 * An EVM chain, named from the canonical registry (`@luxwallet/chains`) by its
 * EIP-155 id, so its label and native symbol are the ones that id carries.
 */
function evm(id: string, evmChainId: number): Chain {
  const def = evmChainDef(evmChainId)
  return {
    id,
    label: def?.name ?? `Chain ${evmChainId}`,
    kind: "evm",
    evmChainId,
    nativeSymbol: def?.nativeCurrency.symbol ?? "",
    bip44Coin: 60,
  }
}

/**
 * Every chain the wallet can derive an address for and sign on. This is the
 * catalog, not what a person is offered — `offeredChains()` narrows it to the
 * networks the brand serves. The Lux P/X-Chain and Solana entries stay for
 * derivation; no brand serves them, so no screen lists them.
 */
export const CHAINS: Record<string, Chain> = {
  "lux-c": evm("lux-c", 96369),
  "lux-c-testnet": evm("lux-c-testnet", 96368),
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
  "zoo-l1": evm("zoo-l1", 200200),
  "zoo-testnet": evm("zoo-testnet", 200201),
  hanzo: evm("hanzo", 36963),
  ethereum: evm("ethereum", 1),
  arbitrum: evm("arbitrum", 42161),
  base: evm("base", 8453),
  polygon: evm("polygon", 137),
  avalanche: evm("avalanche", 43114),
  solana: {
    id: "solana",
    label: "Solana",
    kind: "solana",
    nativeSymbol: "SOL",
    bip44Coin: 501,
  },
}

export const CHAIN_LIST: Chain[] = Object.values(CHAINS)

/**
 * Resolve a chain by its EIP-155 id. The portfolio store keys balances by
 * numeric chain id (96369); Send/Swap/Bridge key assets by the string id
 * ("lux-c"). This is the one crossing between those two id spaces.
 */
export function chainByEvmId(evmChainId: number): Chain | undefined {
  return CHAIN_LIST.find((c) => c.evmChainId === evmChainId)
}

/** The catalog chains among `networks` (the offered list), in its order. */
export function offeredChains(networks: ReadonlyArray<{ id: number }>): Chain[] {
  return networks.flatMap((n) => {
    const c = chainByEvmId(n.id)
    return c ? [c] : []
  })
}

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

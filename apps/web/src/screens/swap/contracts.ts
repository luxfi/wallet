/**
 * Swap contract ABIs and per-chain addresses.
 *
 * Naming convention is LOCKED per spec:
 *   AMM v2/v3 → routers exposing UniswapV3-style `exactInputSingle`.
 *   DEX v4    → Lux native DEX router (PoolManager-pattern, hook-aware).
 *
 * The ABIs here are the minimal surface useSwapQuote / useSwapExecute call.
 * The full contracts pkg lives at `~/work/lux/exchange/contracts` and ships
 * separately; we don't pull it in to keep the wallet build self-contained.
 *
 * Address fallbacks are zero — the gateway is the source of truth at runtime
 * (it returns the correct router per chain in its quote). The constants here
 * are only used by the on-chain QuoterV2 fallback when the gateway is offline.
 *
 *  chain ids (per top-level memory):
 *   8675309 = mainnet, 8675310 = testnet, 8675311 = devnet.
 *
 * Lux EVM chain ids:
 *   96369   = Lux C-Chain mainnet
 *   200200  = Zoo L1
 */
import type { Abi, Address } from "viem"

/** UniswapV3-style QuoterV2 — returns `(amountOut, ...)` for a single hop. */
export const QUOTER_V2_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const satisfies Abi

/** Minimal SwapRouter02 surface — exactInputSingle (single-hop v3). */
export const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const satisfies Abi

/** Lux Teleport lock contract — minimal surface. The cross-chain mint is signed
 * by the bridge committee, not the user. We only need lockToken / lockNative. */
export const TELEPORT_LOCK_ABI = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "destChainId", type: "string" },
      { name: "recipient", type: "address" },
    ],
    name: "lockToken",
    outputs: [{ name: "messageId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "destChainId", type: "string" },
      { name: "recipient", type: "address" },
    ],
    name: "lockNative",
    outputs: [{ name: "messageId", type: "bytes32" }],
    stateMutability: "payable",
    type: "function",
  },
] as const satisfies Abi

const ZERO: Address = "0x0000000000000000000000000000000000000000"

/**
 * Canonical QuoterV2 address per EVM chain. Empty entries return ZERO; the
 * useSwapQuote fallback short-circuits when the address is zero so we don't
 * issue a no-op RPC call.
 */
const QUOTERS: Record<number, Address> = {
  // Lux C-Chain mainnet — placeholder; gateway is the source of truth in prod.
  96369: ZERO,
  // Zoo L1
  200200: ZERO,
  //  mainnet/testnet/devnet
  8675309: ZERO,
  8675310: ZERO,
  8675311: ZERO,
  // Ethereum mainnet — Uniswap QuoterV2 (only used if user routes via L1).
  1: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
}

const ROUTERS: Record<number, Address> = {
  96369: ZERO,
  200200: ZERO,
  8675309: ZERO,
  8675310: ZERO,
  8675311: ZERO,
  // Uniswap SwapRouter02 mainnet.
  1: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
}

/**
 * Per-chain Lux Teleport lock contract. The same address is deployed on all
 * Teleport-supported EVM chains via the immutable factory pattern; until the
 * factory is registered we use ZERO and let the gateway override per quote.
 */
const TELEPORT_LOCKS: Record<string, Address> = {
  "lux-c": ZERO,
  "lux-b": ZERO,
  "lux-z": ZERO,
  "zoo-l1": ZERO,
  ethereum: ZERO,
  polygon: ZERO,
  arbitrum: ZERO,
  base: ZERO,
  avalanche: ZERO,
}

export function getQuoterAddress(chainId: number): Address | undefined {
  const a = QUOTERS[chainId]
  return a && a !== ZERO ? a : undefined
}

export function getRouterAddress(chainId: number): Address | undefined {
  const a = ROUTERS[chainId]
  return a && a !== ZERO ? a : undefined
}

export function getTeleportLockAddress(chainId: string): Address {
  return TELEPORT_LOCKS[chainId] ?? ZERO
}

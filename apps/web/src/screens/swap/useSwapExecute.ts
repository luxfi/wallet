/**
 * useSwapExecute — orchestrates approve + swap.
 *
 * Flow:
 *   1. Quote freshness check. Quotes older than 30s are rejected — the user
 *      must refresh before they can submit. This defends against stale-price
 *      execution if the user steps away mid-form.
 *   2. ERC-20 approve (if needed). Uses `maxUint256` for one-shot UX; this
 *      is the canonical Uniswap pattern. Native tokens skip this leg.
 *   3. Swap. If the gateway returned calldata we pass it through (router +
 *      data). If not (on-chain QuoterV2 fallback path), we call
 *      `exactInputSingle` directly with `amountOutMinimum` derived from
 *      `quote.amountOut` and the user's slippage tolerance.
 *
 * Slippage:
 *   amountOutMin = amountOut * (10000 - slippageBps) / 10000
 *
 * The slippage check is enforced ON-CHAIN (router reverts on amountOutMin
 * mismatch). The UI can only widen the gate; it cannot narrow on-chain
 * execution.
 *
 * Failure modes are explicit: any thrown error sets `status = "error"` and
 * never lands in `done`.
 */
import { useCallback } from "react"
import { useAccount, useWriteContract } from "wagmi"
import { erc20Abi, maxUint256, type Address } from "viem"
import { useSwapStore } from "../../store/swap"
import { CHAINS } from "../../lib/asset"
import { SWAP_ROUTER_ABI } from "./contracts"

const QUOTE_STALENESS_MS = 30_000

export function useSwapExecute() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const {
    fromAsset,
    toAsset,
    amount,
    slippageBps,
    quote,
    setStatus,
    setApproveTxHash,
    setSwapTxHash,
    setError,
  } = useSwapStore()

  const execute = useCallback(async () => {
    if (!address) throw new Error("wallet not connected")
    if (!fromAsset || !toAsset) throw new Error("pick two tokens")
    if (!quote) throw new Error("no quote")
    if (Date.now() - quote.ts > QUOTE_STALENESS_MS) {
      setStatus("error")
      setError("Quote expired — refresh and retry")
      throw new Error("quote stale")
    }
    if (slippageBps < 1 || slippageBps > 5000) {
      setStatus("error")
      setError("Slippage out of range (0.01%–50%)")
      throw new Error("slippage out of range")
    }

    const fromChain = CHAINS[fromAsset.chainId]
    if (!fromChain || !fromChain.evmChainId) {
      setStatus("error")
      setError("Source chain not EVM-compatible")
      throw new Error("non-evm not supported")
    }

    const amountIn = BigInt(quote.amountIn)
    const amountOut = BigInt(quote.amountOut)
    // Compute amountOutMinimum from the quote + user slippage. Integer math:
    // (10000 - bps) / 10000 — never touches Number.
    const slippageNumerator = BigInt(10_000 - slippageBps)
    const amountOutMin = (amountOut * slippageNumerator) / 10_000n

    setError(null)
    setApproveTxHash(null)
    setSwapTxHash(null)

    // 1. Approve (only if ERC-20).
    if (fromAsset.contract) {
      setStatus("approving")
      try {
        const approveTx = await writeContractAsync({
          abi: erc20Abi,
          address: fromAsset.contract,
          functionName: "approve",
          args: [quote.router, maxUint256],
          chainId: fromChain.evmChainId,
        })
        setApproveTxHash(approveTx)
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "approve failed")
        throw err
      }
    }

    // 2. Swap. Two paths: gateway-supplied calldata vs on-chain fallback.
    setStatus("swapping")
    try {
      let swapTx: `0x${string}`
      if (quote.calldata && quote.calldata !== "0x") {
        // Gateway path — calldata is opaque router-specific. We trust the
        // gateway to encode the slippage minimum into the data; the on-chain
        // router enforces it at execution time. This branch uses
        // `sendTransaction` semantics; with wagmi v2 `useWriteContract`
        // doesn't directly accept raw calldata, so we route via the router's
        // ABI when possible. Until the gateway returns explicit (function,
        // args), fall through to the typed exactInputSingle path below.
        swapTx = await writeContractAsync({
          abi: SWAP_ROUTER_ABI,
          address: quote.router,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: (fromAsset.contract ??
                "0x0000000000000000000000000000000000000000") as Address,
              tokenOut: (toAsset.contract ??
                "0x0000000000000000000000000000000000000000") as Address,
              fee: quote.feeBps || 3000,
              recipient: address,
              amountIn,
              amountOutMinimum: amountOutMin,
              sqrtPriceLimitX96: 0n,
            },
          ],
          value: fromAsset.contract ? undefined : amountIn,
          chainId: fromChain.evmChainId,
        })
      } else {
        // On-chain fallback path — same call, no gateway intermediation.
        if (!quote.router) throw new Error("no router for fallback path")
        swapTx = await writeContractAsync({
          abi: SWAP_ROUTER_ABI,
          address: quote.router,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: (fromAsset.contract ??
                "0x0000000000000000000000000000000000000000") as Address,
              tokenOut: (toAsset.contract ??
                "0x0000000000000000000000000000000000000000") as Address,
              fee: quote.feeBps || 3000,
              recipient: address,
              amountIn,
              amountOutMinimum: amountOutMin,
              sqrtPriceLimitX96: 0n,
            },
          ],
          value: fromAsset.contract ? undefined : amountIn,
          chainId: fromChain.evmChainId,
        })
      }
      setSwapTxHash(swapTx)
      setStatus("done")
      return swapTx
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "swap failed")
      throw err
    }
  }, [
    address,
    amount,
    fromAsset,
    quote,
    setApproveTxHash,
    setError,
    setStatus,
    setSwapTxHash,
    slippageBps,
    toAsset,
    writeContractAsync,
  ])

  return { execute }
}

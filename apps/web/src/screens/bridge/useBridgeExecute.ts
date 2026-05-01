/**
 * Execute a bridge. Lux Teleport is the canonical cross-chain primitive:
 *
 *   1. Source-chain lock: write to the Teleport lock contract on `fromChainId`.
 *      For ERC-20 we approve + lock; native is value-only. The lock contract
 *      emits a Warp message (BLS aggregated) that the M-Chain validators
 *      observe.
 *
 *   2. Threshold ceremony: M-Chain runs a 2-of-3 MPC ceremony to authorise the
 *      destination mint. We poll the gateway for ceremony status; the
 *      gateway is the only client-visible vantage on the ceremony.
 *
 *   3. Destination mint: gateway returns the mint tx hash once the M-Chain
 *      ceremony submits it. We surface that hash and mark `done`.
 *
 * The mint tx is signed by the bridge committee, NOT the user — the user only
 * signs leg #1. This is intentional: it is what makes Lux Teleport feel like
 * a transfer rather than two transactions.
 *
 * Threat model:
 *   - The lock tx pins (destChainId, recipient) on chain. A compromised
 *     gateway cannot redirect funds — destChainId is committed in the lock
 *     calldata before the committee even sees the message.
 *   - Ceremony polling URL is built from `brand.gatewayDomain` (immutable
 *     per build, ConfigMap-overridden per environment).
 *   - Quote freshness check: stale > 30s quotes rejected so users can't sign
 *     a lock against a price that's already moved.
 */
import { useCallback } from "react"
import { useAccount, useWriteContract } from "wagmi"
import { erc20Abi, maxUint256, type Address } from "viem"
import { brand } from "@luxfi/wallet-brand"
import { useBridgeStore } from "../../store/bridge"
import { CHAINS, parseUnits } from "../../lib/asset"
import { TELEPORT_LOCK_ABI, getTeleportLockAddress } from "../swap/contracts"

const CEREMONY_POLL_INTERVAL_MS = 2_000
const CEREMONY_POLL_TIMEOUT_MS = 5 * 60_000
const QUOTE_STALENESS_MS = 30_000

interface CeremonyState {
  status: "pending" | "signing" | "minted" | "failed"
  /** Destination-chain mint tx hash; only set when status = "minted". */
  mintTx?: string
  reason?: string
}

export function useBridgeExecute() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const {
    fromChainId,
    toChainId,
    asset,
    amount,
    recipient,
    quote,
    setStatus,
    setLockTxHash,
    setMintTxHash,
    setError,
  } = useBridgeStore()

  const execute = useCallback(async () => {
    if (!address) throw new Error("wallet not connected")
    if (!asset || !quote) throw new Error("quote not ready")
    if (Date.now() - quote.ts > QUOTE_STALENESS_MS) {
      setStatus("error")
      setError("Quote expired — refresh and retry")
      throw new Error("quote stale")
    }
    const fromChain = CHAINS[fromChainId]
    const toChain = CHAINS[toChainId]
    if (!fromChain || !toChain) throw new Error("unknown chain")
    if (fromChain.kind !== "evm" || !fromChain.evmChainId) {
      // Non-EVM source chain: Lux P/X bridges go through a different path
      // (the `@l.x/api` PVM client). Out of scope for this slice.
      setStatus("error")
      setError(`Bridging from ${fromChain.label} not supported in web yet`)
      throw new Error(`bridging from ${fromChain.label} not supported`)
    }

    let amountWei: bigint
    try {
      amountWei = parseUnits(amount, asset.decimals)
    } catch {
      setStatus("error")
      setError("Invalid amount")
      throw new Error("invalid amount")
    }

    const lockContract: Address = getTeleportLockAddress(fromChainId)
    if (lockContract === "0x0000000000000000000000000000000000000000") {
      setStatus("error")
      setError(
        `Teleport lock contract not yet deployed on ${fromChain.label}`,
      )
      throw new Error("no teleport lock contract")
    }
    const dest = (recipient || address) as Address

    // 1. Approve (if ERC-20) + lock.
    setStatus("locking")
    setError(null)
    let lockTx: `0x${string}`
    try {
      if (asset.contract) {
        // Trust on first use: max-uint approval to the lock contract. Yellow
        // risk by signing-modal classification; intentional for the canonical
        // bridge flow. (Future: scoped allowance.)
        await writeContractAsync({
          abi: erc20Abi,
          address: asset.contract,
          functionName: "approve",
          args: [lockContract, maxUint256],
          chainId: fromChain.evmChainId,
        })
        lockTx = await writeContractAsync({
          abi: TELEPORT_LOCK_ABI,
          address: lockContract,
          functionName: "lockToken",
          args: [asset.contract, amountWei, toChainId, dest],
          chainId: fromChain.evmChainId,
        })
      } else {
        lockTx = await writeContractAsync({
          abi: TELEPORT_LOCK_ABI,
          address: lockContract,
          functionName: "lockNative",
          args: [toChainId, dest],
          value: amountWei,
          chainId: fromChain.evmChainId,
        })
      }
      setLockTxHash(lockTx)
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "lock failed")
      throw err
    }

    // 2. Wait for M-Chain MPC ceremony.
    setStatus("signing")
    let ceremony: CeremonyState
    try {
      ceremony = await pollCeremony(lockTx, fromChainId)
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "ceremony failed")
      throw err
    }
    if (ceremony.status === "failed" || !ceremony.mintTx) {
      setStatus("error")
      setError(ceremony.reason ?? "ceremony failed")
      throw new Error(ceremony.reason ?? "ceremony failed")
    }

    // 3. Mint on destination — bridge committee already submitted; we just
    // record the hash.
    setStatus("minting")
    setMintTxHash(ceremony.mintTx)

    setStatus("done")
    return { lockTx, mintTx: ceremony.mintTx }
  }, [
    address,
    amount,
    asset,
    fromChainId,
    quote,
    recipient,
    setError,
    setLockTxHash,
    setMintTxHash,
    setStatus,
    toChainId,
    writeContractAsync,
  ])

  return { execute }
}

async function pollCeremony(
  lockTx: string,
  fromChainId: string,
): Promise<CeremonyState> {
  const gateway = brand.gatewayDomain
  if (!gateway) {
    return { status: "failed", reason: "bridge gateway not configured" }
  }
  const url = `https://${gateway}/v1/bridge/ceremony?lockTx=${lockTx}&from=${fromChainId}`
  const start = Date.now()
  while (Date.now() - start < CEREMONY_POLL_TIMEOUT_MS) {
    try {
      const res = await fetch(url, { cache: "no-cache" })
      if (res.ok) {
        const state = (await res.json()) as CeremonyState
        if (state.status === "minted" || state.status === "failed") return state
      }
    } catch {
      // transient — retry
    }
    await new Promise((r) => setTimeout(r, CEREMONY_POLL_INTERVAL_MS))
  }
  return { status: "failed", reason: "ceremony timed out (>5m)" }
}

/**
 * useStake — submits AddDelegator (and AddValidator) transactions on the
 * Lux P-Chain.
 *
 * Trust boundaries:
 *   - Tx construction happens via the Foundation-supplied signer
 *     (window.__luxWallet.signPChainTx). This screen never touches private
 *     keys. We pass an unsigned-tx descriptor; the signer encodes + signs.
 *   - Broadcast is delegated to Foundation's broadcast helper which talks
 *     to the canonical P-Chain RPC. Defends against the screen sending
 *     to a wrong endpoint via a poisoned brand.json.
 *   - Amount is BigInt nLUX (1 LUX = 1e9 nLUX). No floats. No string
 *     concatenation. Min/max enforced before submission.
 *
 * The unsigned-tx descriptor uses the @luxfi/wallet canonical schema so
 * Foundation's signer can route it to either the EVM Coreth path (if the
 * user holds C-Chain LUX and we need to import via X-Chain) or the
 * native P-Chain path. Both terminate in the same AddDelegatorTx output.
 */

import { useCallback, useState } from "react"
import { getAccount } from "../_shared/account"
import { loadRuntimeConfig } from "../_shared/runtime"
import {
  PCHAIN_MAX_STAKE_DURATION_SECONDS,
  PCHAIN_MIN_DELEGATOR_STAKE_NLUX,
  PCHAIN_MIN_STAKE_DURATION_SECONDS,
  PCHAIN_MIN_VALIDATOR_STAKE_NLUX,
  stakeStore,
} from "../../store/stake"

export type StakeRole = "delegator" | "validator"

export interface StakeInput {
  role: StakeRole
  nodeID: string
  /** Amount in nLUX. */
  amountNLux: bigint
  /** Stake duration from now, in seconds. Must obey min/max. */
  durationSeconds: number
  /** Reward address (P-Chain bech32). Defaults to the user's pchain. */
  rewardAddress?: string
  /** Validator-only: delegation fee bps (used when role === "validator"). */
  delegationFeeBps?: number
}

export interface StakeResult {
  txID: string
  startTime: number
  endTime: number
}

const NODE_ID_RE = /^NodeID-[1-9A-HJ-NP-Za-km-z]{32,50}$/
/** P-Chain bech32 address: "P-{hrp}1{34+chars}". */
const PCHAIN_ADDR_RE = /^P-[a-z]{1,16}1[02-9ac-hj-np-z]{38,}$/

function validate(input: StakeInput, fromAddress: string): string | null {
  if (!NODE_ID_RE.test(input.nodeID)) return "Invalid validator node ID"
  if (!PCHAIN_ADDR_RE.test(fromAddress)) {
    return "Account has no P-Chain address; switch chain in settings"
  }
  if (input.rewardAddress && !PCHAIN_ADDR_RE.test(input.rewardAddress)) {
    return "Reward address must be a P-Chain address"
  }
  if (input.amountNLux <= 0n) return "Amount must be positive"
  const min =
    input.role === "delegator"
      ? PCHAIN_MIN_DELEGATOR_STAKE_NLUX
      : PCHAIN_MIN_VALIDATOR_STAKE_NLUX
  if (input.amountNLux < min) {
    const minLux = Number(min) / 1e9
    return `Minimum stake is ${minLux} LUX`
  }
  if (input.durationSeconds < PCHAIN_MIN_STAKE_DURATION_SECONDS) {
    return "Lock period must be at least 14 days"
  }
  if (input.durationSeconds > PCHAIN_MAX_STAKE_DURATION_SECONDS) {
    return "Lock period cannot exceed 365 days"
  }
  if (input.role === "validator") {
    const fee = input.delegationFeeBps ?? 0
    if (!Number.isInteger(fee) || fee < 0 || fee > 10000) {
      return "Delegation fee must be between 0 and 100%"
    }
  }
  return null
}

interface UnsignedAddDelegatorTx {
  type: "platform.addDelegator"
  nodeID: string
  amountNLux: string // bigint serialised
  startTime: number
  endTime: number
  rewardAddress: string
  fromAddress: string
}

interface UnsignedAddValidatorTx {
  type: "platform.addValidator"
  nodeID: string
  amountNLux: string
  startTime: number
  endTime: number
  rewardAddress: string
  fromAddress: string
  delegationFeeBps: number
}

type UnsignedTx = UnsignedAddDelegatorTx | UnsignedAddValidatorTx

function serialise(input: StakeInput, fromAddress: string): UnsignedTx {
  // Start a few seconds in the future so the network accepts the tx after
  // propagation latency. P-Chain enforces start > now at acceptance time.
  const now = Math.floor(Date.now() / 1000)
  const startTime = now + 60
  const endTime = startTime + input.durationSeconds
  const rewardAddress = input.rewardAddress ?? fromAddress
  const amountNLux = input.amountNLux.toString()
  if (input.role === "validator") {
    return {
      type: "platform.addValidator",
      nodeID: input.nodeID,
      amountNLux,
      startTime,
      endTime,
      rewardAddress,
      fromAddress,
      delegationFeeBps: input.delegationFeeBps ?? 200,
    }
  }
  return {
    type: "platform.addDelegator",
    nodeID: input.nodeID,
    amountNLux,
    startTime,
    endTime,
    rewardAddress,
    fromAddress,
  }
}

export function useStake() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<StakeResult | null>(null)

  const submit = useCallback(async (input: StakeInput): Promise<StakeResult> => {
    setError(null)
    setResult(null)
    const account = getAccount()
    if (!account) {
      const msg = "Wallet locked — unlock to stake"
      setError(msg)
      throw new Error(msg)
    }
    const validationErr = validate(input, account.pchain)
    if (validationErr) {
      setError(validationErr)
      throw new Error(validationErr)
    }
    const signer = window.__luxWallet?.signPChainTx
    const broadcaster = window.__luxWallet?.broadcastPChainTx
    if (!signer || !broadcaster) {
      const msg = "Wallet signer unavailable"
      setError(msg)
      throw new Error(msg)
    }
    setSubmitting(true)
    try {
      // Touch runtime config so brand.json is hot — also ensures we abort
      // submission if config never loaded (offline state).
      await loadRuntimeConfig()
      const unsigned = serialise(input, account.pchain)
      const unsignedBytes = new TextEncoder().encode(JSON.stringify(unsigned))
      const signed = await signer(unsignedBytes)
      const broadcastResult = await broadcaster(signed)
      const txID = broadcastResult.txId
      const out: StakeResult = {
        txID,
        startTime: unsigned.startTime,
        endTime: unsigned.endTime,
      }
      setResult(out)
      // Optimistic store update so the active stakes list reflects
      // immediately. A subsequent fetch will reconcile from chain.
      stakeStore.set({
        stakes: [
          ...stakeStore.get().stakes,
          {
            txID,
            nodeID: input.nodeID,
            amountNLux: input.amountNLux,
            pendingRewardNLux: 0n,
            startTime: unsigned.startTime,
            endTime: unsigned.endTime,
            status: "pending",
          },
        ],
      })
      return out
    } catch (err) {
      const msg = err instanceof Error ? err.message : "stake submission failed"
      setError(msg)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submit, submitting, error, result }
}

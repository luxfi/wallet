/**
 * Stake store — validators, active stakes, pending rewards.
 *
 * Lightweight subscription store (no redux dependency). Foundation may swap
 * the implementation for redux/zustand later — the public surface
 * (useStakeStore, stakeStore.set/get) is stable.
 *
 * State is in-memory only. Validator lists are re-fetched on screen mount;
 * stake submissions update the store optimistically and reconcile from
 * P-Chain on the next poll.
 */

import { useSyncExternalStore } from "react"

/** Validator record from getCurrentValidators / gateway. */
export interface Validator {
  /** "NodeID-…" — primary key */
  nodeID: string
  /** Optional human label resolved from validator metadata. */
  name?: string
  /** Total stake delegated to this validator, in nLUX (1 LUX = 1e9 nLUX). */
  stakeAmountNLux: bigint
  /** Annualised reward percentage (server-computed; 0–100). */
  apy: number
  /** Uptime as a fraction 0–1. */
  uptime: number
  /** Validation start time (unix seconds). */
  startTime: number
  /** Validation end time (unix seconds). */
  endTime: number
  /** Delegation fee charged by the validator, basis points (e.g. 200 = 2%). */
  delegationFeeBps: number
  /** Capacity remaining for new delegations, in nLUX. 0 = at capacity. */
  delegationCapacityNLux: bigint
  /** True if validator is jailed/slashed. UI must block new delegations. */
  jailed: boolean
}

/** Active delegation owned by the user. */
export interface ActiveStake {
  /** Originating tx ID (hex). */
  txID: string
  nodeID: string
  /** Staked amount in nLUX. */
  amountNLux: bigint
  /** Pending reward in nLUX (unclaimed). */
  pendingRewardNLux: bigint
  startTime: number
  endTime: number
  /** "Pending" while subnet has not yet activated; "Active" once running. */
  status: "pending" | "active" | "completed"
}

interface StakeState {
  validators: Validator[]
  validatorsLoading: boolean
  validatorsError: string | null
  stakes: ActiveStake[]
  stakesLoading: boolean
  stakesError: string | null
  /** Total claimable rewards across all stakes, in nLUX. */
  totalClaimableNLux: bigint
}

const initial: StakeState = {
  validators: [],
  validatorsLoading: false,
  validatorsError: null,
  stakes: [],
  stakesLoading: false,
  stakesError: null,
  totalClaimableNLux: 0n,
}

let state: StakeState = initial
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const stakeStore = {
  get(): StakeState {
    return state
  },
  set(patch: Partial<StakeState>) {
    state = { ...state, ...patch }
    if (patch.stakes) {
      // Re-derive total claimable from stakes if they changed.
      state.totalClaimableNLux = state.stakes.reduce(
        (sum, s) => sum + s.pendingRewardNLux,
        0n,
      )
    }
    emit()
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
  reset() {
    state = initial
    emit()
  },
}

export function useStakeStore<T>(selector: (s: StakeState) => T): T {
  return useSyncExternalStore(
    stakeStore.subscribe,
    () => selector(state),
    () => selector(state),
  )
}

/** P-Chain minimum stake parameters. */
export const PCHAIN_MIN_STAKE_DURATION_SECONDS = 14 * 24 * 60 * 60 // 2 weeks
export const PCHAIN_MAX_STAKE_DURATION_SECONDS = 365 * 24 * 60 * 60 // 1 year
export const PCHAIN_MIN_DELEGATOR_STAKE_NLUX = 25n * 10n ** 9n // 25 LUX
export const PCHAIN_MIN_VALIDATOR_STAKE_NLUX = 2000n * 10n ** 9n // 2,000 LUX

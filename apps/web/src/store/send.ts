/**
 * Send-flow state. One store, six explicit phases.
 *
 *   idle        → form being edited, not yet submitted
 *   preview     → user tapped "Sign & Send", reviewing fee + summary
 *   confirming  → biometric / PIN re-auth in progress
 *   broadcasting→ tx signed, sent to network, awaiting first inclusion
 *   done        → tx confirmed (n confirmations met)
 *   error       → broadcast or sign failed; `error` populated
 *
 * Reset is explicit: callers invoke `reset()` on /send route mount so a
 * stale form from a prior session can never replay.
 *
 * The store is intentionally minimal — no derived selectors, no async
 * actions. Async lives in the `useSend` hook so the store stays a pure
 * data slice.
 */
import { create } from "zustand"
import type { Asset } from "../lib/asset"

export type SendStatus =
  | "idle"
  | "preview"
  | "confirming"
  | "broadcasting"
  | "done"
  | "error"

export interface SendState {
  to: string
  amount: string
  memo: string
  asset: Asset | null
  status: SendStatus
  txHash: string | null
  error: string | null

  setTo: (to: string) => void
  setAmount: (amount: string) => void
  setMemo: (memo: string) => void
  setAsset: (asset: Asset | null) => void
  setStatus: (status: SendStatus) => void
  setTxHash: (hash: string | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

const INITIAL = {
  to: "",
  amount: "",
  memo: "",
  asset: null as Asset | null,
  status: "idle" as SendStatus,
  txHash: null as string | null,
  error: null as string | null,
}

export const useSendStore = create<SendState>((set) => ({
  ...INITIAL,
  setTo: (to) => set({ to }),
  setAmount: (amount) => set({ amount }),
  setMemo: (memo) => set({ memo }),
  setAsset: (asset) => set({ asset }),
  setStatus: (status) => set({ status }),
  setTxHash: (txHash) => set({ txHash }),
  setError: (error) => set({ error }),
  reset: () => set({ ...INITIAL }),
}))

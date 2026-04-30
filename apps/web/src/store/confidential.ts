/**
 * Confidential store — minimal in-memory store for revealed balances and active proofs.
 *
 * Deliberately framework-free (no Zustand/Redux) so this slice does not bind the
 * Foundation team to a state library. When Foundation lands a global store, this
 * module is the seam to migrate.
 *
 * Keys:
 *   revealedBalances: `${chainId}:${address}:${symbol}` → RevealedBalance
 *   activeProofs:     `${id}` → ZKProof
 */

import type { RevealedBalance, ZKProof } from "../screens/confidential/types"

type RevealKey = string
type ProofKey = string

interface ConfidentialState {
  revealedBalances: Map<RevealKey, RevealedBalance>
  activeProofs: Map<ProofKey, ZKProof>
}

const state: ConfidentialState = {
  revealedBalances: new Map(),
  activeProofs: new Map(),
}

const subscribers = new Set<() => void>()

function notify() {
  for (const fn of subscribers) fn()
}

export function revealKey(chainId: number, address: string, symbol: string): RevealKey {
  return `${chainId}:${address.toLowerCase()}:${symbol.toUpperCase()}`
}

export const confidentialStore = {
  /** Subscribe to store changes. Returns unsubscribe. */
  subscribe(fn: () => void): () => void {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  },

  /** Snapshot — return current state (do not mutate). */
  getSnapshot(): ConfidentialState {
    return state
  },

  /** Stash a freshly decrypted balance with auto-rehide TTL. */
  setRevealedBalance(
    chainId: number,
    address: string,
    symbol: string,
    revealed: RevealedBalance,
  ): void {
    state.revealedBalances.set(revealKey(chainId, address, symbol), revealed)
    notify()
  },

  /** Get revealed balance if not expired; otherwise evict and return undefined. */
  getRevealedBalance(
    chainId: number,
    address: string,
    symbol: string,
  ): RevealedBalance | undefined {
    const key = revealKey(chainId, address, symbol)
    const r = state.revealedBalances.get(key)
    if (!r) return undefined
    if (Date.now() >= r.expiresAt) {
      state.revealedBalances.delete(key)
      notify()
      return undefined
    }
    return r
  },

  /** Force re-hide of a balance. */
  hideBalance(chainId: number, address: string, symbol: string): void {
    if (state.revealedBalances.delete(revealKey(chainId, address, symbol))) {
      notify()
    }
  },

  /** Persist a freshly-generated ZK proof. */
  addProof(p: ZKProof): void {
    state.activeProofs.set(p.id, p)
    notify()
  },

  /** Retrieve a proof by id. */
  getProof(id: string): ZKProof | undefined {
    return state.activeProofs.get(id)
  },

  /** Drop a proof (user-initiated revoke / cleanup). */
  removeProof(id: string): void {
    if (state.activeProofs.delete(id)) notify()
  },

  /** All active proofs, freshest first. */
  listProofs(): ZKProof[] {
    return Array.from(state.activeProofs.values()).sort(
      (a, b) => b.generatedAt - a.generatedAt,
    )
  },
}

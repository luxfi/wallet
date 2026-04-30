/**
 * dApps store — WalletConnect v2 sessions, pending pairing, pending requests.
 *
 * State is the source of truth for "what dApps does the user have connected".
 * The useWalletConnect hook listens to sign-client events and dispatches into
 * this store. UI components read from the store via useDAppsStore.
 *
 * No persistence here — sign-client handles its own storage (IndexedDB).
 */

import { useSyncExternalStore } from "react"

/** dApp metadata as supplied in the proposal/session — never trusted blindly. */
export interface DAppMetadata {
  name: string
  description: string
  url: string
  icons: string[]
}

/** Active WalletConnect session. */
export interface DAppSession {
  /** sign-client topic, primary key. */
  topic: string
  peer: DAppMetadata
  /** Approved chains (CAIP-2 strings, e.g. "eip155:96369"). */
  chains: string[]
  /** Approved methods (e.g. "eth_sendTransaction"). */
  methods: string[]
  /** Approved events (e.g. "chainChanged"). */
  events: string[]
  /** Session expiry (unix seconds). */
  expiry: number
  /** Unix ms when the session was approved by the user. */
  acquiredAt: number
}

/** Pending pairing — pre-session_proposal state. */
export interface PendingPairing {
  topic: string
  uri: string
  /** Unix ms when the pairing was initiated. */
  startedAt: number
}

interface DAppsState {
  sessions: DAppSession[]
  pendingPairings: PendingPairing[]
  /** Most recent error from sign-client. Null when clean. */
  error: string | null
  /** True while sign-client is initialising. */
  initializing: boolean
}

const initial: DAppsState = {
  sessions: [],
  pendingPairings: [],
  error: null,
  initializing: false,
}

let state: DAppsState = initial
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const dappsStore = {
  get(): DAppsState {
    return state
  },
  set(patch: Partial<DAppsState>) {
    state = { ...state, ...patch }
    emit()
  },
  upsertSession(session: DAppSession) {
    const without = state.sessions.filter((s) => s.topic !== session.topic)
    state = { ...state, sessions: [...without, session] }
    emit()
  },
  removeSession(topic: string) {
    state = {
      ...state,
      sessions: state.sessions.filter((s) => s.topic !== topic),
    }
    emit()
  },
  addPendingPairing(p: PendingPairing) {
    state = { ...state, pendingPairings: [...state.pendingPairings, p] }
    emit()
  },
  removePendingPairing(topic: string) {
    state = {
      ...state,
      pendingPairings: state.pendingPairings.filter((p) => p.topic !== topic),
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

export function useDAppsStore<T>(selector: (s: DAppsState) => T): T {
  return useSyncExternalStore(
    dappsStore.subscribe,
    () => selector(state),
    () => selector(state),
  )
}

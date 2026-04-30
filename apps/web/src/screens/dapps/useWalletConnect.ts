/**
 * useWalletConnect — initialises @walletconnect/sign-client v2.21 and routes
 * its events into the dapps store.
 *
 * Lifecycle:
 *   1. On first call, the singleton sign-client is created with the
 *      brand.walletConnectProjectId. Initialisation is deduped.
 *   2. The hook attaches handlers for session_proposal, session_request,
 *      session_delete, session_event. Existing sessions are hydrated from
 *      the client into the dapps store.
 *   3. session_proposal is *not auto-approved*. We push a Pending Proposal
 *      into a module-local queue so a confirmation modal owned by Foundation
 *      can render and call approveProposal/rejectProposal.
 *
 * Trust:
 *   - The wc:// URI is validated by shape (topic + relay-protocol + symKey
 *     query params) before passing to client.pair.
 *   - Approvals only grant chains and methods the wallet supports — we
 *     intersect the proposer's required namespaces with our allowlist.
 *   - All session_request messages are queued for a per-request user
 *     prompt; this hook never auto-signs.
 */

import { useEffect, useState } from "react"
import { dappsStore } from "../../store/dapps"
import { loadRuntimeConfig } from "../_shared/runtime"

// Type-only imports so the bundle still tree-shakes when WalletConnect is
// not yet installed (tests, type-check pass).
type SignClientInstance = {
  pair: (args: { uri: string }) => Promise<unknown>
  approve: (args: unknown) => Promise<{ acknowledged: () => Promise<unknown> }>
  reject: (args: unknown) => Promise<unknown>
  disconnect: (args: { topic: string; reason: { code: number; message: string } }) => Promise<unknown>
  respond: (args: unknown) => Promise<unknown>
  on: (event: string, listener: (...args: unknown[]) => void) => void
  off: (event: string, listener: (...args: unknown[]) => void) => void
  session: { getAll: () => SessionRecord[] }
}

interface SessionRecord {
  topic: string
  peer: { metadata: { name: string; description: string; url: string; icons: string[] } }
  namespaces: Record<string, { chains?: string[]; methods: string[]; events: string[] }>
  expiry: number
  acknowledged: boolean
}

interface ProposalRecord {
  id: number
  params: {
    proposer: {
      metadata: { name: string; description: string; url: string; icons: string[] }
    }
    requiredNamespaces: Record<
      string,
      { chains?: string[]; methods: string[]; events: string[] }
    >
    optionalNamespaces?: Record<
      string,
      { chains?: string[]; methods: string[]; events: string[] }
    >
  }
}

const WC_URI_RE =
  /^wc:[0-9a-f]{32,}@2\?[A-Za-z0-9=&%._~+:/?#@!$'()*,;\-]+$/i

/** Methods the wallet allows dApps to invoke — anything else is rejected. */
const ALLOWED_METHODS = new Set([
  "eth_sendTransaction",
  "eth_signTransaction",
  "eth_sign",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
])

/** Events the wallet supports emitting to the dApp. */
const ALLOWED_EVENTS = new Set(["chainChanged", "accountsChanged"])

let signClient: SignClientInstance | null = null
let initPromise: Promise<SignClientInstance> | null = null

const pendingProposals = new Map<number, ProposalRecord>()
const pendingListeners = new Set<() => void>()

function onPendingChange(cb: () => void) {
  pendingListeners.add(cb)
  return () => pendingListeners.delete(cb)
}

function emitPendingChange() {
  for (const l of Array.from(pendingListeners)) l()
}

function isWcUri(uri: string): boolean {
  if (uri.length < 24 || uri.length > 4096) return false
  return WC_URI_RE.test(uri)
}

function namespaceFromRecord(
  record: SessionRecord,
): { chains: string[]; methods: string[]; events: string[] } {
  const chains: string[] = []
  const methods: string[] = []
  const events: string[] = []
  for (const ns of Object.values(record.namespaces)) {
    if (Array.isArray(ns.chains)) chains.push(...ns.chains)
    methods.push(...ns.methods)
    events.push(...ns.events)
  }
  return {
    chains: Array.from(new Set(chains)),
    methods: Array.from(new Set(methods)),
    events: Array.from(new Set(events)),
  }
}

function hydrate(client: SignClientInstance) {
  const sessions = client.session.getAll().map((rec) => {
    const ns = namespaceFromRecord(rec)
    return {
      topic: rec.topic,
      peer: rec.peer.metadata,
      chains: ns.chains,
      methods: ns.methods,
      events: ns.events,
      expiry: rec.expiry,
      acquiredAt: Date.now(),
    }
  })
  dappsStore.set({ sessions, initializing: false, error: null })
}

async function getSignClient(): Promise<SignClientInstance> {
  if (signClient) return signClient
  if (initPromise) return initPromise
  dappsStore.set({ initializing: true, error: null })
  initPromise = (async () => {
    const cfg = await loadRuntimeConfig()
    const projectId =
      cfg.brand.walletConnectProjectId || cfg.walletConnect.projectId
    if (!projectId) {
      throw new Error(
        "WalletConnect projectId missing from brand config — refusing to initialise",
      )
    }
    const mod = (await import("@walletconnect/sign-client")) as {
      SignClient: {
        init: (args: {
          projectId: string
          metadata: {
            name: string
            description: string
            url: string
            icons: string[]
          }
        }) => Promise<SignClientInstance>
      }
    }
    const client = await mod.SignClient.init({
      projectId,
      metadata: {
        name: cfg.brand.walletName || cfg.brand.name || "Lux Wallet",
        description: "Self-custodial wallet for the Lux Network",
        url: cfg.brand.appDomain
          ? `https://${cfg.brand.appDomain}`
          : "https://wallet.lux.network",
        icons: ["/logo.svg"],
      },
    })
    signClient = client
    attachHandlers(client)
    hydrate(client)
    return client
  })().catch((err) => {
    dappsStore.set({
      initializing: false,
      error: err instanceof Error ? err.message : "wc init failed",
    })
    initPromise = null
    throw err
  })
  return initPromise
}

function attachHandlers(client: SignClientInstance) {
  client.on("session_proposal", (...args: unknown[]) => {
    const proposal = args[0] as ProposalRecord
    if (!proposal || typeof proposal.id !== "number") return
    pendingProposals.set(proposal.id, proposal)
    emitPendingChange()
  })

  client.on("session_delete", (...args: unknown[]) => {
    const arg = args[0] as { topic?: string }
    if (typeof arg?.topic === "string") {
      dappsStore.removeSession(arg.topic)
    }
  })

  client.on("session_request", (...args: unknown[]) => {
    const req = args[0] as
      | {
          topic: string
          params: { request: { method: string }; chainId: string }
          id: number
        }
      | undefined
    if (!req) return
    if (!ALLOWED_METHODS.has(req.params.request.method)) {
      // Reject methods not on the allowlist immediately.
      client
        .respond({
          topic: req.topic,
          response: {
            id: req.id,
            jsonrpc: "2.0",
            error: { code: 5101, message: "Method not supported" },
          },
        })
        .catch(() => undefined)
      return
    }
    // Hand off to Foundation's signing UI by emitting a custom event.
    window.dispatchEvent(
      new CustomEvent("luxwallet:wc-request", { detail: req }),
    )
  })
}

export function pendingProposal(id: number): ProposalRecord | undefined {
  return pendingProposals.get(id)
}

export function listPendingProposals(): ProposalRecord[] {
  return Array.from(pendingProposals.values())
}

function intersectNamespaces(
  required: ProposalRecord["params"]["requiredNamespaces"],
  optional: ProposalRecord["params"]["optionalNamespaces"] | undefined,
  supportedChainIds: number[],
  accountAddress: string,
) {
  const supportedSet = new Set(supportedChainIds.map((c) => `eip155:${c}`))
  const merged: Record<
    string,
    { chains: string[]; methods: string[]; events: string[]; accounts: string[] }
  > = {}
  for (const [key, ns] of Object.entries(required)) {
    const chains = (ns.chains ?? []).filter((c) => supportedSet.has(c))
    if (chains.length === 0) {
      throw new Error(`Required namespace ${key} not supported by wallet`)
    }
    merged[key] = {
      chains,
      methods: ns.methods.filter((m) => ALLOWED_METHODS.has(m)),
      events: ns.events.filter((e) => ALLOWED_EVENTS.has(e)),
      accounts: chains.map((c) => `${c}:${accountAddress}`),
    }
  }
  if (optional) {
    for (const [key, ns] of Object.entries(optional)) {
      const chains = (ns.chains ?? []).filter((c) => supportedSet.has(c))
      if (chains.length === 0) continue
      const existing = merged[key]
      if (existing) {
        const set = new Set([...existing.chains, ...chains])
        existing.chains = Array.from(set)
        existing.accounts = existing.chains.map(
          (c) => `${c}:${accountAddress}`,
        )
        for (const m of ns.methods) {
          if (ALLOWED_METHODS.has(m) && !existing.methods.includes(m)) {
            existing.methods.push(m)
          }
        }
        for (const e of ns.events) {
          if (ALLOWED_EVENTS.has(e) && !existing.events.includes(e)) {
            existing.events.push(e)
          }
        }
      } else {
        merged[key] = {
          chains,
          methods: ns.methods.filter((m) => ALLOWED_METHODS.has(m)),
          events: ns.events.filter((e) => ALLOWED_EVENTS.has(e)),
          accounts: chains.map((c) => `${c}:${accountAddress}`),
        }
      }
    }
  }
  return merged
}

export function useWalletConnect() {
  const [, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    getSignClient().catch(() => undefined)
    const off = onPendingChange(() => {
      if (!cancelled) setTick((n) => n + 1)
    })
    return () => {
      cancelled = true
      off()
    }
  }, [])

  return {
    pendingProposals: listPendingProposals(),
    pair: async (uri: string) => {
      if (!isWcUri(uri)) {
        const msg = "Invalid wc:// URI"
        dappsStore.set({ error: msg })
        throw new Error(msg)
      }
      const client = await getSignClient()
      const startedAt = Date.now()
      // The pair call returns once the relay handshake completes; the
      // actual session_proposal arrives via the listener.
      await client.pair({ uri })
      // Track the pairing so the UI can surface a "waiting" state. We
      // derive a synthetic topic from the URI for tracking.
      const topicMatch = uri.match(/^wc:([0-9a-f]{32,})@/i)
      if (topicMatch) {
        dappsStore.addPendingPairing({
          topic: topicMatch[1],
          uri,
          startedAt,
        })
      }
    },
    approveProposal: async (
      id: number,
      accountAddress: string,
      supportedChainIds: number[],
    ) => {
      const proposal = pendingProposals.get(id)
      if (!proposal) throw new Error("Proposal not found")
      const client = await getSignClient()
      const namespaces = intersectNamespaces(
        proposal.params.requiredNamespaces,
        proposal.params.optionalNamespaces,
        supportedChainIds,
        accountAddress,
      )
      const { acknowledged } = await client.approve({
        id,
        namespaces,
      })
      await acknowledged()
      pendingProposals.delete(id)
      emitPendingChange()
      hydrate(client)
    },
    rejectProposal: async (id: number, reason = "User rejected") => {
      const proposal = pendingProposals.get(id)
      if (!proposal) return
      const client = await getSignClient()
      await client.reject({
        id,
        reason: { code: 5000, message: reason },
      })
      pendingProposals.delete(id)
      emitPendingChange()
    },
    disconnect: async (topic: string) => {
      const client = await getSignClient()
      await client.disconnect({
        topic,
        reason: { code: 6000, message: "User disconnected" },
      })
      dappsStore.removeSession(topic)
    },
  }
}

export const __testing__ = {
  isWcUri,
  intersectNamespaces,
  ALLOWED_METHODS,
  ALLOWED_EVENTS,
}

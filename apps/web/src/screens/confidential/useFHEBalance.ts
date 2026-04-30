/**
 * F-Chain encrypted balance hook.
 *
 * Threat model:
 *   - Adversary: anyone observing on-chain state. Sees only ciphertext.
 *   - Adversary: anyone observing the user's browser. Sees plaintext only
 *     while a reveal session is active and only after the threshold MPC
 *     committee has signed.
 *   - Adversary: a malicious gateway. Cannot forge threshold signatures
 *     (the committee public keys are pinned in `brand.json`). Cannot
 *     decrypt without the committee's cooperation.
 *
 * Defense:
 *   - Reveal is committee-driven; the UI only renders progress.
 *   - Plaintext lives in memory for `revealTtlMs`, then auto-evicts.
 *   - Plaintext is NEVER persisted to localStorage / IndexedDB / cookies.
 *
 * The TFHE-rs WASM bindings are not yet published. When `@l.x/fhe` ships
 * we swap the threshold-decrypt call to use it directly. Until then the
 * gateway is the only path; the gateway never sees plaintext (the
 * committee returns the decryption to the user-side share aggregator;
 * we treat the gateway as a transport).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { gatewayUrl } from "./brand"
import { confidentialStore } from "../../store/confidential"
import type { DecryptSession, FHEBalance } from "./types"

/** Default reveal TTL — 30s. After this the UI re-hides and re-encrypts memory. */
export const DEFAULT_REVEAL_TTL_MS = 30_000

/** Per-spec F-Chain identifier. Real chain ID will land via brand.json. */
export const F_CHAIN_ID = 0xf

interface UseFHEBalanceArgs {
  address: string
  symbol: string
  /** Override TTL for testing / sensitive screens. */
  revealTtlMs?: number
}

interface UseFHEBalanceResult {
  balance: FHEBalance | undefined
  loading: boolean
  error: string | undefined
  /** Active decrypt session if a reveal is in progress. */
  session: DecryptSession | undefined
  /** Kick off a threshold decrypt session. */
  reveal: () => Promise<void>
  /** Force re-hide. */
  hide: () => void
  /** Refresh ciphertext from chain. */
  refresh: () => Promise<void>
}

async function fetchCiphertext(address: string, symbol: string): Promise<FHEBalance> {
  const url = gatewayUrl(
    `/v1/fhe/balance?address=${encodeURIComponent(address)}&symbol=${encodeURIComponent(symbol)}`,
  )
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error(`fetchCiphertext: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as FHEBalance
}

async function startDecryptSession(balance: FHEBalance): Promise<DecryptSession> {
  const res = await fetch(gatewayUrl("/v1/fhe/decrypt"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({
      ciphertext: balance.ciphertext,
      address: balance.address,
      symbol: balance.symbol,
      chainId: balance.chainId,
    }),
  })
  if (!res.ok) {
    throw new Error(`startDecryptSession: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as DecryptSession
}

async function pollDecryptSession(sessionId: string): Promise<DecryptSession> {
  const res = await fetch(
    gatewayUrl(`/v1/fhe/decrypt/${encodeURIComponent(sessionId)}`),
    { method: "GET", credentials: "include" },
  )
  if (!res.ok) {
    throw new Error(`pollDecryptSession: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as DecryptSession
}

export function useFHEBalance({
  address,
  symbol,
  revealTtlMs = DEFAULT_REVEAL_TTL_MS,
}: UseFHEBalanceArgs): UseFHEBalanceResult {
  const [balance, setBalance] = useState<FHEBalance | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [session, setSession] = useState<DecryptSession | undefined>()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const b = await fetchCiphertext(address, symbol)
      setBalance(b)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [address, symbol])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const reveal = useCallback(async () => {
    if (!balance) {
      setError("no ciphertext fetched")
      return
    }
    setError(undefined)
    let s: DecryptSession
    try {
      s = await startDecryptSession(balance)
      setSession(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return
    }
    // Poll until threshold reached or terminal.
    const start = Date.now()
    const POLL_INTERVAL_MS = 1500
    const TIMEOUT_MS = 60_000
    while (Date.now() - start < TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      try {
        s = await pollDecryptSession(s.sessionId)
        setSession(s)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return
      }
      if (s.error) {
        setError(s.error)
        return
      }
      if (s.plaintext !== undefined) {
        confidentialStore.setRevealedBalance(balance.chainId, balance.address, balance.symbol, {
          amount: s.plaintext,
          symbol: balance.symbol,
          decimals: 18,
          expiresAt: Date.now() + revealTtlMs,
          threshold: `${s.threshold}-of-${s.total}`,
        })
        return
      }
    }
    setError("decrypt session timed out")
  }, [balance, revealTtlMs])

  const hide = useCallback(() => {
    if (!balance) return
    confidentialStore.hideBalance(balance.chainId, balance.address, balance.symbol)
    setSession(undefined)
  }, [balance])

  return useMemo(
    () => ({ balance, loading, error, session, reveal, hide, refresh }),
    [balance, loading, error, session, reveal, hide, refresh],
  )
}

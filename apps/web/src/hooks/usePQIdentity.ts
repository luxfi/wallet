/**
 * usePQIdentity — derive the wallet's canonical PQ identity from the
 * unlocked mnemonic.
 *
 * The mnemonic comes from the auth slice. While the wallet is locked
 * (no in-memory mnemonic) the hook returns `null`. When unlocked, it
 * computes (or returns a cached) ML-DSA-65 keypair for the current
 * chain at HD path `m/44'/9000'/<chainID>'/0'/0'/0'`.
 *
 * The cache key is `(mnemonic + chainID + accountIdx)`. We deliberately
 * cache by mnemonic content because the deterministic derivation
 * pipeline takes ~80-150 ms in JS — too slow to recompute on every
 * render. The cache is cleared on lock via the auth-slice subscription.
 *
 * Security: the cached ML-DSA-65 private key lives in module memory.
 * That's the same place the mnemonic itself sits, so we're not widening
 * the threat surface. The cache map is keyed on the mnemonic string
 * directly — JS doesn't let us pin secrets, so we accept the
 * weak-pinning trade-off in exchange for not re-running the derivation
 * 60 times per second.
 */
import { useEffect, useMemo, useState } from "react"
import { useAuth, type AuthState } from "../store/auth"
import { type PQAccount, derivePQIdentity, WalletSchemeID } from "../lib/pq"

interface CacheEntry {
  mnemonic: string
  chainID: number
  accountIdx: number
  scheme: WalletSchemeID
  account: PQAccount
}

let cache: CacheEntry | null = null

/** Drop the cached identity. Called on lock from a subscription below. */
export function clearPQIdentityCache(): void {
  cache = null
}

export function usePQIdentity(opts: {
  chainID: number
  accountIdx?: number
  scheme?: WalletSchemeID
}): PQAccount | null {
  const accountIdx = opts.accountIdx ?? 0
  const scheme = opts.scheme ?? WalletSchemeID.MLDSA65

  const mnemonic = useAuth((s: AuthState) => s.mnemonic)
  const isUnlocked = useAuth((s: AuthState) => s.isUnlocked)
  const [tick, setTick] = useState(0)

  // Clear the module cache on lock. Subscribed once per hook mount.
  useEffect(() => {
    const unsub = useAuth.subscribe((s, prev) => {
      if (prev.isUnlocked && !s.isUnlocked) {
        clearPQIdentityCache()
        setTick((t) => t + 1)
      }
    })
    return unsub
  }, [])

  return useMemo(() => {
    if (!isUnlocked || !mnemonic) return null
    if (
      cache &&
      cache.mnemonic === mnemonic &&
      cache.chainID === opts.chainID &&
      cache.accountIdx === accountIdx &&
      cache.scheme === scheme
    ) {
      return cache.account
    }
    const account = derivePQIdentity({
      mnemonic,
      chainID: opts.chainID,
      accountIdx,
      scheme,
    })
    cache = { mnemonic, chainID: opts.chainID, accountIdx, scheme, account }
    return account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, mnemonic, opts.chainID, accountIdx, scheme, tick])
}

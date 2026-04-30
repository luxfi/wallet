/**
 * Account shim for screen modules.
 *
 * Foundation Blue owns the canonical account context at apps/web/src/store/.
 * Until that lands, this shim reads from a window-mounted bridge that
 * Foundation populates on app boot. Returns `null` when the wallet is
 * locked or not initialised.
 *
 * Contract:
 *   window.__luxWallet.account: {
 *     pchain: string,        // P-Chain bech32 address (e.g. "P-lux1…")
 *     cchain: string,        // C-Chain hex address (0x…)
 *     nodeID?: string,       // optional self-validator nodeID
 *     derivationPath: string // BIP44 path, "m/44'/9000'/0'/0/0" for P-chain
 *   }
 *   window.__luxWallet.signPChainTx(unsignedTxBytes: Uint8Array): Promise<Uint8Array>
 *   window.__luxWallet.broadcastPChainTx(signedTxBytes: Uint8Array): Promise<{ txId: string }>
 *   window.__luxWallet.lockedSubscribe(cb): unsubscribe
 *
 * Screens import this and never reach into Foundation internals.
 */

import { useEffect, useState } from "react"

export interface Account {
  pchain: string
  cchain: string
  nodeID?: string
  derivationPath: string
}

declare global {
  interface Window {
    __luxWallet?: {
      account: Account | null
      signPChainTx?: (bytes: Uint8Array) => Promise<Uint8Array>
      broadcastPChainTx?: (bytes: Uint8Array) => Promise<{ txId: string }>
      subscribe?: (cb: () => void) => () => void
    }
  }
}

export function getAccount(): Account | null {
  return (typeof window !== "undefined" && window.__luxWallet?.account) || null
}

export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(getAccount())
  useEffect(() => {
    const sub = window.__luxWallet?.subscribe
    if (!sub) return
    return sub(() => setAccount(getAccount()))
  }, [])
  return account
}

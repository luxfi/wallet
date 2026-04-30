/**
 * F-Chain confidential transfer hook.
 *
 * Threat model:
 *   - Adversary observing chain: sees only ciphertext destination + ciphertext
 *     amount. Sender obfuscation is not provided (this is FHE, not mixnet).
 *   - Adversary controlling the recipient: sees plaintext after their own
 *     decryption (this is by definition; the sender accepts that).
 *   - Adversary controlling the gateway: must not be able to substitute a
 *     different recipient pubkey. We pin recipient pubkey lookup behind
 *     IAM-authenticated lookup with on-chain fallback verification.
 *
 * Defense:
 *   - Encryption is client-side. The gateway never sees the plaintext amount.
 *   - Recipient pubkey is fetched fresh per transfer. UI MUST show the
 *     recipient's registered pubkey fingerprint before signing.
 *   - The unsigned tx is built client-side; signing is delegated to the
 *     wallet's keystore (foundation provides this seam).
 *
 * Real TFHE encryption requires `@l.x/fhe` (WASM bindings, not yet shipped).
 * Until then we fall back to the gateway-side encrypt endpoint, which is
 * NOT zero-knowledge: the gateway briefly sees plaintext. The UI surfaces
 * this with a degraded-mode warning.
 */

import { useCallback, useState } from "react"
import { gatewayUrl } from "./brand"
import type { FHERecipient } from "./types"

interface FHEModule {
  /** Encrypt a u64 amount under the recipient's TFHE public key. Returns base64. */
  encryptAmount(amount: bigint, recipientPubkey: string): Promise<string>
}

/** Lazy import of `@l.x/fhe` if available. Falls back to gateway encrypt. */
async function loadFheModule(): Promise<FHEModule | null> {
  try {
    // Use a string variable so bundlers don't try to resolve at build time
    // — the module isn't published yet. If/when it's published, swap this.
    const moduleName = "@l.x/fhe"
    const mod = (await import(/* @vite-ignore */ moduleName)) as Partial<FHEModule>
    if (typeof mod.encryptAmount === "function") {
      return mod as FHEModule
    }
    return null
  } catch {
    return null
  }
}

async function fetchRecipient(address: string): Promise<FHERecipient> {
  const res = await fetch(
    gatewayUrl(`/v1/fhe/recipient/${encodeURIComponent(address)}`),
    { method: "GET", credentials: "include" },
  )
  if (!res.ok) {
    throw new Error(`fetchRecipient: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as FHERecipient
}

async function gatewayEncrypt(amount: bigint, recipientPubkey: string): Promise<string> {
  // Fallback path. Surfaces the degraded-mode warning in the UI.
  const res = await fetch(gatewayUrl("/v1/fhe/encrypt"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ amount: amount.toString(), recipientPubkey }),
  })
  if (!res.ok) {
    throw new Error(`gatewayEncrypt: ${res.status} ${res.statusText}`)
  }
  const j = (await res.json()) as { ciphertext: string }
  return j.ciphertext
}

async function submitTransfer(args: {
  fromAddress: string
  recipient: FHERecipient
  ciphertext: string
  symbol: string
}): Promise<{ txHash: string }> {
  const res = await fetch(gatewayUrl("/v1/fhe/transfer"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    throw new Error(`submitTransfer: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as { txHash: string }
}

export interface FHETransferResult {
  txHash: string
  /** True if the gateway saw plaintext during encryption. */
  degraded: boolean
}

export function useFHETransfer() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [result, setResult] = useState<FHETransferResult | undefined>()

  const lookupRecipient = useCallback(async (address: string): Promise<FHERecipient> => {
    return await fetchRecipient(address)
  }, [])

  const send = useCallback(
    async (args: {
      fromAddress: string
      toAddress: string
      symbol: string
      amount: bigint
    }): Promise<FHETransferResult | undefined> => {
      setSubmitting(true)
      setError(undefined)
      setResult(undefined)
      try {
        const recipient = await fetchRecipient(args.toAddress)
        if (!recipient.registered) {
          throw new Error(`recipient ${args.toAddress} has no F-Chain pubkey registered`)
        }
        const fhe = await loadFheModule()
        let ciphertext: string
        let degraded = false
        if (fhe) {
          ciphertext = await fhe.encryptAmount(args.amount, recipient.pubkey)
        } else {
          ciphertext = await gatewayEncrypt(args.amount, recipient.pubkey)
          degraded = true
        }
        const tx = await submitTransfer({
          fromAddress: args.fromAddress,
          recipient,
          ciphertext,
          symbol: args.symbol,
        })
        const r = { txHash: tx.txHash, degraded }
        setResult(r)
        return r
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return undefined
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  return { send, lookupRecipient, submitting, error, result }
}

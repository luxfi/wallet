/**
 * Derive a chain-specific receive address from the unlocked HD seed.
 *
 *   Lux P/X-Chain → BIP-44 m/44'/9000'/0'/0/0 → secp256k1 →
 *                   ripemd160(sha256(pubkey)) → bech32, "P-" / "X-" prefix
 *   EVM           → BIP-44 m/44'/60'/0'/0/0   → secp256k1 →
 *                   keccak256(pubkey[1:])[12:] → EIP-55 checksum
 *   Solana        → SLIP-10 m/44'/501'/0'/0'  → ed25519 → base58
 *
 * The mnemonic comes from Foundation Blue's `useAuth` slice while the
 * wallet is unlocked. We never persist or transmit it. Foundation gates
 * `/receive` behind unlock so by the time this hook runs the slice is
 * populated; if not, we surface `locked: true` and the screen prompts.
 */
import { useMemo } from "react"
import { CHAINS, type Chain } from "../../lib/asset"
import { useAuth, type AuthState } from "../../store/auth"
import { deriveAddressFromMnemonic } from "../../lib/derive"

export interface ReceiveResult {
  /** The address itself, ready to display. */
  address: string
  /** The encoded URI for the QR (e.g. `lux:lux-c:0x…`). */
  qrUri: string
  /** True if the auth slice is locked or seed unavailable. */
  locked: boolean
  /** Last derivation error, if any. */
  error: string | null
}

export function useReceiveAddress(chainId: string): ReceiveResult {
  const chain = CHAINS[chainId] as Chain | undefined
  const mnemonic = useAuth((s: AuthState) => s.mnemonic)
  const isUnlocked = useAuth((s: AuthState) => s.isUnlocked)

  return useMemo(() => {
    if (!chain) {
      return { address: "", qrUri: "", locked: true, error: "Unknown chain" }
    }
    if (!isUnlocked || !mnemonic) {
      return { address: "", qrUri: "", locked: true, error: null }
    }
    try {
      const address = deriveAddressFromMnemonic(mnemonic, chain)
      const qrUri = `lux:${chain.id}:${address}`
      return { address, qrUri, locked: false, error: null }
    } catch (e) {
      return {
        address: "",
        qrUri: "",
        locked: false,
        error: (e as Error).message ?? "Derivation failed",
      }
    }
  }, [chain, mnemonic, isUnlocked])
}

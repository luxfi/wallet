/**
 * `useAccount()` — wallet-aware account hook.
 *
 * Combines:
 *   1. Wagmi's `useAccount` (the canonical source for EVM addresses).
 *   2. Zustand `account` slice (a persisted override / non-EVM address
 *      provided by Auth-Portfolio Blue's mnemonic-derived addresses).
 *
 * Resolution order:
 *   - If wagmi reports a connected EVM account → return it.
 *   - Else if zustand has a non-EVM address (P/X/Solana) → return it.
 *   - Else `address` is null and `connected` is false.
 *
 * Foundation owns this hook. Screen Blues consume it; they should NEVER
 * import wagmi's `useAccount` directly — that would hide non-EVM accounts
 * the Auth-Portfolio Blue surfaces via the store.
 */
import { useAccount as useWagmiAccount } from "wagmi"
import { useAppStore } from "../store"

export interface AccountInfo {
  address: string | null
  connected: boolean
  /** Wagmi connector kind ("metaMask", etc.) when EVM-connected, else null. */
  connectorKind: string | null
  /** Whether the active address is a wagmi (EVM) account vs. a store override. */
  source: "wagmi" | "store" | null
}

export function useAccount(): AccountInfo {
  const wagmi = useWagmiAccount()
  const storeAddress = useAppStore((s) => s.address)

  if (wagmi.address) {
    return {
      address: wagmi.address,
      connected: true,
      connectorKind: wagmi.connector?.id ?? null,
      source: "wagmi",
    }
  }
  if (storeAddress) {
    return {
      address: storeAddress,
      connected: true,
      connectorKind: null,
      source: "store",
    }
  }
  return { address: null, connected: false, connectorKind: null, source: null }
}

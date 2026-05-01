/**
 * Signing-modal hook + imperative API.
 *
 * Why both?
 *   - The hook (`useSigningModal`) is for components that want to render a
 *     button and `await` user confirmation inline.
 *   - The static `signingModal` is for non-component callers (sagas, dApp
 *     connector RPC handlers) that can't use hooks.
 *
 * Both forms back onto the same global `useSigningStore` — there is exactly
 * one queue, with a maximum depth of one in-flight request.
 *
 * Contract:
 *   const { approved } = await signingModal.open(tx)
 *   if (approved) await broadcaster.send(tx)
 */
import { useSigningStore, type UnsignedTx, type SigningResult } from "../../store/signing"

export interface SigningModalApi {
  open(tx: UnsignedTx): Promise<SigningResult>
  close(): void
  confirm(): void
  reject(): void
}

/**
 * Imperative API. Importable from non-component code.
 *   await signingModal.open({ chainId, from, to, value, data, origin: "dapp" })
 */
export const signingModal: SigningModalApi = {
  open: (tx) => useSigningStore.getState().open(tx),
  close: () => useSigningStore.getState().cancel("closed"),
  confirm: () => useSigningStore.getState().confirm(),
  reject: () => useSigningStore.getState().reject(),
}

/** React hook variant — same surface, also re-renders on pending change. */
export function useSigningModal(): SigningModalApi & {
  pending: ReturnType<typeof useSigningStore.getState>["pending"]
} {
  const pending = useSigningStore((s) => s.pending)
  return { ...signingModal, pending }
}

export type { UnsignedTx, SigningResult }

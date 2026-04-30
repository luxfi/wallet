/**
 * Zustand store skeleton — Foundation slice.
 *
 * Slices owned by Foundation:
 *   - `account`  — current address shown in the UI (wagmi is the truth for
 *                  EVM; this slice mirrors it and adds non-EVM overrides
 *                  for P/X/Solana addresses screen blues will populate).
 *   - `chain`    — the user's active chain id. Drives ChainSwitcher and
 *                  every screen's RPC choice.
 *   - `ui`       — modal stack and global UI state. Screens push/pop
 *                  modal ids; AppShell renders the top of stack.
 *
 * Other slices are owned by other Blues:
 *   - `auth`     — Auth-Portfolio Blue (encrypted mnemonic, PIN, lock state)
 *   - `send`     — Send-Receive Blue (transient send-flow state)
 *   - `swap`     — Swap-Bridge Blue (route quote, slippage, recipient)
 *   - `stake`    — Stake-DApps Blue (validator set, delegation pending)
 *
 * Foundation's contract: this module exports a single `useAppStore` hook
 * with `account`/`chain`/`ui` slices. Other slices live in sibling files
 * (`auth.ts`, `send.ts`, etc.) — separate stores keeps each Blue's
 * persistence policy independent.
 */
import { create } from "zustand"
import { brand } from "@luxfi/wallet-brand"

// ---------- account slice ----------
export interface AccountSlice {
  /** Display address. EVM `0x...`, P-Chain `P-lux1...`, etc. */
  address: string | null
  /** Set by `useAccount` hook when wagmi connects, or by non-EVM auth flows. */
  setAddress: (address: string | null) => void
}

// ---------- chain slice ----------
export interface ChainSlice {
  /** Active EIP-155 chain id (or P/X/Solana code for non-EVM). */
  chainId: number
  setChainId: (id: number) => void
}

// ---------- ui slice ----------
export type ModalId =
  | "send-preview"
  | "swap-confirm"
  | "bridge-confirm"
  | "receive-qr"
  | "settings"
  | "asset-picker"
  | "chain-picker"

export interface UiSlice {
  /** Stack of open modal ids. Top of stack is shown. */
  modalStack: ModalId[]
  pushModal: (id: ModalId) => void
  popModal: () => void
  /** Replace the entire stack (drawer-style flows). */
  setModalStack: (ids: ModalId[]) => void
  /** Sidebar open state on desktop layouts. */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export type AppState = AccountSlice & ChainSlice & UiSlice

export const useAppStore = create<AppState>((set, get) => ({
  // account
  address: null,
  setAddress: (address) => set({ address }),

  // chain
  chainId: brand.defaultChainId,
  setChainId: (chainId) => set({ chainId }),

  // ui
  modalStack: [],
  pushModal: (id) => set({ modalStack: [...get().modalStack, id] }),
  popModal: () => set({ modalStack: get().modalStack.slice(0, -1) }),
  setModalStack: (ids) => set({ modalStack: ids }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))

/** Convenience selectors — keep call sites short and re-render-friendly. */
export const selectAddress = (s: AppState) => s.address
export const selectChainId = (s: AppState) => s.chainId
export const selectTopModal = (s: AppState) =>
  s.modalStack.length ? s.modalStack[s.modalStack.length - 1] : null

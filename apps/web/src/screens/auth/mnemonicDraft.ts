/**
 * Ephemeral mnemonic draft used during the create/import flow.
 *
 * Lives in memory ONLY — never persisted to localStorage. Cleared as soon
 * as `auth.setCredentials` succeeds. If the user navigates away mid-flow
 * the draft survives in RAM until the tab closes; that's acceptable since
 * the mnemonic is not yet at-rest anywhere else.
 */
import { create } from "zustand"

interface MnemonicDraftState {
  mnemonic: string | null
  set: (m: string) => void
  clear: () => void
}

export const useMnemonicDraft = create<MnemonicDraftState>((set) => ({
  mnemonic: null,
  set: (mnemonic) => set({ mnemonic }),
  clear: () => set({ mnemonic: null }),
}))

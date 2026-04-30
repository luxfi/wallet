/**
 * Auth slice. Holds the encrypted mnemonic envelope, the PIN verifier hash,
 * and the in-memory unlock state.
 *
 * Threat model:
 *   - Mnemonic is the master secret. Never persist plaintext, never log,
 *     never analytics, never ship to any URL. Persisted form is AES-256-GCM
 *     ciphertext keyed off scrypt(PIN, salt).
 *   - PIN is verified via a SECOND, independent scrypt hash with its own
 *     salt — so a compromised verifier hash does not yield the encryption
 *     key. The two scrypt outputs are domain-separated.
 *   - `isUnlocked` and the in-memory mnemonic live ONLY in memory. Never
 *     persisted to localStorage. On tab refresh the user must re-enter PIN.
 *   - `lastUnlockedAt` is persisted (timestamp only) so the foundation
 *     router can implement idle auto-lock without us re-storing secrets.
 *
 * Persistence: zustand `persist` middleware writes to localStorage. Only
 * the encrypted envelope and the PIN verifier hash leave RAM. The
 * partialize() projection is the security boundary — review it carefully.
 */
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { decryptMnemonic, encryptMnemonic, hashPIN, verifyPIN, type EncryptedEnvelope, type PinHash } from "../lib/crypto"

export interface AuthState {
  /** AES-256-GCM ciphertext + nonce + KDF salt. Persisted. */
  encryptedMnemonic: EncryptedEnvelope | null
  /** scrypt verifier for the PIN, separate KDF salt from the encryption key. Persisted. */
  pinHash: PinHash | null
  /** True only while the tab session is unlocked. Never persisted. */
  isUnlocked: boolean
  /** Plaintext mnemonic in RAM while unlocked. Never persisted. */
  mnemonic: string | null
  /** Last successful unlock (epoch ms). Persisted (timestamp only). */
  lastUnlockedAt: number | null

  /** Initial setup — store the encrypted mnemonic and PIN verifier. */
  setCredentials: (mnemonic: string, pin: string) => Promise<void>
  /** Verify PIN, decrypt mnemonic, mark unlocked. */
  unlock: (pin: string) => Promise<boolean>
  /** Clear in-memory plaintext, keep persisted ciphertext. */
  lock: () => void
  /** Wipe everything — for "remove wallet" flows. */
  reset: () => void
}

const INITIAL: Pick<AuthState, "encryptedMnemonic" | "pinHash" | "isUnlocked" | "mnemonic" | "lastUnlockedAt"> = {
  encryptedMnemonic: null,
  pinHash: null,
  isUnlocked: false,
  mnemonic: null,
  lastUnlockedAt: null,
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setCredentials: async (mnemonic, pin) => {
        const encryptedMnemonic = await encryptMnemonic(mnemonic, pin)
        const pinHash = await hashPIN(pin)
        set({
          encryptedMnemonic,
          pinHash,
          isUnlocked: true,
          mnemonic,
          lastUnlockedAt: Date.now(),
        })
      },

      unlock: async (pin) => {
        const { pinHash, encryptedMnemonic } = get()
        if (!pinHash || !encryptedMnemonic) return false
        const ok = await verifyPIN(pin, pinHash)
        if (!ok) return false
        const mnemonic = await decryptMnemonic(encryptedMnemonic, pin)
        if (!mnemonic) return false
        set({ isUnlocked: true, mnemonic, lastUnlockedAt: Date.now() })
        return true
      },

      lock: () => set({ isUnlocked: false, mnemonic: null }),

      reset: () => set({ ...INITIAL }),
    }),
    {
      name: "lux-wallet-auth",
      storage: createJSONStorage(() => localStorage),
      // SECURITY: This is the persistence boundary. Only the at-rest fields
      // leave RAM. `mnemonic` and `isUnlocked` are explicitly excluded.
      partialize: (state) => ({
        encryptedMnemonic: state.encryptedMnemonic,
        pinHash: state.pinHash,
        lastUnlockedAt: state.lastUnlockedAt,
      }),
    },
  ),
)

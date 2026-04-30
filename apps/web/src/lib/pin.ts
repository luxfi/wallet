/**
 * PIN re-auth helper. Bridges to the auth store created in Auth-Portfolio
 * slice. The full impl uses scrypt + AES-GCM (see lib/crypto.ts). This
 * module exposes the PinAuth handle used by Send/Confirm + Settings/Backup.
 */

const PIN_RE = /^\d{6}$/

export function validatePin(pin: string): boolean {
  return PIN_RE.test(pin)
}

export interface PinAuthHandle {
  /** Returns true if the platform exposes a usable biometric auth (passkey, WebAuthn). */
  biometricAvailable(): Promise<boolean>
  /** Verifies the 6-digit PIN against the persisted envelope. */
  verifyPin(pin: string): Promise<boolean>
  /** Same as verifyPin but returns the decrypted mnemonic on success. */
  unlock(pin: string): Promise<string | null>
}

/**
 * Returns a stable handle to PIN-based reauth. The auth store + crypto
 * are lazy-imported so this module compiles even when sibling slices
 * have not merged yet.
 */
export function getPinAuth(): PinAuthHandle {
  return {
    async biometricAvailable() {
      try {
        const w = globalThis as any
        if (w?.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
          return await w.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        }
      } catch {}
      return false
    },
    async verifyPin(pin: string): Promise<boolean> {
      const m = await unlockInternal(pin)
      return m !== null
    },
    async unlock(pin: string): Promise<string | null> {
      return unlockInternal(pin)
    },
  }
}

async function unlockInternal(pin: string): Promise<string | null> {
  if (!validatePin(pin)) return null
  try {
    const [authMod, cryptoMod] = await Promise.all([
      import("../store/auth"),
      import("./crypto"),
    ])
    const useAuthStore = (authMod as any).useAuthStore
    const decryptMnemonic = (cryptoMod as any).decryptMnemonic
    const state = useAuthStore?.getState?.()
    const env = state?.encryptedEnvelope
    if (!env) return null
    const mnemonic = await decryptMnemonic(env, pin)
    return mnemonic ?? null
  } catch {
    return null
  }
}

/** Older shorter alias used by some slices. */
export const pinReauth = (pin: string) => getPinAuth().unlock(pin)

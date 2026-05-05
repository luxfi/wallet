/**
 * PIN re-authentication contract.
 *
 * Foundation Blue's auth slice owns the actual PIN storage (Argon2id KDF +
 * encrypted vault, NEVER plaintext). This module exposes the verification
 * surface every other slice needs:
 *
 *   verifyPin(pin)     — async; resolves true if `pin` decrypts the vault.
 *   changePin(old, new) — async; re-encrypts the vault under the new PIN.
 *   revealMnemonic(pin) — async; returns the decrypted BIP-39 phrase.
 *
 * Until Foundation Blue lands the real implementation, this file ships a
 * deliberate placeholder that throws on call. We refuse to ship a fake
 * "accepts any PIN" path because it would silently weaken security in dev.
 *
 * The contract is what Settings + Signing import; Foundation will replace
 * the body without touching call sites.
 */

const FOUNDATION_NOT_WIRED =
  "auth slice not wired — Foundation Blue must implement pin.ts. " +
  "This is intentional: refusing to ship a permissive stub for security."

export interface PinAuth {
  verifyPin(pin: string): Promise<boolean>
  changePin(oldPin: string, newPin: string): Promise<void>
  /** Returns the BIP-39 mnemonic. Caller MUST clear the string promptly. */
  revealMnemonic(pin: string): Promise<string>
  /** True if biometric unlock is available on this device. */
  biometricAvailable(): Promise<boolean>
}

/**
 * Foundation Blue calls `installPinAuth(realImpl)` once at boot to register
 * the actual implementation. Call sites then use `getPinAuth()`.
 */
let installed: PinAuth | null = null

export function installPinAuth(impl: PinAuth): void {
  installed = impl
}

export function getPinAuth(): PinAuth {
  if (installed) return installed
  return {
    verifyPin: async () => {
      throw new Error(FOUNDATION_NOT_WIRED)
    },
    changePin: async () => {
      throw new Error(FOUNDATION_NOT_WIRED)
    },
    revealMnemonic: async () => {
      throw new Error(FOUNDATION_NOT_WIRED)
    },
    biometricAvailable: async () => false,
  }
}

/** Constant-time string compare — used for PIN confirm-match check in UI. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Minimum PIN length enforced by Settings PIN change. */
export const MIN_PIN_LENGTH = 6
export const MAX_PIN_LENGTH = 32

export function validatePin(pin: string): string | null {
  if (pin.length < MIN_PIN_LENGTH) return `PIN must be at least ${MIN_PIN_LENGTH} digits`
  if (pin.length > MAX_PIN_LENGTH) return `PIN must be at most ${MAX_PIN_LENGTH} digits`
  if (!/^[0-9]+$/.test(pin)) return "PIN must be numeric"
  return null
}

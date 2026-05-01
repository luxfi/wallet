/**
 * Settings slice — persisted user preferences.
 *
 * Shape:
 *   - networks: per-chain RPC overrides keyed by EIP-155 id
 *   - security: biometric toggle, auto-lock timeout (minutes; null = never)
 *   - locale:   IETF language tag, "en" by default
 *   - theme:    "system" | "dark" | "light"
 *   - currency: ISO 4217 code from a fixed allowlist
 *
 * Persistence boundary: zustand `persist` writes to localStorage. Nothing
 * here is sensitive — it's UI prefs only. Auth state lives in `auth.ts`
 * with its own much stricter partialize policy.
 *
 * Threat model: this store is read by the wallet UI only. Even so, RPC
 * overrides influence which endpoint sees the user's queries; we never
 * accept or store an HTTP (non-TLS) URL — `setNetworkRpc` rejects them.
 */
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type Theme = "system" | "dark" | "light"

export const CURRENCY_CHOICES = ["USD", "EUR", "JPY", "GBP", "CHF", "CAD"] as const
export type Currency = (typeof CURRENCY_CHOICES)[number]

/**
 * Auto-lock timeout choices (minutes). `null` = never auto-lock.
 * The list is fixed so the slider in `Security.tsx` snaps cleanly.
 */
export const AUTO_LOCK_CHOICES: Array<number | null> = [1, 5, 15, 60, null]
export type AutoLockMin = (typeof AUTO_LOCK_CHOICES)[number]

export interface NetworkOverride {
  /** User-supplied RPC URL. Must be `https://...`. Empty string is rejected. */
  rpcOverride?: string
}

export interface SecurityPrefs {
  /** Whether biometric (WebAuthn) unlock is enabled in addition to PIN. */
  biometric: boolean
  /** Auto-lock idle timeout in minutes; `null` means never auto-lock. */
  autoLockMin: AutoLockMin
}

export interface SettingsState {
  networks: Record<number, NetworkOverride>
  security: SecurityPrefs
  locale: string
  theme: Theme
  currency: Currency

  setNetworkRpc: (chainId: number, url: string | undefined) => void
  setBiometric: (on: boolean) => void
  setAutoLockMin: (min: AutoLockMin) => void
  setLocale: (locale: string) => void
  setTheme: (t: Theme) => void
  setCurrency: (c: Currency) => void
}

const INITIAL: Pick<
  SettingsState,
  "networks" | "security" | "locale" | "theme" | "currency"
> = {
  networks: {},
  security: { biometric: false, autoLockMin: 5 },
  locale: "en",
  theme: "system",
  currency: "USD",
}

/** Reject URLs that aren't HTTPS — RPC overrides flow user funds, never plaintext. */
function isSafeRpcUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === "https:"
  } catch {
    return false
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setNetworkRpc: (chainId, url) => {
        const networks = { ...get().networks }
        if (!url) {
          delete networks[chainId]
        } else if (isSafeRpcUrl(url)) {
          networks[chainId] = { rpcOverride: url }
        } else {
          // Silently ignore unsafe input — UI shows the validation error.
          return
        }
        set({ networks })
      },

      setBiometric: (on) =>
        set((s) => ({ security: { ...s.security, biometric: on } })),

      setAutoLockMin: (min) =>
        set((s) => ({ security: { ...s.security, autoLockMin: min } })),

      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "lux-wallet-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        networks: state.networks,
        security: state.security,
        locale: state.locale,
        theme: state.theme,
        currency: state.currency,
      }),
    },
  ),
)

/** Read an RPC override for a chain, or `undefined` if unset. */
export function getRpcOverride(chainId: number): string | undefined {
  return useSettingsStore.getState().networks[chainId]?.rpcOverride
}

/** Validation helper exposed for the Networks screen UI. */
export function validateRpcUrl(url: string): string | null {
  if (!url.trim()) return null // empty = clear override, not an error
  if (!isSafeRpcUrl(url)) return "RPC URL must start with https://"
  return null
}

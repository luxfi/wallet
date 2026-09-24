/**
 * Settings slice — persisted user preferences.
 *
 * Shape:
 *   - security: biometric toggle, auto-lock timeout (minutes; null = never)
 *   - locale:   IETF language tag, "en" by default
 *   - theme:    "system" | "dark" | "light"
 *   - currency: ISO 4217 code from a fixed allowlist
 *
 * Persistence boundary: zustand `persist` writes to localStorage. Nothing
 * here is sensitive — it's UI prefs only. Auth state lives in `auth.ts`
 * with its own much stricter partialize policy.
 *
 * There is no per-chain RPC override: every read and send goes to the RPC
 * `brand.json` names, the same one the network list measures.
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

export interface SecurityPrefs {
  /** Whether biometric (WebAuthn) unlock is enabled in addition to PIN. */
  biometric: boolean
  /** Auto-lock idle timeout in minutes; `null` means never auto-lock. */
  autoLockMin: AutoLockMin
}

export interface SettingsState {
  security: SecurityPrefs
  locale: string
  theme: Theme
  currency: Currency

  setBiometric: (on: boolean) => void
  setAutoLockMin: (min: AutoLockMin) => void
  setLocale: (locale: string) => void
  setTheme: (t: Theme) => void
  setCurrency: (c: Currency) => void
}

const INITIAL: Pick<
  SettingsState,
  "security" | "locale" | "theme" | "currency"
> = {
  security: { biometric: false, autoLockMin: 5 },
  locale: "en",
  theme: "system",
  currency: "USD",
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...INITIAL,

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
        security: state.security,
        locale: state.locale,
        theme: state.theme,
        currency: state.currency,
      }),
    },
  ),
)

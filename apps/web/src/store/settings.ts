/**
 * Settings store — persisted user preferences.
 *
 * Shape:
 *   networks  — per-chain RPC overrides; falls back to brand.json `rpc.<chainId>`.
 *   security  — biometric toggle, auto-lock timeout in minutes (0 = never).
 *   locale    — IETF tag, e.g. `"en"`, `"ja"`, `"de"`. Defaults to navigator.language.
 *   theme     — "dark" | "light" | "system". `system` follows prefers-color-scheme.
 *   currency  — display fiat for USD/EUR/JPY/etc. price quotes from gateway.
 *
 * Persistence: zustand `persist` middleware + `localStorage` under one key
 *   (`luxfi.wallet.settings.v1`). Schema is versioned via the key suffix; on a
 *   future migration we bump to `v2` and drop v1 (one obvious way, no
 *   silent migration of unknown shapes).
 *
 * Security note: this store NEVER holds the PIN, the mnemonic, or any key
 * material. Those live in the auth slice (Foundation Blue) behind the
 * keychain / WebCrypto envelope. Settings only persists choices.
 *
 * Foundation dependency: zustand + zustand/middleware. Foundation Blue adds
 * these to `apps/web/package.json`. Until then the import fails fast at
 * build time (correct — surfaces the missing dep as a hard error rather
 * than a runtime mystery).
 */
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type Theme = "dark" | "light" | "system"

/**
 * Auto-lock minutes. `0` represents "never auto-lock" — surfaced in UI as
 * the explicit "Never" choice; we use 0 rather than null to keep the type
 * a plain number for slider math.
 */
export type AutoLockMinutes = 0 | 1 | 5 | 15 | 60
export const AUTO_LOCK_CHOICES: readonly AutoLockMinutes[] = [1, 5, 15, 60, 0]

/** ISO-4217 fiat currency codes we render quotes in. */
export type Currency = "USD" | "EUR" | "JPY" | "GBP" | "CHF" | "CAD"
export const CURRENCY_CHOICES: readonly Currency[] = [
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "CHF",
  "CAD",
]

export interface NetworkOverride {
  /** User-supplied RPC URL; `""` (empty) means "use brand default". */
  rpcOverride: string
}

export interface SecurityPrefs {
  /** Whether the device biometric is enabled as an additional unlock factor. */
  biometric: boolean
  /** Minutes of inactivity before auto-lock. 0 = never. */
  autoLockMin: AutoLockMinutes
}

export interface SettingsState {
  /** Per-chain RPC overrides keyed by EIP-155 chain id (as string). */
  networks: Record<string, NetworkOverride>
  security: SecurityPrefs
  locale: string
  theme: Theme
  currency: Currency

  setRpcOverride: (chainId: number, rpcOverride: string) => void
  clearRpcOverride: (chainId: number) => void
  setBiometric: (on: boolean) => void
  setAutoLockMin: (m: AutoLockMinutes) => void
  setLocale: (locale: string) => void
  setTheme: (theme: Theme) => void
  setCurrency: (currency: Currency) => void
  /** Wipe all preferences back to defaults. Does not touch keys/mnemonic. */
  reset: () => void
}

const detectLocale = (): string => {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.split("-")[0] || "en"
  }
  return "en"
}

const initial = {
  networks: {} as Record<string, NetworkOverride>,
  security: { biometric: false, autoLockMin: 5 } as SecurityPrefs,
  locale: detectLocale(),
  theme: "system" as Theme,
  currency: "USD" as Currency,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initial,
      setRpcOverride: (chainId, rpcOverride) =>
        set((s) => ({
          networks: {
            ...s.networks,
            [String(chainId)]: { rpcOverride },
          },
        })),
      clearRpcOverride: (chainId) =>
        set((s) => {
          const next = { ...s.networks }
          delete next[String(chainId)]
          return { networks: next }
        }),
      setBiometric: (biometric) =>
        set((s) => ({ security: { ...s.security, biometric } })),
      setAutoLockMin: (autoLockMin) =>
        set((s) => ({ security: { ...s.security, autoLockMin } })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "luxfi.wallet.settings.v1",
      storage: createJSONStorage(() => localStorage),
      // Persist only data, never the action functions.
      partialize: (s) => ({
        networks: s.networks,
        security: s.security,
        locale: s.locale,
        theme: s.theme,
        currency: s.currency,
      }),
    },
  ),
)

/**
 * Resolve the active RPC URL for a chain id. User override wins; falls back
 * to the brand-configured default. Returns `""` if neither is set — caller
 * decides how to surface "no RPC configured".
 */
export function resolveRpc(
  chainId: number,
  brandRpc: Record<string, string>,
): string {
  const override = useSettingsStore.getState().networks[String(chainId)]
    ?.rpcOverride
  if (override && override.length > 0) return override
  return brandRpc[String(chainId)] ?? ""
}

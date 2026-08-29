/**
 * Runtime brand configuration for the canonical Lux Wallet.
 *
 * Single source of truth: `brand.json` mounted via ConfigMap per deployment
 * (web), bundled per build (mobile/extension). White-label deployments
 * (Liquidity, Zoo, Pars, ...) overlay `/brand.json` without forking source.
 *
 * Pattern: identical to `~/work/lux/exchange/pkgs/config/src/brand.ts`.
 *
 * How it works:
 *   1. The default `brand.json` ships with `@luxfi/wallet-brand` (this pkg).
 *   2. The web app copies it to `public/brand.json` at build time.
 *   3. K8s mounts a ConfigMap over `/brand.json` per white-label deployment.
 *   4. The SPA calls `loadBrandConfig()` before first render.
 *   5. All brand references read from the mutable `brand` singleton.
 *
 * Secrets: API keys (WalletConnect, Insights) MUST come from KMS — never
 * commit them to brand.json. KMS injects them server-side via env vars.
 */

export interface BrandTheme {
  /** Primary accent color (buttons, links, active states) */
  accent1?: string
  accent1Hovered?: string
  accent2?: string
  accent3?: string
  surface1?: string
  surface2?: string
  surface3?: string
  neutral1?: string
  neutral2?: string
  neutral3?: string
  neutralContrast?: string
  background?: string
  statusSuccess?: string
  statusCritical?: string
  statusWarning?: string
  scrim?: string
}

/**
 * A single platform's downloadable native build. The binary `url` and the
 * native-CI–published `version` are filled per brand from `brand.json`. Store
 * links (`storeUrl`) cover iOS/Android/extension distribution. A
 * `checksumUrl` points at the published checksums/signature for verification.
 * Any field may be absent — the download page degrades to "coming soon".
 */
export interface BrandDownload {
  /** Direct binary URL (dmg/exe/msi/AppImage/deb/apk). */
  url?: string
  /** Published version string, e.g. "1.4.2". */
  version?: string
  /** App/Play/extension store link (preferred for iOS/Android/extension). */
  storeUrl?: string
  /** URL of the published checksums + signature for "verify signature". */
  checksumUrl?: string
}

/** Per-platform native download manifest, white-labeled per brand. */
export interface BrandDownloads {
  mac?: BrandDownload
  windows?: BrandDownload
  linux?: BrandDownload
  ios?: BrandDownload
  android?: BrandDownload
  /** Browser extension (Chrome/Firefox/Safari store links). */
  extension?: BrandDownload
}

export interface BrandConfig {
  /** Product name — used in titles, headers, splash screens */
  name: string
  /** HTML <title> for the SPA */
  title: string
  /** SPA meta description */
  description: string
  /** Short product abbreviation — used in compact UI labels */
  shortName: string
  /** Casual lab name — used in social/legal copy */
  labsName: string
  /** Legal entity name for Terms/Privacy */
  legalEntity: string
  /** Wallet product name (white-label override) */
  walletName: string
  /** Copyright holder name */
  copyrightHolder: string
  appDomain: string
  docsDomain: string
  gatewayDomain: string
  helpUrl: string
  termsUrl: string
  privacyUrl: string
  downloadUrl: string
  complianceEmail: string
  supportEmail: string
  /** Where a vulnerability report goes. A white-label overlays its own. */
  securityEmail: string
  twitter: string
  github: string
  discord: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  defaultChainId: number
  supportedChainIds: number[]
  walletConnectProjectId: string
  insightsHost: string
  insightsApiKey: string
  /**
   * Custody backend base URL (apps/backend). lux → https://api.lux.network.
   * One explicit, white-labelable config value — the custody client reads it
   * via `getWalletApiUrl()`. Never trailing-slashed.
   */
  walletApi: string
  /**
   * lux.id OIDC issuer for this brand. lux → https://lux.id; hanzo →
   * https://hanzo.id; zoo → https://zoo.id. Read via `getIamConfig()`.
   */
  iamIssuer: string
  /**
   * OIDC client id, by the `<org>-<app>` IAM convention. lux → `lux-wallet`.
   * This is the backend's expected audience too.
   */
  iamClientId: string
  /** Per-platform native download manifest (download page reads this). */
  downloads?: BrandDownloads
  /** Theme color overrides for dark and light modes */
  theme?: {
    light?: BrandTheme
    dark?: BrandTheme
  }
}

export interface RuntimeConfig {
  brand: Partial<BrandConfig>
  chains: {
    defaultChainId: number
    supported: number[]
  }
  rpc: Record<string, string>
  api: {
    gateway: string
    insights: string
  }
  walletConnect: {
    projectId: string
  }
}

// Mutable singleton — updated by `loadBrandConfig()` from `/brand.json`.
// Defaults are deliberately blank; the shipped `brand.json` provides the
// real Lux Wallet defaults. White-label deployments override at runtime.
export const brand: BrandConfig = {
  name: "",
  title: "",
  description: "",
  shortName: "",
  labsName: "",
  legalEntity: "",
  walletName: "",
  copyrightHolder: "",
  appDomain: "",
  docsDomain: "",
  gatewayDomain: "",
  helpUrl: "",
  termsUrl: "",
  privacyUrl: "",
  downloadUrl: "",
  complianceEmail: "",
  supportEmail: "",
  securityEmail: "",
  twitter: "",
  github: "",
  discord: "",
  logoUrl: "",
  faviconUrl: "/favicon.ico",
  primaryColor: "#FFFFFF",
  defaultChainId: 96369,
  supportedChainIds: [],
  walletConnectProjectId: "",
  insightsHost: "",
  insightsApiKey: "",
  walletApi: "",
  iamIssuer: "",
  iamClientId: "",
}

export let runtimeConfig: RuntimeConfig | null = null

/**
 * Load brand config from `/brand.json` and mutate the `brand` singleton.
 * Call once before React renders. Safe to call from native targets — it
 * no-ops gracefully when `fetch` or `document` are unavailable.
 *
 * Resolution order:
 *   1. `/brand.json` (web/extension) — ConfigMap-mounted in K8s.
 *   2. Bundled `brand.json` (mobile) — passed via `overrides` arg.
 *   3. Defaults from this module.
 */
export async function loadBrandConfig(overrides?: Partial<RuntimeConfig>): Promise<RuntimeConfig> {
  let config: RuntimeConfig = {
    brand: {},
    chains: { defaultChainId: brand.defaultChainId, supported: brand.supportedChainIds },
    rpc: {},
    api: { gateway: "", insights: brand.insightsHost },
    walletConnect: { projectId: "" },
  }

  if (typeof fetch === "function") {
    try {
      const res = await fetch("/brand.json")
      if (res.ok) {
        config = (await res.json()) as RuntimeConfig
      }
    } catch {
      // Fetch failed (file:// scheme, native target, dev without server) — fall through.
    }
  }

  if (overrides) {
    config = {
      ...config,
      ...overrides,
      brand: { ...config.brand, ...overrides.brand },
      chains: { ...config.chains, ...overrides.chains },
      api: { ...config.api, ...overrides.api },
      walletConnect: { ...config.walletConnect, ...overrides.walletConnect },
    }
  }

  if (config.brand) {
    Object.assign(brand, config.brand)
  }

  // Derive convenience fields from name if not explicitly set.
  const baseName = brand.name.replace(/\s*wallet\s*/i, "").trim()
  if (!brand.shortName && baseName) {
    brand.shortName = baseName.length <= 3 ? baseName.toUpperCase() : baseName
  }
  if (!brand.labsName && baseName) {
    brand.labsName = baseName + " Labs"
  }
  if (!brand.walletName && baseName) {
    brand.walletName = brand.shortName + " Wallet"
  }
  if (!brand.copyrightHolder && brand.legalEntity) {
    brand.copyrightHolder = brand.legalEntity
  }

  // Custody backend + IAM are explicit per-brand values, but derive sane
  // defaults from the gateway domain so a minimal brand.json still works.
  // `api.lux.network` → wallet-api host `wallet-api.lux.network`, issuer
  // `https://<rootDomain>.id` style is brand-specific so we only derive the
  // wallet-api host here; iamIssuer/iamClientId must be set explicitly.
  if (!brand.walletApi && brand.gatewayDomain) {
    const root = brand.gatewayDomain.replace(/^api\./, "")
    brand.walletApi = `https://api.${root}`
  }
  // Strip any accidental trailing slash — the custody client joins paths raw.
  if (brand.walletApi) {
    brand.walletApi = brand.walletApi.replace(/\/+$/, "")
  }
  if (brand.iamIssuer) {
    brand.iamIssuer = brand.iamIssuer.replace(/\/+$/, "")
  }

  if (config.chains) {
    brand.defaultChainId = config.chains.defaultChainId ?? brand.defaultChainId
    brand.supportedChainIds = config.chains.supported ?? brand.supportedChainIds
  }
  if (config.walletConnect?.projectId) {
    brand.walletConnectProjectId = config.walletConnect.projectId
  }
  if (config.api?.insights) {
    brand.insightsHost = config.api.insights
  }

  // Apply DOM mutations (web/extension only — mobile no-ops).
  if (typeof document !== "undefined") {
    if (config.brand?.title) {
      document.title = config.brand.title
    }
    if (config.brand?.faviconUrl) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
      if (link) {
        link.href = config.brand.faviconUrl
      }
    }
    // Overwrite the static (Lux-default) meta description so a white-label
    // deploy never serves a stale brand in <head>.
    if (config.brand?.description) {
      const meta = document.querySelector("meta[name='description']") as HTMLMetaElement | null
      if (meta) meta.content = config.brand.description
    }
    if (config.brand?.primaryColor) {
      const tc = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null
      if (tc) tc.content = config.brand.primaryColor
    }
    if (brand.theme && typeof window !== "undefined") {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches
      const bt = prefersDark ? brand.theme.dark : brand.theme.light
      if (bt) {
        const root = document.documentElement
        const set = (prop: string, val?: string) => {
          if (val) root.style.setProperty(prop, val)
        }
        set("--accent1", bt.accent1)
        set("--accent1Hovered", bt.accent1Hovered)
        set("--accent2", bt.accent2)
        set("--accent3", bt.accent3)
        set("--surface1", bt.surface1)
        set("--surface2", bt.surface2)
        set("--surface3", bt.surface3)
        set("--neutral1", bt.neutral1)
        set("--neutral2", bt.neutral2)
        set("--neutral3", bt.neutral3)
        set("--neutralContrast", bt.neutralContrast)
        set("--statusSuccess", bt.statusSuccess)
        set("--statusCritical", bt.statusCritical)
        if (bt.background || bt.surface1) {
          root.style.setProperty("background", bt.background ?? bt.surface1 ?? "")
        }
      }
    }
  }

  runtimeConfig = config
  return config
}

/** Build a fully-qualified app URL — `https://<appDomain><path>`. */
export function getBrandUrl(path: string): string {
  return `https://${brand.appDomain}${path}`
}

/** Build a fully-qualified gateway URL — `https://<gatewayDomain><path>`. */
export function getGatewayUrl(path: string): string {
  return `https://${brand.gatewayDomain}${path}`
}

/**
 * Bootnode RPC URL for a Lux-network chain. White-labels override per chain
 * via `runtimeConfig.rpc[<chainId>]`. The bootnode pattern (vs. Quicknode)
 * keeps RPC traffic on Lux infra and lets each deployment pin its own gateway.
 *
 * Pattern: `https://<gatewayDomain>/v1/rpc/<chainId>` is the default, but
 * overrides in `brand.json:rpc` win.
 */
export function getBootnodeRpcUrl(chainId: number): string | undefined {
  const override = runtimeConfig?.rpc?.[String(chainId)]
  if (override) return override
  if (!brand.gatewayDomain) return undefined
  return `https://${brand.gatewayDomain}/v1/rpc/${chainId}`
}

export function getApiUrl(key: keyof RuntimeConfig["api"]): string {
  return runtimeConfig?.api?.[key] ?? ""
}

/**
 * Custody backend base URL for this brand — the ONLY way the web app resolves
 * `apps/backend`. lux → `https://api.lux.network`. White-labels set
 * `brand.json:brand.walletApi`; absent, it is derived from `gatewayDomain`.
 * Returns "" only when neither is configured (caller must guard).
 */
export function getWalletApiUrl(): string {
  return brand.walletApi
}

/** OIDC config for this brand's lux.id IAM (issuer + client id). */
export interface IamConfig {
  issuer: string
  clientId: string
}

/**
 * lux.id OIDC config for this brand. lux → `{issuer: https://lux.id,
 * clientId: lux-wallet}`. The clientId is the backend's expected audience by
 * the `<org>-<app>` convention. Both come from `brand.json` (no derivation —
 * issuers are brand-specific TLDs).
 */
export function getIamConfig(): IamConfig {
  return { issuer: brand.iamIssuer, clientId: brand.iamClientId }
}

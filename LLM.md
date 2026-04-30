# `@luxfi/wallet` — AI Assistant Knowledge Base

**Project**: `luxfi/wallet` — canonical Lux Wallet upstream (web + mobile + extension).
**Org**: Lux Industries Inc. (`luxfi`).
**Status**: `apps/web` builds clean. `apps/{extension,mobile}` retain upstream-shaped
src that requires an app-level refactor to compile against current `@l.x/*` npm
packages. The canonical bones (`pkgs/{wallet,brand,analytics}`) are stable.

## Canonical structure

```
luxfi/wallet/
├── apps/
│   ├── web/             — Vite 8 SPA, React 19, brand-aware. Builds in <100ms.
│   ├── extension/       — Chrome/Firefox MV3 (upstream-shaped; app-refactor pending).
│   └── mobile/          — React Native + Expo (upstream-shaped; app-refactor pending).
├── pkgs/
│   ├── wallet/          — `@luxfi/wallet` — canonical wallet feature bones.
│   ├── brand/           — `@luxfi/wallet-brand` — runtime white-label config.
│   └── analytics/       — `@luxfi/wallet-analytics` — provider-pluggable analytics.
├── SCREENS.md           — UX spec freeze (2025-12-15).
└── LEGACY.md            — Sibling repos (wallet-legacy, wwallet, xwallet) to archive.
```

## Build commands (verified working)

```bash
pnpm install --no-frozen-lockfile
pnpm --dir apps/web build      # Vite SPA — clean. Output in apps/web/dist/.
```

`apps/{extension,mobile}` build via Nx targets that depend on workspace
packages still upstream-shaped (`@universe/*`, `wallet/*` direct paths) and
will not type-check or build until refactored to consume the npm-published
`@l.x/*` and the workspace `@luxfi/wallet`. Track in this file when fixed.

## White-label brand pattern (canonical)

Brand config flows at runtime, not build time. Same pattern as
`~/work/lux/exchange/pkgs/config/src/brand.ts`.

```
@luxfi/wallet-brand/brand.json   ─copy→  apps/web/dist/brand.json
                                                │
                                                ↓
                                  K8s ConfigMap mount overlays
                                                │
                                                ↓
                                  loadBrandConfig() fetches /brand.json
                                                │
                                                ↓
                                  mutates `brand` singleton + CSS vars
                                                │
                                                ↓
                                  React renders against final brand
```

White-labels (Liquidity, Zoo, Pars) override `/brand.json` via a K8s
ConfigMap — no source fork required. Theme tokens are CSS custom properties
(`--accent1`, `--surface1`, etc.) so the same DOM tree renders any brand.

## Analytics pattern (canonical)

`@luxfi/wallet-analytics` provides a provider-pluggable `AnalyticsDriver`
interface. No third-party SDK loaded by default. Hanzo Insights is the
intended default driver (registered at app bootstrap). White-labels swap
drivers at boot via `setAnalyticsDriver(...)`. Surface matches what wallet
call sites expect (`init`/`track`/`identify`/`Identify`/...).

## RPC pattern (canonical)

`getBootnodeRpcUrl(chainId)` from `@luxfi/wallet-brand` is the **only** way
to resolve an RPC endpoint. Default is `https://<gatewayDomain>/v1/rpc/<chainId>`
with `runtimeConfig.rpc[<chainId>]` overrides honored first. No Quicknode,
no Alchemy direct. White-labels point at their own gateway (e.g.,
`gw.lux.exchange/v1/rpc/96369`).

## Direct dependency hygiene

- **Zero `@datadog/*` direct deps** in any app `package.json` or `pkgs/*`.
  (Transitive deps via `@l.x/utils` and `@l.x/lx` remain — those are upstream
  packages and will be cleaned in their own pkg releases.)
- **Zero `@amplitude/*` direct deps**.
- **Zero `@uniswap/*` direct deps** (forked to `@luxamm/*` per commit `81b2ba3e`).
- **Zero `getQuicknodeEndpointUrl` references** in our source — only the
  string literal `'quicknode'` exists in error-matching test fixtures.

## Workspace catalog (`pnpm-workspace.yaml`)

`@hanzogui/*-fork.1` aliases for React Native packages. The `@hanzogui` prefix
is the internal umbrella name (NEVER write "Tamagui" — see
`feedback_no_tamagui_brand.md`). Product brand for the GUI library is
`@hanzo/gui`.

## Known transitive type errors (NOT our bug)

`@l.x/api`, `@l.x/lx`, `@l.x/utils`, `@l.x/config` ship as raw `.ts` files
and reference a rootless `utilities/src/*` module that doesn't exist on disk.
This means `tsc --noEmit` against `pkgs/wallet/` traces into `node_modules/.pnpm/@l.x+*`
and produces ~5000 errors. **These are upstream-publishing bugs in the `@l.x/*`
packages** — they need to ship `.d.ts` artifacts and self-resolved imports.
Filed as a follow-up; lux/wallet does not patch upstream packages.

The web SPA builds because Vite tree-shakes — only used surface is touched.

## Sibling repos (see LEGACY.md)

- `~/work/lux/wallet-legacy` — OneKey-fork lineage. BRAND_PACKAGE pattern absorbed → archive.
- `~/work/lux/wwallet` — bespoke SDK line. Superseded by `@l.x/api` → archive.
- `~/work/lux/xwallet` — OKX-fork lineage. Hardware support already removed → archive.
- `~/work/lux/dwallet` — Desktop product. **Independent**, do not fold in.

## Rules for AI Assistants

1. **NEVER** write random summary files — update `LLM.md` only.
2. **NEVER** commit symlinked files (.AGENTS.md, CLAUDE.md, etc.) — they're in `.gitignore`.
3. **NEVER** introduce direct `@datadog/*`/`@amplitude/*`/`@uniswap/*` deps —
   use the abstractions in `pkgs/analytics` and `@luxamm/*`.
4. **NEVER** reference `getQuicknodeEndpointUrl` — use `getBootnodeRpcUrl`.
5. **NEVER** hardcode brand strings (`"Lux Wallet"`, `"lux.network"`) in app code —
   read from the `brand` singleton in `@luxfi/wallet-brand`.
6. **NEVER** write "Tamagui" — use "@hanzo/gui" / `@hanzogui/*` umbrella.
7. **ALWAYS** preserve BIP44 path 9000 for Lux P/X chain addresses in any
   key derivation (60 for EVM C-chain).
8. **ALWAYS** keep the GPL-3.0-or-later license header — wallet inherits it.

---

**Single source of truth** for AI assistants on `luxfi/wallet`. Update this file
when behavior changes; never spawn parallel `.md` documents.

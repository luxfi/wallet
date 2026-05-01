# Legacy Wallet Repos — Superseded by `@luxfi/wallet`

This document lists the sibling wallet repositories under `~/work/lux/` that
are superseded by this canonical monorepo (`luxfi/wallet`). They should be
archived (move to `archive/luxfi/wallet-*` GitHub orgs or set archived=true).

The canonical product is `@luxfi/wallet` (this repo, `pkgs/wallet`) consumed
by `apps/{web,mobile,extension}`. White-label users (Liquidity, Zoo, Pars)
pin a stable `UPSTREAM_REF` against `luxfi/wallet@<sha>` instead of forking.

## Status of each sibling repo

### `~/work/lux/wallet-legacy/` — `@luxwallet/monorepo`

- **Lineage**: Fork of OneKey wallet (`@onekeyhq/*` workspace names visible in
  `package.json` scripts).
- **What was unique**: The `BRAND_PACKAGE` env-var pattern (commit `2805c90b`)
  that fetches `brand.json` from a published npm brand package at container
  startup. **This pattern is now canonical** — implemented as `pkgs/brand/`
  and wired into `apps/web` via `loadBrandConfig()`. White-label deployments
  override `/brand.json` via K8s ConfigMap — same surface as the legacy
  `BRAND_PACKAGE` env var, with cleaner dev ergonomics.
- **Other features**: TEE/GPU support for regenesis (commit `4faa58f9`).
  Out of scope for the wallet — that work belongs in `~/work/lux/genesis`.
- **Verdict**: Archive. Brand pattern absorbed.

### `~/work/lux/wwallet/` — `luxfi/wwallet` — ARCHIVED LOCAL 2026-04-30

- **Lineage**: Bespoke Lux wallet line — `app/` (Vue 3 + vue-cli SPA),
  `web/` (Next.js 13 React port — partial, never shipped), `components/`
  (4 Vue UI primitives), `sdk/` (rollup-built TypeScript SDK published as
  `@luxfi/wallet-sdk@0.20.29` on npm).
- **Inventory at archival**: 217 `.vue` (35,992 LoC), 287 `.ts` (24,045 LoC),
  22 `.js` (1,281 LoC), 31 locale JSONs (~14k LoC), 8 SCSS, 48 SVG. Total
  ~95k LoC including JSON across ~650 source files.
- **Migration audit (2026-04-30)**: Walked every directory under
  `wwallet/{app,web,components,sdk}`. **Zero files ported.** Decision matrix:

  | wwallet asset | Canonical equivalent | Decision |
  |---|---|---|
  | `app/` Vue 3 monolith (`Wallet.vue`, Earn, Studio, Manage, Access, Create) | `apps/web` Vite + React + `pkgs/wallet` features | DROP — Vue forbidden; "React-only on web; never reintroduce Vue" |
  | `web/` Next.js 13 React port (settings/keys/send/cross-chain/earn/portfolio/activity/onboard) | `apps/web` Vite SPA (settings/auth/send/bridge/stake/portfolio/swap/dapps/confidential/receive/signing) | DROP — superseded by canonical Vite SPA on broader feature set |
  | `web/src/lib/networks.ts` (LUX_MAINNET/TESTNET hardcoded consts, Q-Chain stub) | `apps/web/src/config/wagmi.ts` brand-driven, 11 chains incl. Q-Chain (36911) and F-Chain (494949) | DROP — already covered with brand.json runtime overlay |
  | `web/src/lib/wallet-sdk.ts` (thin facade over `@luxfi/wallet-sdk`) | `apps/web/src/screens/bridge/useBridgeExecute.ts` + `screens/stake/useStake.ts` (Foundation signer pattern, brand-routed) | DROP — canonical uses cleaner Foundation signer trust boundary |
  | `components/` (BigNumInput, CopyText, QrInput, QrReader Vue) | `@hanzo/gui` v7 (aliased to `apps/web/src/lib/gui-stub.tsx`) | DROP — primitives covered, Vue forbidden |
  | `sdk/` standalone (Asset/Csv/Explorer/History/Keystore/Network/UniversalTx/Wallet) — published as `@luxfi/wallet-sdk@0.20.29` on npm | `@l.x/api@1.0.8` (canonical SDK surface) + the same `@luxfi/wallet-sdk` already on npm | DROP — SDK already published; canonical apps consume `@l.x/api` |
  | `app/src/locales/*.json` (31 languages, 740-line en.json keyed against legacy Vue UI) | `pkgs/wallet/src/features/i18n/deviceLocaleWatcherSaga.ts` (locale detection only) | DROP — keys target Vue1-era UI labels; no overlap with canonical screen text. Re-translation belongs to a fresh i18n pass against current strings, not a migration of stale ones |
  | `app/src/ERC20Tokenlist.json`, `ERC721Tokenlist.json` | `pkgs/chains/` + token registries from `@l.x/api` | DROP — wwallet lists target chainId 43114 (Avalanche) which is wrong product surface for the Lux wallet |
  | `app/src/components/wallet/{studio,advanced/{SignMessage,VerifyMessage},earn/StakingCalculator,portfolio/Collectibles}` | Not in canonical web v0.1 (per SCREENS.md spec freeze 2025-12-15) | DROP — these features are out of scope for the new wallet UX. Re-add (if desired) belongs to a fresh design pass against `@hanzo/gui` v7 primitives, not a Vue→React translation of stale code |
  | Cypress E2E suite (`app/cypress/`) | Canonical uses Playwright in `apps/extension/e2e/` and Maestro on mobile | DROP — wrong test runner for the canonical bones |
  | Static brand strings (Lux-only, hardcoded RPC URLs) | `@luxfi/wallet-brand` runtime brand.json + ConfigMap overlay | DROP — superseded by white-label runtime config |

- **Why zero ported**: the canonical `luxfi/wallet` monorepo (this repo)
  already covers every feature wwallet had, with a stricter security model
  (Foundation signer separation, brand-routed RPC, no static chain consts),
  cleaner workspace (`pkgs/{analytics,brand,chains,wallet}` vs scattered
  rollup-built sibling packages), and the SDK already published on npm.
  wwallet's only differentiator vs the canonical was its larger feature
  surface (NFTs, staking calculator, sign/verify message, NFT minting
  studio) — but those are out of the SCREENS.md spec for v0.1 and would
  land as React-on-`@hanzo/gui`, not as ports of Vue components.

- **Archival actions taken (2026-04-30)**:
  ```bash
  mv ~/work/lux/wwallet ~/work/lux/.wwallet-archived-2026-04-30   # done
  ```
  Local copy retained at `~/work/lux/.wwallet-archived-2026-04-30/` (NOT
  `rm -rf`'d).

- **GitHub archival pending — needs org admin**:
  `gh repo archive luxfi/wwallet --yes` ran from account `zatsch` returned
  `does not have the correct permissions to execute ArchiveRepository`.
  An admin of the `luxfi` GitHub org needs to run, or grant zatsch admin:
  ```bash
  gh repo archive luxfi/wwallet --yes
  ```
  Or, if full deletion is desired (irreversible):
  ```bash
  gh repo delete luxfi/wwallet --yes
  ```
- **Verdict**: Archived.

### `~/work/lux/xwallet/` — `@luxwallet/x`

- **Lineage**: Fork of OKX wallet extension (commits reference `OK-29867`,
  `OK-29384` ticket numbers — that's OKX's internal Jira).
- **What was unique**: BitBox02 hardware-wallet pairing and Matomo tracking
  vendor files (commit `0edeb2f` removed them as unused). Lux mainnet/testnet
  chain configs (`8287b50`).
- **Why not absorbed**: BitBox02 + Matomo are explicitly removed in the most
  recent commit. Chain configs are now consumed from `@luxfi/wallet-brand`'s
  `brand.json:rpc` map, not hardcoded constants. The OKX-fork lineage diverges
  too far from the canonical `@luxfi/wallet` bones.
- **Verdict**: Archive.

### `~/work/lux/dwallet/` — `lux-desktop`

- **Out of scope** for this wallet repo. Desktop is a separate product line
  (Electron/Tauri). Kept independent.
- **Verdict**: Keep as separate product, do NOT fold in.

## What this repo IS canonical for

```
luxfi/wallet (this repo)
├── apps/
│   ├── web/         — Vite SPA. Builds clean.
│   ├── extension/   — Chrome/Firefox MV3 (upstream-shaped, requires app refactor)
│   └── mobile/      — React Native + Expo (upstream-shaped, requires app refactor)
├── pkgs/
│   ├── wallet/      — `@luxfi/wallet` — canonical wallet feature bones
│   ├── brand/       — `@luxfi/wallet-brand` — runtime white-label config
│   └── analytics/   — `@luxfi/wallet-analytics` — provider-pluggable analytics
└── SCREENS.md       — UX spec freeze (2025-12-15)
```

## Downstream consumption

White-label deployments pin `UPSTREAM_REF` to a `luxfi/wallet@<sha>`:

```dockerfile
# In a downstream wallet repo/Dockerfile (in-flight elsewhere)
ARG UPSTREAM_REF=<sha-from-this-repo>
RUN git clone --depth 1 https://github.com/luxfi/wallet.git \
 && cd wallet \
 && git fetch --depth 1 origin "$UPSTREAM_REF" \
 && git checkout "$UPSTREAM_REF"
```

The same pattern as `a downstream swap repo` shimming `luxfi/exchange`.

## Archival action items

| Repo | Local | GitHub | Notes |
|---|---|---|---|
| `luxfi/wallet-legacy` | pending | pending | `gh repo archive luxfi/wallet-legacy --yes` (needs org admin) |
| `luxfi/wwallet` | done — `~/work/lux/.wwallet-archived-2026-04-30/` | pending | `gh repo archive luxfi/wwallet --yes` (needs org admin; `zatsch` lacks permission) |
| `luxfi/xwallet` | pending | pending | `gh repo archive luxfi/xwallet --yes` (needs org admin) |

All three remain as GitHub repos with full git history — archival is
non-destructive and reversible. Deletion is irreversible (`gh repo delete <name> --yes`)
and only run on explicit instruction.

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

### `~/work/lux/wwallet/` — `luxfi/wwallet`

- **Lineage**: Bespoke Lux wallet line — `apps/{app,web}` + `components/` +
  a standalone `sdk/` (rollup-built TypeScript SDK).
- **What was unique**: A standalone TS SDK with `audits/`, `typedoc.json`,
  rollup build, and Cypress E2E. Recent commits trended toward purging
  PostHog and porting analytics to `@hanzo/insights`.
- **Why not absorbed**: The canonical wallet uses the `@l.x/api` (npm-published)
  for SDK surface and the new `pkgs/analytics` driver abstraction supersedes
  the PostHog/Insights wiring. The SDK in `wwallet/sdk/` is older and
  duplicates what's now in the published `@l.x/*` packages.
- **Verdict**: Archive.

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

## Archival action items (NOT performed by this Blue)

The CTO/user makes the call on archival. Suggested actions:

1. `gh repo archive luxfi/wallet-legacy`
2. `gh repo archive luxfi/wwallet`
3. `gh repo archive luxfi/xwallet`

All three remain as GitHub repos with full git history — archival is
non-destructive and reversible.

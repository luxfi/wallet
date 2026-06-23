# `@luxfi/wallet`

**Project**: `luxfi/wallet` — canonical Lux Wallet upstream (web + mobile + extension + backend).
**Org**: Lux Industries Inc. (`luxfi`).
**Status**: `apps/web` builds clean. `apps/backend` (Go MPC custody server) builds
+ tests green (17 tests). `apps/{extension,mobile}` retain upstream-shaped src
that requires an app-level refactor to compile against current `@l.x/*` npm
packages. The canonical bones (`pkgs/{wallet,brand,analytics}`) are stable.

> The freshly-scaffolded MIT TS shared core lives in a SEPARATE org —
> `github.com/luxwallet/*` (`@luxwallet/{chains,rpc,crypto,keyring,tx,sdk}`,
> + `connect`, `ui`, `desktop`, native ios/android/mobile-rn). That is the
> cross-target shared core; `luxfi/wallet` here is the GPL product monorepo
> (web/extension/mobile FE + this Go custody backend + PQ stack). The backend's
> custody port mirrors `@luxwallet/keyring`'s account model + the lux/mpc
> `client.Threshold` security contract.

## Canonical structure

```
luxfi/wallet/
├── apps/
│   ├── web/             — Vite 8 SPA, React 19, brand-aware. Builds in <100ms.
│   ├── backend/         — Go MPC custody server (App(Wallet) backend). See below.
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

## Foundation slice (apps/web shell)

`apps/web` is the Vite SPA shell. Provider tree:

```
GuiProvider → QueryClientProvider → WagmiProvider → RouterProvider
```

- `src/main.tsx` — awaits `loadBrandConfig()` before first render.
- `src/App.tsx` — wraps the four providers above.
- `src/router.tsx` — react-router-dom v7 with lazy-loaded screen modules.
- `src/components/AppShell.tsx` — top bar + side drawer + Outlet.
- `src/components/ChainSwitcher.tsx` — native `<select>` over `brand.supportedChainIds`.
- `src/components/GuiProvider.tsx` — passthrough today; swap to `HanzoguiProvider`
  once `@hanzo/gui@7` republishes its missing `dist/` artifact.
- `src/config/wagmi.ts` — `buildWagmiConfig()` reads `brand.supportedChainIds`
  and resolves transports via `getBootnodeRpcUrl(chainId)`. Chains without a
  resolvable RPC are dropped — never `http("")`.
- `src/config/queryClient.ts` — 30 s stale, retries off, no focus refetch.
- `src/store/index.ts` — zustand `account` / `chain` / `ui` slices owned by
  Foundation. Other slices (`auth`, `send`, `swap`, `stake`) are sibling files
  owned by other Blues.
- `src/hooks/useAccount.ts` — wagmi + zustand union; the only `useAccount`
  screens should import.
- `src/hooks/useBrand.ts` — `() => brand` for React-friendly typing.

Screen Blues fill `src/screens/{name}/index.tsx`; today each is a labelled
placeholder so the build is clean and merges are pure file replacements.

## Custody + lux.id auth wiring (apps/web)

The web app talks to the MPC custody backend (`apps/backend`, `wallet-api.<brand>`)
authenticated via lux.id. One way, three thin layers:

- `src/lib/iam.ts` — lux.id OIDC Authorization-Code + **PKCE** (Web Crypto only,
  no dep). Issuer + clientId come from the brand (`getIamConfig()`); the
  callback is `/auth/callback`. Tokens live in **sessionStorage** (survive a tab
  reload, gone on close; never localStorage, never logged). `getAccessToken()`
  refreshes on expiry. The Go backend verifies this same issuer + audience and
  derives the org from the token's `owner` claim.
- `src/lib/custody.ts` — typed client for `/v1/wallets`, `/v1/wallets/{id}`,
  `/v1/wallets/{id}/sign`. Matches `internal/api/api.go` + `custody.*` JSON
  exactly. Attaches `Authorization: Bearer`; **never sends org** (server-side
  only). `signPayload` requires a non-empty `idempotencyKey` (anti-replay) and
  refuses to send without one. Validates returned EVM addresses (EIP-55) at the
  boundary. `fetchImpl` is injectable for tests.
- `src/store/session.ts` — lux.id session + custody wallets + `signWithCustody`.
  `App.tsx` calls `hydrate()` on boot (restore token → list wallets).
- `src/screens/signing/SigningModal.tsx` — on confirm, a tx carrying
  `custody.payloadHash` requests the MPC signature and resolves
  `SigningResult.signature`; a custody failure resolves `reason:"error"` (no
  silent noop). The local-key path (no `custody` field) is unchanged. **Tx
  broadcast is a typed seam** — the modal returns the signature; assembling +
  broadcasting the signed tx via `getBootnodeRpcUrl` is the calling slice's job
  (not yet wired into Send/Swap; no `// TODO`, the seam is explicit).

Brand gained three explicit fields (in `pkgs/brand/src/index.ts` + every
`brand.json`): `walletApi` (custody base URL), `iamIssuer`, `iamClientId`
(`<org>-wallet`), plus an optional `downloads` manifest. Helpers:
`getWalletApiUrl()`, `getIamConfig()`.

## /download screen (per-brand host)

`src/screens/download/` renders the per-brand native-download page served at
`wallet.<brand>/download` (client-routed; the SPA server's index.html fallback
covers it). Logo + name from the `brand` singleton; a grid of macOS/Windows/
Linux/iOS/Android/extension reads `brand.downloads` (binary `url` or `storeUrl`
+ `version` + `checksumUrl` for "Verify signature"); a missing platform shows
"Coming soon". Binaries are published by the native CI fleet (NO GHA).

## Tests (apps/web) — Node built-in runner

`pnpm --dir apps/web test`. Runner = Node's stdlib `node:test` (the repo's one
way; no vitest dep) via `tools/ts-resolve.mjs`, a synchronous resolve hook that
maps bundler-style extensionless `.ts` imports for the loader (Node 22+ strips
types natively). The script covers `src/{lib,store,screens/dapps}/**/*.test.ts`
(63 tests). `src/screens/_shared/runtime.test.ts` is a JSX import probe for
`tsc --noEmit` (its own header), not a runtime test — it stays in `typecheck`.
New suites: `lib/custody.test.ts` (12 — bearer attached, no-org, exact
endpoints/bodies, idempotency required, boundary validation, error mapping),
`lib/brand.test.ts` (6 — each brand overlay → correct name/chain/logo/walletApi/
issuer, total swap, downloads present).

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
- **Zero `@luxamm/*` direct deps** (forked to `@luxamm/*` per commit `81b2ba3e`).
- **Zero `getQuicknodeEndpointUrl` references** in our source — only the
  string literal `'quicknode'` exists in error-matching test fixtures.

## Workspace catalog (`pnpm-workspace.yaml`)

`@hanzogui/*-fork.1` aliases for React Native packages. The `@hanzogui` prefix
is the internal umbrella name. Product brand for the GUI library is `@hanzo/gui`.

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

## `apps/backend` — App(Wallet) custody server (Go)

The wallet's BACKEND. A small Go HTTP service that gives the wallet a custody
account model with **MPC custody — NO plaintext keys, ever**. The private key
is split t-of-n across the MPC nodes (lux → `mpc.lux.network`) and is never
assembled; this service stores only public keys + addresses.

```
apps/backend/
├── cmd/wallet-backend/main.go   — env config, graceful shutdown, JSON logging
└── internal/
    ├── iam/      — lux.id OIDC bearer verify (JWKS discovery, RS256/ES256,
    │              alg-confusion-safe). Org from the `owner` claim. (golang-jwt/v5)
    ├── custody/  — the custody PORT (Custodian iface) + MPC HTTP adapter to
    │              lux/mpc (/keygen + /sign). Mirrors lux/mpc client.Threshold's
    │              security contract (idempotency required, org-scoped). PQ-ready
    │              (Scheme mldsa65 is first-class).
    ├── store/    — wallet↔org↔addresses (no key field). Org-scoped reads (a
    │              cross-org get is ErrNotFound — no existence disclosure).
    └── api/      — /v1/* HTTP (no /api/ prefix). IAM-gated, org-scoped:
                    POST /v1/wallets · GET /v1/wallets · GET /v1/wallets/{id} ·
                    POST /v1/wallets/{id}/sign · GET /v1/health (open).
```

Run: `cd apps/backend && go test ./...` (17 tests). Build standalone with
`GOWORK=off go build ./cmd/wallet-backend` (the monorepo go.work also lists it).
Deploy: build-only `.platform.yml` (repo root) → `ghcr.io/luxfi/wallet-backend`;
the lux operator rolls `apps/backend/k8s/wallet-backend.yaml` (lux.cloud/v1
Service + KMSSecret for `MPC_SERVICE_TOKEN`), ingress `wallet-api.lux.network`.

White-label is per-tenant + per-env injection — `IAM_ISSUER` (lux → lux.id),
`IAM_AUDIENCE` (`<org>-wallet`), `MPC_ENDPOINT` (lux → mpc.lux.network; shared
hanzo-mpc or BYOMPC). Same binary, any brand. PQ crypto is NOT duplicated here —
ML-DSA/SLH-DSA live in `pkgs/wallet/.../pq` and on the consensus/precompile side;
the custody layer just carries `mldsa65` as a scheme through to MPC.

## App(Wallet) spec — for the unified operator (`App` Kind)

The unified web3 operator's `App` Kind deploys the wallet, white-labeled by
domain. The wallet App is **two deployables**, one OSS core, branded per tenant:

| Part | What | Image | Host |
|------|------|-------|------|
| Web wallet | `apps/web` Vite SPA, runtime brand.json (no source fork) | `ghcr.io/luxfi/wallet-web` | `wallet.<brand>` |
| Custody backend | `apps/backend` Go MPC custody server | `ghcr.io/luxfi/wallet-backend` | `wallet-api.<brand>` |

`App(Wallet)` CR shape (operator renders Service(s) + Ingress + KMSSecret):

```yaml
apiVersion: lux.cloud/v1
kind: App
metadata: { name: lux-wallet }
spec:
  kind: wallet              # curated view: balances/send/receive/PQ identity
  source: { mode: native }  # native luxwallet | override → tenant fork
  web:    { image: ghcr.io/luxfi/wallet-web,     host: wallet.lux.network }
  backend:{ image: ghcr.io/luxfi/wallet-backend, host: wallet-api.lux.network }
  iam:    https://lux.id              # per-tenant (lux→lux.id)
  mpc:    https://mpc.lux.network     # per-tenant: shared hanzo-mpc | BYOMPC
  chainDefault: 96369                 # Lux C-Chain
```

Custody = the `MPC` Kind (shared or BYO). The wallet App references {iam, mpc}
endpoints; the operator wires the KMSSecret (`MPC_SERVICE_TOKEN`). Native
binaries (mac/win/linux/ios/android/extension) build on the NATIVE CI fleet
(lux arcd, NO GHA) + codesign via `hanzoai/ci-signing/sign-<plat>@v1`, per
brand, served from the per-brand download page on `wallet.<brand>`. The native
shells live in the `luxwallet/*` org (desktop/ios/android/extension); they embed
the shared `@luxwallet/sdk` core and point at this backend for custody.

**Web deploy manifests** — `apps/web/k8s/` is a Kustomize base + 3 brand
overlays (`overlays/{lux,hanzo,zoo}`). Base = `lux.cloud/v1 Service` for
`ghcr.io/luxfi/wallet-web` (port 3000, `imagePullSecrets: ghcr-luxfi`,
`/` health). Each overlay sets `namespace`, ingress host
(`wallet.{lux.network,hanzo.ai,zoo.ngo}`), `brand: <b>` label, the pinned image
tag, and a `configMapGenerator` over that dir's `brand.json` (`brand` volume →
`/public/brand.json`, `disableNameSuffixHash` since the volume ref is in a
custom CR). The brand `brand.json` files in `overlays/<b>/` are the SINGLE
source — the brand-swap test reads them directly. Build: `kubectl kustomize
apps/web/k8s/overlays/<b>`. Serving = house `ghcr.io/hanzoai/spa` (scratch,
:3000, SPA fallback → index.html, so `/download` client-routes). Apps/web image
+ backend image both built by `.platform.yml` (now a 2-entry build list).

## Rules for AI Assistants

1. **NEVER** write random summary files — update `LLM.md` only.
2. **NEVER** commit symlinked files (.AGENTS.md, CLAUDE.md, etc.) — they're in `.gitignore`.
3. **NEVER** introduce direct `@datadog/*`/`@amplitude/*`/`@luxamm/*` deps —
   use the abstractions in `pkgs/analytics` and `@luxamm/*`.
4. **NEVER** reference `getQuicknodeEndpointUrl` — use `getBootnodeRpcUrl`.
5. **NEVER** hardcode brand strings (`"Lux Wallet"`, `"lux.network"`) in app code —
   read from the `brand` singleton in `@luxfi/wallet-brand`.
6. **NEVER** write the banned forked-UI brand — use "@hanzo/gui" / `@hanzogui/*` umbrella.
7. **ALWAYS** preserve BIP44 path 9000 for Lux P/X chain addresses in any
   key derivation (60 for EVM C-chain).
8. **ALWAYS** keep the GPL-3.0-or-later license header — wallet inherits it.
9. **ALWAYS** route PQ crypto through `pkgs/wallet/src/features/wallet/pq/` —
   ML-DSA / ML-KEM / SLH-DSA / hybrid / HD-PQ derivation / domain separators /
   precompile encoders all live there. Re-export from `apps/web/src/lib/pq.ts`.

## PQ stack (LP-4200, FIPS 203/204/205)

Canonical entry: `pkgs/wallet/src/features/wallet/pq/index.ts`. Web facade:
`apps/web/src/lib/pq.ts`. React hook: `apps/web/src/hooks/usePQIdentity.ts`.

| Module          | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| `pqAccount.ts`  | shape, cSHAKE AccountID, MLDSAProvider iface, HD-path strings |
| `domain.ts`     | FIPS-204 ctx strings (evm-precompile, x-chain-utxo, …)        |
| `mldsa.ts`      | ML-DSA-44/65/87 providers via @noble/post-quantum             |
| `mlkem.ts`      | ML-KEM-512/768/1024 KEM providers                             |
| `slhdsa.ts`     | SLH-DSA-128f/192f/192s/256f providers                         |
| `hybrid.ts`     | Ed25519∥ML-DSA + secp256k1∥ML-DSA containers (luxfi/sdk-compat)|
| `hdPq.ts`       | BIP32 → expandChildSeed → ML-DSA/SLH-DSA keypair               |
| `precompile.ts` | eth_call wrappers for 0x012201/02/03                          |

Tests run via `pnpm --dir pkgs/wallet exec jest --config jest.pq.config.js`
(standalone — bypasses the upstream-shaped jest-expo preset that's still
pending refactor). 71 tests passing as of 2026-05-18.

---

**Single source of truth** for AI assistants on `luxfi/wallet`. Update this file
when behavior changes; never spawn parallel `.md` documents.

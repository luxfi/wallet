# wallet-web — the App(Wallet) web SPA (apps/web), the brand-aware
# self-custodial wallet UI. Built by platform native CI (NO GitHub Actions),
# served by the house static SPA server `ghcr.io/hanzoai/spa` (SPA fallback:
# index.html for every route, so client-routed paths like /download work).
# White-label brand.json is mounted over /public/brand.json by a K8s ConfigMap
# per deployment — no source fork. Build context is the monorepo root.
#
# NO nginx, NO caddy — `ghcr.io/hanzoai/spa` serves /public on :3000.

# ── Build stage: pnpm install (web app + its workspace deps) + vite build ──
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Workspace manifests first for a cached install layer. Only the packages the
# web app actually needs are present in the build graph; the upstream-shaped
# apps/{extension,mobile} are filtered out of the install.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY pkgs/brand/package.json pkgs/brand/
COPY pkgs/analytics/package.json pkgs/analytics/
COPY pkgs/wallet/package.json pkgs/wallet/

# Install the web app's dependency closure plus @luxfi/wallet (the PQ stack
# `src/lib/pq.ts` re-exports from it — a build-time import even though it is not
# a declared dep). The `...` selector pulls each package's own deps; the
# heavy/upstream-shaped parts of @luxfi/wallet are tree-shaken by Vite (only the
# `features/wallet/pq` subtree + @noble/post-quantum are reached).
# --ignore-scripts: no native postinstalls needed for the SPA build.
RUN pnpm install \
      --filter "@luxfi/wallet-web..." \
      --filter "@luxfi/wallet..." \
      --no-frozen-lockfile --ignore-scripts

# Sources for the web app + the workspace packages it imports.
COPY pkgs/brand/ pkgs/brand/
COPY pkgs/analytics/ pkgs/analytics/
COPY pkgs/wallet/ pkgs/wallet/
COPY apps/web/ apps/web/

# Root tsconfig.base.json — the workspace packages (pkgs/*) each `extends` it.
# Vite 8's rolldown/oxc TS transform resolves the extends chain at build time and
# hard-fails ("Tsconfig not found /app/tsconfig.base.json") if the base is absent,
# so it MUST be present in the build context. (Local `vite build` masks this: it
# runs against the full repo tree where the base already exists.)
COPY tsconfig.base.json ./

# Vite build → apps/web/dist (copyBrandJson plugin writes dist/brand.json from
# pkgs/brand/brand.json; the ConfigMap overlay replaces it at deploy time).
RUN pnpm --filter "@luxfi/wallet-web" build

# ── Runtime: house static SPA server (scratch-based, :3000, /public) ──
FROM ghcr.io/hanzoai/spa
COPY --from=build /app/apps/web/dist /public

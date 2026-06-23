/**
 * Brand white-label proof.
 *
 * Loads each of the three deployed brand overlays (the SINGLE source of truth:
 * apps/web/k8s/overlays/<brand>/brand.json — exactly the file the K8s ConfigMap
 * mounts over /public/brand.json per deployment) through the real
 * `loadBrandConfig()` and asserts the `brand` singleton reflects THAT brand's
 * identity: name, default chain, logo, custody backend, and lux.id issuer.
 * This is the "correct logo + default chain per brand" verification.
 *
 * Runner: Node built-in (`node --test`) via tools/ts-resolve.mjs. No DOM —
 * `loadBrandConfig` no-ops its document/window mutations under Node, and fetch
 * fails → it falls through to the `overrides` we pass (the overlay JSON), which
 * is exactly how a ConfigMap-mounted brand.json flows in production.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  loadBrandConfig,
  brand,
  getWalletApiUrl,
  getIamConfig,
  getBootnodeRpcUrl,
  type RuntimeConfig,
} from "@luxfi/wallet-brand"

const HERE = dirname(fileURLToPath(import.meta.url))
// Canonical per-brand overlay = the kustomize ConfigMap source for that brand.
const OVERLAYS_DIR = resolve(HERE, "../../k8s/overlays")

function overlay(name: string): RuntimeConfig {
  return JSON.parse(readFileSync(resolve(OVERLAYS_DIR, name, "brand.json"), "utf8")) as RuntimeConfig
}

interface Expected {
  name: string
  walletName: string
  defaultChainId: number
  logoUrl: string
  walletApi: string
  iamIssuer: string
  iamClientId: string
}

const EXPECTED: Record<string, Expected> = {
  lux: {
    name: "Lux",
    walletName: "Lux Wallet",
    defaultChainId: 96369,
    logoUrl: "/brands/lux.svg",
    walletApi: "https://wallet-api.lux.network",
    iamIssuer: "https://lux.id",
    iamClientId: "lux-wallet",
  },
  hanzo: {
    name: "Hanzo",
    walletName: "Hanzo Wallet",
    defaultChainId: 36963,
    logoUrl: "/brands/hanzo.svg",
    walletApi: "https://wallet-api.hanzo.ai",
    iamIssuer: "https://hanzo.id",
    iamClientId: "hanzo-wallet",
  },
  zoo: {
    name: "Zoo",
    walletName: "Zoo Wallet",
    defaultChainId: 200200,
    logoUrl: "/brands/zoo.svg",
    walletApi: "https://wallet-api.zoo.ngo",
    iamIssuer: "https://zoo.id",
    iamClientId: "zoo-wallet",
  },
}

for (const [name, want] of Object.entries(EXPECTED)) {
  test(`brand overlay: ${name} → correct identity, logo, default chain`, async () => {
    await loadBrandConfig(overlay(name))

    assert.equal(brand.name, want.name, "name")
    assert.equal(brand.walletName, want.walletName, "walletName")
    assert.equal(brand.defaultChainId, want.defaultChainId, "defaultChainId")
    assert.equal(brand.logoUrl, want.logoUrl, "logoUrl")
    assert.equal(getWalletApiUrl(), want.walletApi, "walletApi")

    const iam = getIamConfig()
    assert.equal(iam.issuer, want.iamIssuer, "iamIssuer")
    assert.equal(iam.clientId, want.iamClientId, "iamClientId")

    // The default chain must be in the supported set and resolve an RPC.
    assert.ok(
      brand.supportedChainIds.includes(want.defaultChainId),
      "default chain in supportedChainIds",
    )
    assert.ok(getBootnodeRpcUrl(want.defaultChainId), "default chain resolves an RPC")
  })
}

test("brand overlay: Lux default chain is 96369 (C-Chain), not another brand's", async () => {
  await loadBrandConfig(overlay("lux"))
  assert.equal(brand.defaultChainId, 96369)
  assert.notEqual(brand.defaultChainId, EXPECTED.hanzo.defaultChainId)
  assert.notEqual(brand.defaultChainId, EXPECTED.zoo.defaultChainId)
})

test("brand swap is total: loading zoo after lux replaces every field", async () => {
  await loadBrandConfig(overlay("lux"))
  assert.equal(brand.name, "Lux")
  await loadBrandConfig(overlay("zoo"))
  // No Lux residue after switching to Zoo.
  assert.equal(brand.name, "Zoo")
  assert.equal(brand.logoUrl, "/brands/zoo.svg")
  assert.equal(getIamConfig().issuer, "https://zoo.id")
  assert.equal(getWalletApiUrl(), "https://wallet-api.zoo.ngo")
})

test("brand overlay: downloads manifest present per brand", async () => {
  await loadBrandConfig(overlay("lux"))
  assert.ok(brand.downloads, "downloads present")
  assert.ok(brand.downloads?.mac?.url?.includes("lux.network"), "mac url branded")
  assert.ok(brand.downloads?.ios?.storeUrl, "ios store link present")
})

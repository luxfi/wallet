/**
 * The offered list is what the brand serves AND what answers. Loaded through
 * the real `loadBrandConfig()` from the Lux overlay (what wallet.lux.network
 * is published with), with `fetch` standing in for the RPC fronts.
 *
 * Runner: Node's built-in test runner via tools/ts-resolve.mjs.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { loadBrandConfig, getBootnodeRpcUrl, type RuntimeConfig } from "@luxfi/wallet-brand"
import { answers, assertAvailable, declaredNetworks, offeredNetworks } from "./networks"

const HERE = dirname(fileURLToPath(import.meta.url))
const overlay = (name: string): RuntimeConfig =>
  JSON.parse(
    readFileSync(resolve(HERE, "../../k8s/overlays", name, "brand.json"), "utf8"),
  ) as RuntimeConfig
const DEFAULT = JSON.parse(
  readFileSync(resolve(HERE, "../../../../pkgs/brand/brand.json"), "utf8"),
) as RuntimeConfig

/** Answer eth_chainId from a table of url → hex id; anything else fails. */
function fronts(table: Record<string, string | number>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    const v = table[url]
    if (v === undefined) throw new TypeError("fetch failed")
    if (typeof v === "number") return new Response("down", { status: v })
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: v }), { status: 200 })
  }) as typeof fetch
}

const real = globalThis.fetch

test("Lux lists only Lux's own chains and the external EVMs, no SPC, Pars or devnet", async () => {
  for (const cfg of [overlay("lux"), DEFAULT]) {
    await loadBrandConfig(cfg)
    const ids = declaredNetworks().map((n) => n.id)
    assert.deepEqual(ids, [96369, 96368, 1, 42161, 8453, 137, 43114])
    for (const gone of [36911, 36910, 494949, 7071, 200200, 36963]) {
      assert.equal(ids.includes(gone), false, `${gone} listed`)
    }
  }
})

test("Lux mainnet is marked unavailable, with the reason", async () => {
  await loadBrandConfig(overlay("lux"))
  const main = declaredNetworks().find((n) => n.id === 96369)
  assert.match(main?.unavailable ?? "", /not producing blocks/i)
  assert.throws(() => assertAvailable(96369), /Lux C-Chain is unavailable\. Not producing blocks/)
  assert.doesNotThrow(() => assertAvailable(42161))
})

test("every declared chain names the RPC it answers on; nothing is derived", async () => {
  await loadBrandConfig(overlay("lux"))
  for (const n of declaredNetworks()) assert.ok(getBootnodeRpcUrl(n.id), `${n.id} has no rpc`)
  // A chain with no declared RPC is not served — no guessed /v1/rpc/<id>.
  assert.equal(getBootnodeRpcUrl(36911), undefined)
})

test("a chain is offered only when its RPC answers with its own id", async () => {
  await loadBrandConfig(overlay("lux"))
  globalThis.fetch = fronts({
    "https://api.lux.network/v1/chain/C/rpc": "0x17871",
    "https://api.lux-test.network/v1/chain/C/rpc": "0x17870",
    "https://eth.llamarpc.com": 525, // front down
    "https://arb1.arbitrum.io/rpc": "0xa4b1",
    "https://mainnet.base.org": "0x2105",
    "https://polygon-rpc.com": 401, // key disabled
    "https://api.avax.network/ext/bc/C/rpc": "0x1", // answers, wrong chain
  })
  try {
    const offered = await offeredNetworks()
    assert.deepEqual(
      offered.map((n) => n.id),
      [96369, 96368, 42161, 8453],
    )
    // Unavailable is not the same as absent: mainnet answers reads, so it stays.
    assert.ok(offered.find((n) => n.id === 96369)?.unavailable)
  } finally {
    globalThis.fetch = real
  }
})

test("answers() is false on a timeout, not a hang", async () => {
  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "TimeoutError")))
    })) as typeof fetch
  try {
    assert.equal(await answers(96369, "https://slow.example", 50), false)
  } finally {
    globalThis.fetch = real
  }
})

test("Zoo and Hanzo name the RPC path their chains answer on", async () => {
  await loadBrandConfig(overlay("zoo"))
  assert.equal(getBootnodeRpcUrl(200200), "https://api.zoo.network/v1/chain/zoo/rpc")
  assert.equal(getBootnodeRpcUrl(200201), "https://api.zoo-test.network/v1/chain/zoo/rpc")
  await loadBrandConfig(overlay("hanzo"))
  assert.equal(getBootnodeRpcUrl(36963), "https://api.hanzo.network/v1/chain/hanzo/rpc")
  assert.equal(declaredNetworks().some((n) => n.id === 36911), false, "SPC has no node")
})

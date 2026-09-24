/**
 * The offered list is what the brand serves AND what answers, and a chain is
 * unavailable when its own latest block says it stopped. Loaded through the
 * real `loadBrandConfig()` from the overlays each wallet is published with,
 * with `fetch` standing in for the RPC fronts.
 *
 * Runner: Node's built-in test runner via tools/ts-resolve.mjs.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { loadBrandConfig, getBootnodeRpcUrl, getApiUrl, type RuntimeConfig } from "@luxfi/wallet-brand"
import { assertAvailable, declaredChainIds, measure, offeredNetworks, STALLED_AFTER_MS } from "./networks"

const HERE = dirname(fileURLToPath(import.meta.url))
const overlay = (name: string): RuntimeConfig =>
  JSON.parse(
    readFileSync(resolve(HERE, "../../k8s/overlays", name, "brand.json"), "utf8"),
  ) as RuntimeConfig
const DEFAULT = JSON.parse(
  readFileSync(resolve(HERE, "../../../../pkgs/brand/brand.json"), "utf8"),
) as RuntimeConfig

const NOW = Date.now()
const hex = (ms: number) => `0x${Math.floor(ms / 1000).toString(16)}`

/**
 * A front per url: `[chainIdHex, latestBlockMs]` answers both calls, a number
 * is an HTTP status, and a url not in the table fails like a dead host.
 */
function fronts(table: Record<string, [string, number] | number>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const v = table[String(input)]
    if (v === undefined) throw new TypeError("fetch failed")
    if (typeof v === "number") return new Response("down", { status: v })
    const { method } = JSON.parse(String(init?.body)) as { method: string }
    const result = method === "eth_chainId" ? v[0] : { number: "0x1", timestamp: hex(v[1]) }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 })
  }) as typeof fetch
}

const real = globalThis.fetch
async function withFronts<T>(table: Parameters<typeof fronts>[0], fn: () => Promise<T>): Promise<T> {
  globalThis.fetch = fronts(table)
  try {
    return await fn()
  } finally {
    globalThis.fetch = real
  }
}

const LUX_FRONTS = {
  "https://api.lux.network/v1/chain/C/rpc": ["0x17871", Date.UTC(2025, 5, 17, 18, 55)], // halted
  "https://api.lux-test.network/v1/chain/C/rpc": ["0x17870", NOW - 5_000], // live
  "https://eth.llamarpc.com": 525, // front down
  "https://arb1.arbitrum.io/rpc": ["0xa4b1", NOW - 1_000],
  "https://mainnet.base.org": ["0x2105", NOW - 2_000],
  "https://polygon-rpc.com": 401, // key disabled
  "https://api.avax.network/ext/bc/C/rpc": ["0x1", NOW], // answers, wrong chain
} satisfies Parameters<typeof fronts>[0]

test("Lux declares only Lux's own chains and the external EVMs, no SPC, Pars or devnet", async () => {
  for (const cfg of [overlay("lux"), DEFAULT]) {
    await loadBrandConfig(cfg)
    const ids = declaredChainIds()
    assert.deepEqual(ids, [96369, 96368, 1, 42161, 8453, 137, 43114])
    for (const gone of [36911, 36910, 494949, 7071, 200200, 36963]) {
      assert.equal(ids.includes(gone), false, `${gone} listed`)
    }
  }
})

test("every declared chain names the RPC it answers on; nothing is derived", async () => {
  await loadBrandConfig(overlay("lux"))
  for (const id of declaredChainIds()) assert.ok(getBootnodeRpcUrl(id), `${id} has no rpc`)
  // A chain with no declared RPC is not served — no guessed /v1/rpc/<id>.
  assert.equal(getBootnodeRpcUrl(36911), undefined)
})

test("unavailable is measured from the chain's latest block, not declared", async () => {
  await loadBrandConfig(overlay("lux"))
  await withFronts(LUX_FRONTS, async () => {
    const main = await measure(96369, 1000, NOW)
    assert.match(main?.unavailable ?? "", /^No block since 2025-06-17\./)
    const test_ = await measure(96368, 1000, NOW)
    assert.equal(test_?.unavailable, undefined, "a chain producing blocks is available")
  })
  // The same chain, resumed: nothing to edit, it is available again.
  await withFronts({ ...LUX_FRONTS, "https://api.lux.network/v1/chain/C/rpc": ["0x17871", NOW - 3_000] }, async () => {
    assert.equal((await measure(96369, 1000, NOW))?.unavailable, undefined)
  })
  // An external chain that halts is marked the same way.
  await withFronts({ ...LUX_FRONTS, "https://arb1.arbitrum.io/rpc": ["0xa4b1", NOW - STALLED_AFTER_MS - 60_000] }, async () => {
    assert.match((await measure(42161, 1000, NOW))?.unavailable ?? "", /^No block since /)
  })
})

test("a chain is offered only when its RPC answers with its own id", async () => {
  await loadBrandConfig(overlay("lux"))
  const offered = await withFronts(LUX_FRONTS, () => offeredNetworks(1000))
  assert.deepEqual(
    offered.map((n) => n.id),
    [96369, 96368, 42161, 8453],
  )
  // Unavailable is not the same as absent: mainnet answers reads, so it stays.
  assert.ok(offered.find((n) => n.id === 96369)?.unavailable)
})

test("signing asks the chain first and refuses one that is down or halted", async () => {
  await loadBrandConfig(overlay("lux"))
  await withFronts(LUX_FRONTS, async () => {
    await assert.rejects(assertAvailable(96369), /Lux C-Chain is unavailable\. No block since 2025-06-17/)
    await assert.rejects(assertAvailable(137), /is unavailable\. Its RPC does not answer\./)
    await assert.doesNotReject(assertAvailable(42161))
  })
})

test("measure() is null on a timeout, not a hang", async () => {
  await loadBrandConfig(overlay("lux"))
  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "TimeoutError")))
    })) as typeof fetch
  try {
    assert.equal(await measure(96369, 50), null)
  } finally {
    globalThis.fetch = real
  }
})

test("Zoo and Hanzo name the RPC path their chains answer on", async () => {
  await loadBrandConfig(overlay("zoo"))
  assert.equal(getBootnodeRpcUrl(200200), "https://api.zoo.network/v1/chain/zoo/rpc")
  assert.equal(getBootnodeRpcUrl(200201), "https://api.zoo-test.network/v1/chain/zoo/rpc")
  for (const other of [96369, 96368, 36963]) {
    assert.equal(declaredChainIds().includes(other), false, `Zoo lists ${other}`)
  }
  await loadBrandConfig(overlay("hanzo"))
  assert.equal(getBootnodeRpcUrl(36963), "https://api.hanzo.network/v1/chain/hanzo/rpc")
  assert.equal(declaredChainIds().includes(36911), false, "SPC has no node")
})

test("no brand serves a confidential gateway, so none is offered", async () => {
  for (const cfg of [overlay("lux"), overlay("zoo"), overlay("hanzo"), DEFAULT]) {
    await loadBrandConfig(cfg)
    assert.equal(getApiUrl("confidential"), "")
  }
})

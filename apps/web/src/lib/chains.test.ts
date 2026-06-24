/**
 * chains adapter tests — proves the wallet reads chain metadata from the
 * canonical `@luxwallet/chains` registry (not a hardcoded list).
 *
 * Runner: Node's built-in test runner (`node --test`) — the repo's one way.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { chainLabel, evmChainDef, evmChainIds, registryChains } from "./chains"

test("registry exposes the full ecosystem chain set", () => {
  const ids = registryChains().map((c) => c.id)
  // Every family the wallet must recognise and hold.
  for (const id of [
    "lux-c-mainnet", "lux-dex", "zoo-mainnet", "hanzo-mainnet", "spc-mainnet", "pars-mainnet",
    "ethereum", "arbitrum", "base", "polygon", "avalanche",
    "lux-x-mainnet", "lux-p-mainnet", "lux-q-mainnet", "lux-z-mainnet",
    "bitcoin", "solana", "ton", "xrp", "polkadot",
  ]) {
    assert.ok(ids.includes(id), `registry missing ${id}`)
  }
  // 20 mandatory + the testnets/extras the registry currently ships.
  assert.ok(registryChains().length >= 20)
})

test("chainLabel comes from the registry for ecosystem L1s", () => {
  assert.equal(chainLabel(96369), "Lux C-Chain")
  assert.equal(chainLabel(200200), "Zoo")
  assert.equal(chainLabel(36963), "Hanzo")
  assert.equal(chainLabel(1), "Ethereum")
  assert.equal(chainLabel(8453), "Base")
})

test("chainLabel falls back to `Chain {id}` for an unknown id", () => {
  assert.equal(chainLabel(999999), "Chain 999999")
})

test("evmChainIds includes every bridge EVM chain", () => {
  const ids = evmChainIds()
  for (const id of [96369, 96368, 96370, 200200, 36963, 36911, 494949, 1, 42161, 8453, 137, 43114]) {
    assert.ok(ids.includes(id), `missing EVM chain ${id}`)
  }
  // Non-EVM families must NOT appear as EVM ids.
  assert.equal(ids.includes(0), false)
})

test("evmChainDef shapes a viem Chain from the registry (name + native asset)", () => {
  const def = evmChainDef(96369)
  assert.ok(def)
  assert.equal(def!.id, 96369)
  assert.equal(def!.name, "Lux C-Chain")
  assert.equal(def!.nativeCurrency.symbol, "LUX")
  assert.equal(def!.nativeCurrency.decimals, 18)
})

test("evmChainDef attaches a block explorer where known", () => {
  const eth = evmChainDef(1)
  assert.equal(eth!.blockExplorers?.default.url, "https://etherscan.io")
})

test("evmChainDef returns undefined for a non-EVM family (bitcoin)", () => {
  // bitcoin is registry id "bitcoin" with no evmChainId; by EIP-155 lookup
  // there is no chain at id 0, so the wagmi builder skips it.
  assert.equal(evmChainDef(0), undefined)
})

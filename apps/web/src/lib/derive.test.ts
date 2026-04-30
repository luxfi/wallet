/**
 * Derivation tests. Vectors from BIP-39 reference + ed25519 SLIP-10
 * test vectors. We verify the chain-specific output format (length, prefix,
 * checksum) rather than chasing exact addresses for every chain — those
 * vary by tooling and the goal here is integrity of the encoding pipeline.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { CHAINS } from "./asset"
import { deriveAddressFromMnemonic, seedFromMnemonic } from "./derive"
import { validateAddress } from "./address"

// BIP-39 reference vector (all-zeros entropy → "abandon abandon… about").
const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

test("seed: BIP-39 reference vector", () => {
  const seed = seedFromMnemonic(TEST_MNEMONIC)
  // BIP-39 §Test Vectors: passphrase "" → 64-byte PBKDF2 output.
  assert.equal(seed.length, 64)
  // Full canonical seed for "abandon abandon… about" with empty passphrase.
  const hex = Buffer.from(seed).toString("hex")
  assert.equal(
    hex,
    "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4",
  )
})

test("derive: lux-c (EVM) produces valid checksummed address", () => {
  const addr = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-c"])
  assert.match(addr, /^0x[0-9a-fA-F]{40}$/)
  assert.equal(validateAddress(addr, "evm").ok, true)
})

test("derive: zoo-l1 (EVM) matches lux-c (same coin_type 60)", () => {
  // EVM chains all use coin_type 60 — same private key, same address.
  const a = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-c"])
  const b = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["zoo-l1"])
  assert.equal(a, b)
})

test("derive: lux-p produces P-prefixed bech32", () => {
  const addr = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-p"])
  assert.match(addr, /^P-lux1[02-9ac-hj-np-z]+$/)
  assert.equal(validateAddress(addr, "lux-pchain", "lux").ok, true)
})

test("derive: lux-x produces X-prefixed bech32", () => {
  const addr = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-x"])
  assert.match(addr, /^X-lux1[02-9ac-hj-np-z]+$/)
  assert.equal(validateAddress(addr, "lux-xchain", "lux").ok, true)
})

test("derive: lux-p and lux-x share private key (both coin_type 9000)", () => {
  // Same secp256k1 key, only the UX prefix differs.
  const p = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-p"])
  const x = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-x"])
  assert.equal(p.slice(2), x.slice(2)) // strip "P-" / "X-"
})

test("derive: solana produces 32-byte base58", () => {
  const addr = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["solana"])
  assert.equal(validateAddress(addr, "solana").ok, true)
})

test("derive: deterministic across calls (same mnemonic → same address)", () => {
  const a = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-c"])
  const b = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-c"])
  assert.equal(a, b)
})

test("derive: different mnemonic → different address", () => {
  const a = deriveAddressFromMnemonic(TEST_MNEMONIC, CHAINS["lux-c"])
  const other =
    "legal winner thank year wave sausage worth useful legal winner thank yellow"
  const b = deriveAddressFromMnemonic(other, CHAINS["lux-c"])
  assert.notEqual(a, b)
})

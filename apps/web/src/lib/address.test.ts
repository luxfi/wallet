/**
 * Address validation tests. Run with `node --test --import tsx`.
 *
 * Vectors are pulled from the canonical specs:
 *   EIP-55  → https://eips.ethereum.org/EIPS/eip-55
 *   BIP-173 → https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  validateEvmAddress,
  validateBech32,
  validateSolanaAddress,
  validateAddress,
} from "./address"

/* ───── EIP-55 ─────────────────────────────────────────────────────────── */

test("EIP-55: empty rejected", () => {
  assert.equal(validateEvmAddress("").ok, false)
})

test("EIP-55: too short rejected", () => {
  assert.equal(validateEvmAddress("0xabc").ok, false)
})

test("EIP-55: missing 0x rejected", () => {
  assert.equal(validateEvmAddress("52908400098527886E0F7030069857D2E4169EE7").ok, false)
})

test("EIP-55: all-lower accepted", () => {
  // No checksum present → accepted as un-checksummed.
  assert.equal(validateEvmAddress("0x52908400098527886e0f7030069857d2e4169ee7").ok, true)
})

test("EIP-55: all-upper accepted", () => {
  assert.equal(validateEvmAddress("0x52908400098527886E0F7030069857D2E4169EE7").ok, true)
})

test("EIP-55: valid checksum (vitalik)", () => {
  // From EIP-55 reference vectors.
  assert.equal(validateEvmAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed").ok, true)
})

test("EIP-55: corrupted checksum rejected", () => {
  // flip case on one char → must reject.
  const r = validateEvmAddress("0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")
  assert.equal(r.ok, false)
})

/* ───── bech32 ─────────────────────────────────────────────────────────── */

test("bech32: BIP-173 reference vector accepted", () => {
  // From BIP-173 spec — "A12UEL5L" with hrp "a".
  assert.equal(validateBech32("A12UEL5L", "a").ok, true)
})

test("bech32: wrong HRP rejected", () => {
  assert.equal(validateBech32("A12UEL5L", "z").ok, false)
})

test("bech32: corrupted checksum rejected", () => {
  // mutate last char.
  assert.equal(validateBech32("A12UEL5K", "a").ok, false)
})

test("bech32: mixed case rejected", () => {
  assert.equal(validateBech32("A12UeL5L", "a").ok, false)
})

test("bech32: Lux X-prefix accepted", () => {
  // Strip "X-" then validate body.
  // A12UEL5L body with HRP "a" — synthetic test.
  assert.equal(validateBech32("X-A12UEL5L", "a").ok, true)
})

/* ───── base58 (Solana) ────────────────────────────────────────────────── */

test("base58: too short rejected", () => {
  assert.equal(validateSolanaAddress("abc").ok, false)
})

test("base58: invalid char (0/O/I/l) rejected", () => {
  assert.equal(validateSolanaAddress("0".repeat(32)).ok, false)
})

test("base58: known Solana address accepted", () => {
  // System program address — well-known 32-byte all-zeros pubkey.
  assert.equal(validateSolanaAddress("11111111111111111111111111111111").ok, true)
})

test("base58: 44-char address accepted", () => {
  // Wrapped SOL token mint — a real mainnet 32-byte pubkey.
  assert.equal(
    validateSolanaAddress("So11111111111111111111111111111111111111112").ok,
    true,
  )
})

/* ───── dispatcher ─────────────────────────────────────────────────────── */

test("dispatch: evm kind", () => {
  assert.equal(
    validateAddress("0x52908400098527886e0f7030069857d2e4169ee7", "evm").ok,
    true,
  )
})

test("dispatch: lux requires HRP", () => {
  assert.equal(validateAddress("X-A12UEL5L", "lux-xchain").ok, false) // missing HRP arg
  assert.equal(validateAddress("X-A12UEL5L", "lux-xchain", "a").ok, true)
})

test("dispatch: solana", () => {
  assert.equal(
    validateAddress("11111111111111111111111111111111", "solana").ok,
    true,
  )
})

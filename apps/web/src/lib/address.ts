/**
 * Per-chain address validation. Pure, no IO, fully synchronous.
 *
 *   EVM   → 0x-prefixed 20-byte hex with EIP-55 mixed-case checksum
 *   Lux   → bech32 (BIP-173) over the chain's HRP, with `P-` / `X-` UX prefix
 *   Sol   → base58 of a 32-byte Ed25519 public key
 *
 * Validators return a discriminated result so callers can both gate the
 * Sign button and surface a precise error inline.
 */
import { keccak_256 } from "@noble/hashes/sha3"
import { bytesToHex } from "@noble/hashes/utils"
import type { ChainKind } from "./asset"

export type Validation =
  | { ok: true }
  | { ok: false; reason: string }

const HEX_RE = /^0x[0-9a-fA-F]{40}$/

/** EIP-55 checksum check. Accepts all-lower or properly checksummed input. */
export function validateEvmAddress(addr: string): Validation {
  if (!addr) return { ok: false, reason: "Address required" }
  if (!HEX_RE.test(addr)) return { ok: false, reason: "Not a valid 0x address" }
  const body = addr.slice(2)
  const lower = body.toLowerCase()
  // All-lower or all-upper is treated as un-checksummed (acceptable).
  if (body === lower || body === body.toUpperCase()) return { ok: true }

  // Proper EIP-55: keccak256(lower-hex bytes); for each char, nibble >=8 → upper.
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lower)))
  for (let i = 0; i < 40; i++) {
    const c = body[i]
    const expectUpper = parseInt(hash[i], 16) >= 8
    if (expectUpper && c !== c.toUpperCase()) {
      return { ok: false, reason: "Bad checksum (EIP-55)" }
    }
    if (!expectUpper && c !== c.toLowerCase()) {
      return { ok: false, reason: "Bad checksum (EIP-55)" }
    }
  }
  return { ok: true }
}

/* ───── Bech32 (BIP-173) — minimal verifier ───────────────────────────── */

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]

function bech32Polymod(values: number[]): number {
  let chk = 1
  for (const v of values) {
    const top = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= BECH32_GEN[i]
  }
  return chk
}

function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = []
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5)
  out.push(0)
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31)
  return out
}

/** Verify a bech32 string under expected HRP. CONST=1 (not bech32m). */
export function validateBech32(s: string, expectedHrp: string): Validation {
  if (!s) return { ok: false, reason: "Address required" }
  // Lux X/P-Chain UX prefix: "X-" or "P-" before bech32 body.
  const stripped = s.length > 2 && s[1] === "-" ? s.slice(2) : s
  if (stripped !== stripped.toLowerCase() && stripped !== stripped.toUpperCase()) {
    return { ok: false, reason: "Mixed case not allowed" }
  }
  const lower = stripped.toLowerCase()
  const sep = lower.lastIndexOf("1")
  if (sep < 1 || sep + 7 > lower.length || lower.length > 90) {
    return { ok: false, reason: "Malformed bech32" }
  }
  const hrp = lower.slice(0, sep)
  if (hrp !== expectedHrp) {
    return { ok: false, reason: `Expected HRP "${expectedHrp}", got "${hrp}"` }
  }
  const data: number[] = []
  for (let i = sep + 1; i < lower.length; i++) {
    const idx = BECH32_CHARSET.indexOf(lower[i])
    if (idx < 0) return { ok: false, reason: "Invalid character" }
    data.push(idx)
  }
  if (bech32Polymod([...bech32HrpExpand(hrp), ...data]) !== 1) {
    return { ok: false, reason: "Bad checksum" }
  }
  return { ok: true }
}

/* ───── Base58 (Solana 32-byte Ed25519 pubkey) ────────────────────────── */

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

export function validateSolanaAddress(addr: string): Validation {
  if (!addr) return { ok: false, reason: "Address required" }
  if (addr.length < 32 || addr.length > 44) {
    return { ok: false, reason: "Wrong length for Solana address" }
  }
  for (const c of addr) {
    if (!B58_ALPHABET.includes(c)) {
      return { ok: false, reason: `Invalid base58 character "${c}"` }
    }
  }
  // Decode and verify length == 32.
  let zeros = 0
  while (zeros < addr.length && addr[zeros] === "1") zeros++
  const bytes: number[] = []
  for (let i = zeros; i < addr.length; i++) {
    let carry = B58_ALPHABET.indexOf(addr[i])
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  if (zeros + bytes.length !== 32) {
    return { ok: false, reason: "Decoded length is not 32 bytes" }
  }
  return { ok: true }
}

/** Dispatch by chain kind. */
export function validateAddress(
  addr: string,
  kind: ChainKind,
  bech32Hrp?: string,
): Validation {
  switch (kind) {
    case "evm":
      return validateEvmAddress(addr)
    case "lux-pchain":
    case "lux-xchain":
      if (!bech32Hrp) return { ok: false, reason: "Missing HRP for chain" }
      return validateBech32(addr, bech32Hrp)
    case "solana":
      return validateSolanaAddress(addr)
  }
}

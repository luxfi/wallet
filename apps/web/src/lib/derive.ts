/**
 * BIP-39 / BIP-32 / BIP-44 / SLIP-10 derivation for Send + Receive.
 *
 * Inputs come from the auth slice (`useAuth().mnemonic` — the unlocked
 * BIP-39 phrase). We turn that into a 64-byte seed via PBKDF2 (BIP-39),
 * then derive per-chain:
 *
 *   EVM   → secp256k1 m/44'/60'/0'/0/0   → keccak256(uncompressed_pub[1:])[12:]
 *           → EIP-55 checksummed 0x… address
 *   Lux   → secp256k1 m/44'/9000'/0'/0/0 → ripemd160(sha256(compressed_pub))
 *           → bech32 over HRP, prefixed with "P-" / "X-"
 *   Sol   → SLIP-10 ed25519 m/44'/501'/0'/0' → base58(pubkey)
 *
 * The seed never leaves memory; mnemonic comes from the unlocked auth
 * slice, which clears on lock. We do not persist anything from this file.
 */
import { HDKey } from "@scure/bip32"
import { mnemonicToSeedSync } from "@scure/bip39"
import { keccak_256 } from "@noble/hashes/sha3"
import { sha256 } from "@noble/hashes/sha256"
import { ripemd160 } from "@noble/hashes/ripemd160"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha512"
import { ed25519 } from "@noble/curves/ed25519"
import { secp256k1 } from "@noble/curves/secp256k1"
import { bytesToHex } from "@noble/hashes/utils"
import type { Chain } from "./asset"

/* ───── address encoding helpers ──────────────────────────────────────── */

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

function bech32Checksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]
  const mod = bech32Polymod(values) ^ 1
  return [0, 1, 2, 3, 4, 5].map((p) => (mod >> (5 * (5 - p))) & 31)
}

function convertBits(
  data: Uint8Array,
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] {
  let acc = 0
  let bits = 0
  const out: number[] = []
  const maxv = (1 << toBits) - 1
  for (const b of data) {
    acc = (acc << fromBits) | b
    bits += fromBits
    while (bits >= toBits) {
      bits -= toBits
      out.push((acc >> bits) & maxv)
    }
  }
  if (pad && bits > 0) out.push((acc << (toBits - bits)) & maxv)
  return out
}

function encodeBech32(hrp: string, payload: Uint8Array): string {
  const data = convertBits(payload, 8, 5, true)
  const checksum = bech32Checksum(hrp, data)
  return `${hrp}1${[...data, ...checksum].map((i) => BECH32_CHARSET[i]).join("")}`
}

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function encodeBase58(bytes: Uint8Array): string {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  const digits: number[] = []
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  return "1".repeat(zeros) + digits.reverse().map((d) => B58_ALPHABET[d]).join("")
}

/** EIP-55 mixed-case checksum. Input is lowercase 40-char hex (no `0x`). */
function toChecksumAddress(addrLower: string): `0x${string}` {
  const body = (addrLower.startsWith("0x") ? addrLower.slice(2) : addrLower).toLowerCase()
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(body)))
  let out = "0x"
  for (let i = 0; i < body.length; i++) {
    out += parseInt(hash[i], 16) >= 8 ? body[i].toUpperCase() : body[i]
  }
  return out as `0x${string}`
}

/* ───── derivation ────────────────────────────────────────────────────── */

function bip44Path(coin: number, change = 0, index = 0): string {
  return `m/44'/${coin}'/0'/${change}/${index}`
}

/** SLIP-10 ed25519 derivation (all-hardened). */
function slip10Ed25519(seed: Uint8Array, path: number[]): Uint8Array {
  let I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed)
  let key = I.slice(0, 32)
  let chainCode = I.slice(32)
  for (const i of path) {
    const idx = i | 0x80000000
    const data = new Uint8Array(1 + 32 + 4)
    data[0] = 0x00
    data.set(key, 1)
    data[33] = (idx >>> 24) & 0xff
    data[34] = (idx >>> 16) & 0xff
    data[35] = (idx >>> 8) & 0xff
    data[36] = idx & 0xff
    I = hmac(sha512, chainCode, data)
    key = I.slice(0, 32)
    chainCode = I.slice(32)
  }
  return key
}

/** Convert a BIP-39 mnemonic into a 64-byte seed (passphrase intentionally empty). */
export function seedFromMnemonic(mnemonic: string): Uint8Array {
  return mnemonicToSeedSync(mnemonic.normalize("NFKD").trim())
}

/** Derive the receive address for a given chain from a 64-byte BIP-39 seed. */
export function deriveAddress(seed: Uint8Array, chain: Chain): string {
  if (chain.kind === "solana") {
    const priv = slip10Ed25519(seed, [44, chain.bip44Coin, 0, 0])
    const pub = ed25519.getPublicKey(priv)
    return encodeBase58(pub)
  }

  const root = HDKey.fromMasterSeed(seed)
  const node = root.derive(bip44Path(chain.bip44Coin))
  if (!node.publicKey || !node.privateKey) {
    throw new Error("HD derivation failed")
  }

  if (chain.kind === "evm") {
    // Uncompressed 65-byte secp256k1 pubkey: 0x04 || X(32) || Y(32).
    const uncompressed = secp256k1.getPublicKey(node.privateKey, false)
    const hash = keccak_256(uncompressed.slice(1))
    return toChecksumAddress(bytesToHex(hash.slice(12)))
  }

  // Lux P/X — bech32 over ripemd160(sha256(compressed_pub)) with `P-` / `X-` UX prefix.
  const compressed = node.publicKey
  const rip = ripemd160(sha256(compressed))
  const hrp = chain.bech32Hrp ?? "lux"
  const bech = encodeBech32(hrp, rip)
  const prefix = chain.kind === "lux-pchain" ? "P-" : "X-"
  return `${prefix}${bech}`
}

/** Convenience wrapper that unifies mnemonic → address in one call. */
export function deriveAddressFromMnemonic(mnemonic: string, chain: Chain): string {
  return deriveAddress(seedFromMnemonic(mnemonic), chain)
}

/**
 * Symmetric crypto primitives for the wallet. Standard algorithms only.
 *
 *   - PIN verifier:    scrypt(PIN, salt_v) — domain "verify"
 *   - Encryption key:  scrypt(PIN, salt_k) — domain "encrypt"
 *   - Cipher:          AES-256-GCM via Web Crypto
 *
 * The two scrypt outputs use INDEPENDENT salts. A compromise of the
 * persisted verifier hash does not yield the encryption key, even if
 * the same PIN was used.
 *
 * Parameters: scrypt N=2^17 r=8 p=1 — interactive-login bracket per RFC 7914.
 * AES-256-GCM with a fresh 12-byte nonce per encryption.
 */
import { scrypt as scryptAsync } from "@noble/hashes/scrypt"
import { bytesToHex, hexToBytes } from "@noble/hashes/utils"

const SCRYPT_PARAMS = { N: 1 << 17, r: 8, p: 1, dkLen: 32 } as const
const PIN_DOMAIN = new TextEncoder().encode("lux-wallet/pin-verify/v1")
const KEY_DOMAIN = new TextEncoder().encode("lux-wallet/aes-key/v1")

export interface EncryptedEnvelope {
  /** Hex-encoded AES-GCM ciphertext (includes the 16-byte auth tag). */
  ciphertext: string
  /** Hex-encoded 12-byte AES-GCM nonce. */
  nonce: string
  /** Hex-encoded 16-byte salt for the encryption-key KDF. */
  salt: string
}

export interface PinHash {
  hash: string
  salt: string
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  crypto.getRandomValues(out)
  return out
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

async function deriveKey(pin: string, salt: Uint8Array, domain: Uint8Array): Promise<Uint8Array> {
  const password = concat(domain, new TextEncoder().encode(pin))
  return scryptAsync(password, salt, SCRYPT_PARAMS)
}

export async function hashPIN(pin: string): Promise<PinHash> {
  const salt = randomBytes(16)
  const hash = await deriveKey(pin, salt, PIN_DOMAIN)
  return { hash: bytesToHex(hash), salt: bytesToHex(salt) }
}

export async function verifyPIN(pin: string, expected: PinHash): Promise<boolean> {
  const salt = hexToBytes(expected.salt)
  const got = await deriveKey(pin, salt, PIN_DOMAIN)
  const want = hexToBytes(expected.hash)
  if (got.length !== want.length) return false
  // Constant-time comparison — defends against timing side-channel.
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got[i]! ^ want[i]!
  return diff === 0
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}

export async function encryptMnemonic(mnemonic: string, pin: string): Promise<EncryptedEnvelope> {
  const salt = randomBytes(16)
  const keyBytes = await deriveKey(pin, salt, KEY_DOMAIN)
  const key = await importAesKey(keyBytes)
  const nonce = randomBytes(12)
  const plaintext = new TextEncoder().encode(mnemonic)
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plaintext)
  return {
    ciphertext: bytesToHex(new Uint8Array(ct)),
    nonce: bytesToHex(nonce),
    salt: bytesToHex(salt),
  }
}

export async function decryptMnemonic(env: EncryptedEnvelope, pin: string): Promise<string | null> {
  try {
    const salt = hexToBytes(env.salt)
    const keyBytes = await deriveKey(pin, salt, KEY_DOMAIN)
    const key = await importAesKey(keyBytes)
    const nonce = hexToBytes(env.nonce)
    const ct = hexToBytes(env.ciphertext)
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct)
    return new TextDecoder().decode(pt)
  } catch {
    // Auth tag mismatch (wrong PIN) or any subtle-crypto failure → reject.
    return null
  }
}

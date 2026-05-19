// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * Hybrid classical + post-quantum signature container.
 *
 * During the PQ transition era, every wallet signature is produced by
 * BOTH a classical scheme (secp256k1 for EVM, Ed25519 for X-Chain
 * native) AND ML-DSA-65. Either signature alone is acceptable to a
 * verifier that runs in classical-or-PQ mode; a verifier in strict-PQ
 * mode requires the ML-DSA half. This is the canonical hedge against
 * a discovery-day PQ attack (CRQC) without giving up classical
 * verification on chains that have not yet enabled the precompile.
 *
 * Wire format (byte-identical to luxfi/sdk wallet/keychain/PQSigner.Sign
 * for KeyTypeHybridSecp256k1MLDSA*):
 *
 *   u16be(|classicalSig|) || classicalSig || u16be(|pqSig|) || pqSig
 *
 * This is the same encoding the Go side emits, so a tx signed in the
 * browser is wire-compatible with the Go relayer / RPC submission path.
 *
 * Domain separation: classical and PQ halves sign DIFFERENT byte
 * strings — the classical half signs the keccak256 (EVM) or sha256
 * (UTXO) digest of the unsigned tx, while the PQ half signs the raw
 * tx under a FIPS-204 ctx. This matches the precompile-side verifier
 * pair: 0xEC verifies classical, 0x012202 verifies PQ. A weakened
 * classical scheme cannot forge a PQ signature, and vice versa, because
 * the two halves don't share a digest function.
 */

import { secp256k1 } from '@noble/curves/secp256k1'
import { ed25519 } from '@noble/curves/ed25519'
import { keccak_256 } from '@noble/hashes/sha3'
import { sha256 } from '@noble/hashes/sha256'
import { type MLDSAProvider, WalletSchemeID } from './pqAccount'
import { providerFor, signWithContext, verifyWithContext } from './mldsa'
import { type SigningContext } from './domain'

/** Classical scheme variant inside a hybrid container. */
export type ClassicalScheme = 'secp256k1' | 'ed25519'

/**
 * HybridSignature is the in-memory shape of a parsed hybrid container.
 *
 * The wire-encoded form is the length-prefixed concatenation
 * (encodeHybrid). Consumers should round-trip through encode/decode
 * rather than mutating the in-memory shape directly.
 */
export interface HybridSignature {
  classical: Uint8Array
  pq: Uint8Array
  classicalScheme: ClassicalScheme
  pqScheme: WalletSchemeID
}

/**
 * encodeHybrid produces the wire bytes for a hybrid signature.
 *
 * u16be(|classical|) || classical || u16be(|pq|) || pq
 *
 * The format is intentionally length-prefixed (not delimiter-based) so
 * a verifier can split the two halves without scheme knowledge — the
 * scheme bytes live one layer up in the auth envelope.
 */
export function encodeHybrid(classical: Uint8Array, pq: Uint8Array): Uint8Array {
  if (classical.length > 0xffff) {
    throw new Error(`pq/hybrid: classical signature ${classical.length} bytes exceeds u16 limit`)
  }
  if (pq.length > 0xffff) {
    throw new Error(`pq/hybrid: pq signature ${pq.length} bytes exceeds u16 limit`)
  }
  const out = new Uint8Array(2 + classical.length + 2 + pq.length)
  let o = 0
  out[o++] = (classical.length >> 8) & 0xff
  out[o++] = classical.length & 0xff
  out.set(classical, o)
  o += classical.length
  out[o++] = (pq.length >> 8) & 0xff
  out[o++] = pq.length & 0xff
  out.set(pq, o)
  return out
}

/**
 * decodeHybrid splits a wire-encoded hybrid signature back into its
 * (classical, pq) halves. Throws on a truncated or malformed buffer.
 */
export function decodeHybrid(wire: Uint8Array): { classical: Uint8Array; pq: Uint8Array } {
  if (wire.length < 4) {
    throw new Error(`pq/hybrid: wire ${wire.length} bytes too short for two length prefixes`)
  }
  const cLen = (wire[0] << 8) | wire[1]
  if (wire.length < 2 + cLen + 2) {
    throw new Error(`pq/hybrid: wire truncated after classical signature (${cLen} bytes expected)`)
  }
  const classical = wire.slice(2, 2 + cLen)
  const pqLen = (wire[2 + cLen] << 8) | wire[2 + cLen + 1]
  const want = 2 + cLen + 2 + pqLen
  if (wire.length !== want) {
    throw new Error(`pq/hybrid: wire length ${wire.length} does not match prefixed total ${want}`)
  }
  const pq = wire.slice(2 + cLen + 2, want)
  return { classical, pq }
}

/**
 * signHybridSecp256k1MLDSA signs a transaction in EVM-shaped hybrid
 * mode:
 *
 *   classical = secp256k1.sign(keccak256(msg), classicalSk)
 *   pq        = ML-DSA-65.sign(msg, pqSk, ctx)
 *
 * The classical half follows EVM convention (sign the keccak256 digest);
 * the PQ half signs the raw tx bytes under the supplied ctx. Returns
 * the encoded hybrid container.
 */
export function signHybridSecp256k1MLDSA(opts: {
  classicalSk: Uint8Array
  pqSk: Uint8Array
  pqScheme: WalletSchemeID
  msg: Uint8Array
  ctx: SigningContext
  /** Optional extra entropy for ML-DSA randomized signing. */
  extraEntropy?: Uint8Array
}): Uint8Array {
  const digest = keccak_256(opts.msg)
  const classicalSig = secp256k1.sign(digest, opts.classicalSk)
  // serialize secp256k1 signature as r||s||v (65 bytes) to match EVM convention
  const classicalBytes = serializeSecpSignature(classicalSig, digest, opts.classicalSk)

  const provider = providerFor(opts.pqScheme)
  const pqBytes = signWithContext(provider, opts.pqSk, opts.msg, opts.ctx)
  return encodeHybrid(classicalBytes, pqBytes)
}

/**
 * signHybridEd25519MLDSA signs a transaction in X-Chain-shaped hybrid
 * mode:
 *
 *   classical = ed25519.sign(sha256(msg), classicalSk)
 *   pq        = ML-DSA-65.sign(msg, pqSk, ctx)
 *
 * Ed25519 over sha256(msg) matches the X-Chain UTXO transcript layout.
 */
export function signHybridEd25519MLDSA(opts: {
  classicalSk: Uint8Array
  pqSk: Uint8Array
  pqScheme: WalletSchemeID
  msg: Uint8Array
  ctx: SigningContext
}): Uint8Array {
  const digest = sha256(opts.msg)
  const classicalSig = ed25519.sign(digest, opts.classicalSk)
  const provider = providerFor(opts.pqScheme)
  const pqSig = signWithContext(provider, opts.pqSk, opts.msg, opts.ctx)
  return encodeHybrid(classicalSig, pqSig)
}

/**
 * verifyHybridSecp256k1MLDSA checks both halves of an EVM-shaped hybrid
 * signature. Returns true ONLY when both checks pass.
 */
export function verifyHybridSecp256k1MLDSA(opts: {
  classicalPk: Uint8Array
  pqPk: Uint8Array
  pqScheme: WalletSchemeID
  msg: Uint8Array
  signature: Uint8Array
  ctx: SigningContext
}): boolean {
  const { classical, pq } = decodeHybrid(opts.signature)
  const digest = keccak_256(opts.msg)
  // secp256k1 signature wire form is r(32)||s(32)||v(1) — strip v before
  // verifying with @noble/curves which doesn't consume the recovery byte.
  const sigCore = classical.length === 65 ? classical.slice(0, 64) : classical
  const classicalOk = secp256k1.verify(sigCore, digest, opts.classicalPk)
  if (!classicalOk) return false
  const provider = providerFor(opts.pqScheme)
  return verifyWithContext(provider, opts.pqPk, opts.msg, pq, opts.ctx)
}

/**
 * verifyHybridEd25519MLDSA checks both halves of an X-Chain-shaped
 * hybrid signature.
 */
export function verifyHybridEd25519MLDSA(opts: {
  classicalPk: Uint8Array
  pqPk: Uint8Array
  pqScheme: WalletSchemeID
  msg: Uint8Array
  signature: Uint8Array
  ctx: SigningContext
}): boolean {
  const { classical, pq } = decodeHybrid(opts.signature)
  const digest = sha256(opts.msg)
  const classicalOk = ed25519.verify(classical, digest, opts.classicalPk)
  if (!classicalOk) return false
  const provider: MLDSAProvider = providerFor(opts.pqScheme)
  return verifyWithContext(provider, opts.pqPk, opts.msg, pq, opts.ctx)
}

/**
 * Helper: serialize a noble-secp256k1 signature plus recovery byte into
 * the EVM 65-byte r||s||v wire form. v ∈ {27,28} matches the Ethereum
 * convention used by 0xEC (ecrecover).
 */
function serializeSecpSignature(
  sig: ReturnType<typeof secp256k1.sign>,
  digest: Uint8Array,
  sk: Uint8Array,
): Uint8Array {
  // noble's Signature object exposes r,s as bigints + recovery on `.recovery`.
  const r = bigintTo32(sig.r)
  const s = bigintTo32(sig.s)
  const rec = sig.recovery
  if (rec !== 0 && rec !== 1) {
    // Fall back to ecrecover-derived recovery if the noble Signature
    // didn't capture one; recompute by trying both.
    const v0 = secp256k1.Signature.fromCompact(new Uint8Array([...r, ...s])).addRecoveryBit(0)
    const v1 = secp256k1.Signature.fromCompact(new Uint8Array([...r, ...s])).addRecoveryBit(1)
    const pk = secp256k1.getPublicKey(sk, false)
    const tryRec = (v: typeof v0) => {
      try {
        return v.recoverPublicKey(digest).toRawBytes(false)
      } catch {
        return null
      }
    }
    const r0 = tryRec(v0)
    const r1 = tryRec(v1)
    const out = new Uint8Array(65)
    out.set(r, 0)
    out.set(s, 32)
    if (r0 && bytesEqual(r0, pk)) out[64] = 27
    else if (r1 && bytesEqual(r1, pk)) out[64] = 28
    else throw new Error('pq/hybrid: unable to recover secp256k1 v byte')
    return out
  }
  const out = new Uint8Array(65)
  out.set(r, 0)
  out.set(s, 32)
  out[64] = rec === 0 ? 27 : 28
  return out
}

function bigintTo32(x: bigint): Uint8Array {
  const out = new Uint8Array(32)
  let v = x
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

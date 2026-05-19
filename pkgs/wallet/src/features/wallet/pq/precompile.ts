// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * On-chain PQ precompile call wrappers (LP-4200).
 *
 * The Lux C-Chain EVM exposes three precompiles for post-quantum
 * verification:
 *
 *   0x012201 — ML-KEM verify (FIPS 203)
 *   0x012202 — ML-DSA verify (FIPS 204)
 *   0x012203 — SLH-DSA verify (FIPS 205)
 *
 * Each precompile is profile-gated by `contract.RefuseUnderStrictPQ` on
 * the node side: a single function in a single place gates whether
 * classical-mode calls are accepted. The wallet's job is to construct
 * the input bytes in the canonical layout and dispatch an eth_call.
 *
 * Input layout for 0x012202 (ML-DSA verify):
 *
 *   scheme_byte(1) || ctx_len(1) || ctx(ctx_len) || pk_len(2 BE) || pk || sig_len(3 BE) || sig || msg
 *
 * scheme_byte ∈ {0x41=ML-DSA-44, 0x42=ML-DSA-65, 0x43=ML-DSA-87}
 * matching WalletSchemeID. Output: 32-byte word, 0x...01 = valid,
 * 0x...00 = invalid. This is identical to the precompile-side decoder
 * in luxfi/node contract/precompile/pq/mldsa.go.
 *
 * The wallet never invokes a precompile to *produce* a signature — it
 * only calls eth_call to *verify* a signature it just produced, as a
 * deployment-time sanity check / acceptance test. Real on-chain
 * verification happens when the wallet submits a tx and the EVM runs
 * the verifier as part of the auth check.
 */

import { type SigningContext, contextBytesFor } from './domain'
import { WalletSchemeID } from './pqAccount'

/** LP-4200 precompile addresses (Lux C-Chain). */
export const PRECOMPILE_MLKEM = '0x0000000000000000000000000000000000012201' as const
export const PRECOMPILE_MLDSA = '0x0000000000000000000000000000000000012202' as const
export const PRECOMPILE_SLHDSA = '0x0000000000000000000000000000000000012203' as const

/** Minimal eth_call client surface — concrete clients (viem, ethers, fetch) plug in. */
export interface EthCallClient {
  call(input: { to: `0x${string}`; data: `0x${string}` }): Promise<`0x${string}`>
}

/**
 * Encode the input bytes for the ML-DSA verify precompile.
 *
 * Layout: scheme(1) || ctx_len(1) || ctx(ctx_len) || pk_len(2 BE) || pk
 *      || sig_len(3 BE) || sig || msg
 *
 * The sig length is 3 BE bytes because ML-DSA-87 signatures are ~4627
 * bytes — exceeds u16. Two BE bytes for pk is sufficient (ML-DSA-87 pk
 * is 2592 bytes).
 */
export function encodeMLDSAVerifyInput(opts: {
  scheme: WalletSchemeID
  ctx: SigningContext
  publicKey: Uint8Array
  signature: Uint8Array
  msg: Uint8Array
}): Uint8Array {
  if (opts.scheme !== WalletSchemeID.MLDSA44 &&
      opts.scheme !== WalletSchemeID.MLDSA65 &&
      opts.scheme !== WalletSchemeID.MLDSA87) {
    throw new Error(`pq/precompile: scheme 0x${opts.scheme.toString(16)} is not ML-DSA`)
  }
  const ctx = contextBytesFor(opts.ctx)
  if (ctx.length > 0xff) {
    throw new Error(`pq/precompile: ctx length ${ctx.length} exceeds 0xff`)
  }
  if (opts.publicKey.length > 0xffff) {
    throw new Error(`pq/precompile: pk length ${opts.publicKey.length} exceeds 0xffff`)
  }
  if (opts.signature.length > 0xffffff) {
    throw new Error(`pq/precompile: sig length ${opts.signature.length} exceeds 0xffffff`)
  }
  const total =
    1 + 1 + ctx.length + 2 + opts.publicKey.length + 3 + opts.signature.length + opts.msg.length
  const out = new Uint8Array(total)
  let o = 0
  out[o++] = opts.scheme
  out[o++] = ctx.length
  out.set(ctx, o); o += ctx.length
  out[o++] = (opts.publicKey.length >> 8) & 0xff
  out[o++] = opts.publicKey.length & 0xff
  out.set(opts.publicKey, o); o += opts.publicKey.length
  out[o++] = (opts.signature.length >> 16) & 0xff
  out[o++] = (opts.signature.length >> 8) & 0xff
  out[o++] = opts.signature.length & 0xff
  out.set(opts.signature, o); o += opts.signature.length
  out.set(opts.msg, o); o += opts.msg.length
  return out
}

/**
 * Verify an ML-DSA signature by eth_call against the LP-4200 precompile.
 *
 * Returns true iff the precompile returns a non-zero 32-byte word.
 * Network failures throw — callers should distinguish that from a
 * verification failure via try/catch.
 */
export async function verifyMLDSAOnChain(client: EthCallClient, opts: {
  scheme: WalletSchemeID
  ctx: SigningContext
  publicKey: Uint8Array
  signature: Uint8Array
  msg: Uint8Array
}): Promise<boolean> {
  const input = encodeMLDSAVerifyInput(opts)
  const data = `0x${bytesToHex(input)}` as `0x${string}`
  const ret = await client.call({ to: PRECOMPILE_MLDSA, data })
  return retIsTrue(ret)
}

/** Encode the input bytes for the ML-KEM verify precompile.
 *
 * Layout: kem_variant(1) || pk_len(2 BE) || pk || ct_len(2 BE) || ct || ss_len(1) || ss
 *
 * The precompile recomputes encapsulation under (pk, opts) and returns
 * true iff the supplied shared secret matches — this is a re-encaps
 * proof, not a generic ML-KEM oracle. variant ∈ {0x01=ML-KEM-512,
 * 0x02=ML-KEM-768, 0x03=ML-KEM-1024}.
 */
export function encodeMLKEMVerifyInput(opts: {
  variant: 1 | 2 | 3
  publicKey: Uint8Array
  ciphertext: Uint8Array
  sharedSecret: Uint8Array
}): Uint8Array {
  if (opts.publicKey.length > 0xffff) throw new Error('pq/precompile: pk exceeds u16')
  if (opts.ciphertext.length > 0xffff) throw new Error('pq/precompile: ct exceeds u16')
  if (opts.sharedSecret.length > 0xff) throw new Error('pq/precompile: ss exceeds u8')
  const total = 1 + 2 + opts.publicKey.length + 2 + opts.ciphertext.length + 1 + opts.sharedSecret.length
  const out = new Uint8Array(total)
  let o = 0
  out[o++] = opts.variant
  out[o++] = (opts.publicKey.length >> 8) & 0xff
  out[o++] = opts.publicKey.length & 0xff
  out.set(opts.publicKey, o); o += opts.publicKey.length
  out[o++] = (opts.ciphertext.length >> 8) & 0xff
  out[o++] = opts.ciphertext.length & 0xff
  out.set(opts.ciphertext, o); o += opts.ciphertext.length
  out[o++] = opts.sharedSecret.length
  out.set(opts.sharedSecret, o); o += opts.sharedSecret.length
  return out
}

/** Encode the input bytes for the SLH-DSA verify precompile. */
export function encodeSLHDSAVerifyInput(opts: {
  paramSet: number // matches FIPS-205 row index; e.g. 0x09 = sha2-192f
  ctx: SigningContext
  publicKey: Uint8Array
  signature: Uint8Array
  msg: Uint8Array
}): Uint8Array {
  const ctx = contextBytesFor(opts.ctx)
  if (ctx.length > 0xff) throw new Error('pq/precompile: ctx exceeds u8')
  if (opts.publicKey.length > 0xffff) throw new Error('pq/precompile: pk exceeds u16')
  if (opts.signature.length > 0xffffff) throw new Error('pq/precompile: sig exceeds u24')
  const total =
    1 + 1 + ctx.length + 2 + opts.publicKey.length + 3 + opts.signature.length + opts.msg.length
  const out = new Uint8Array(total)
  let o = 0
  out[o++] = opts.paramSet
  out[o++] = ctx.length
  out.set(ctx, o); o += ctx.length
  out[o++] = (opts.publicKey.length >> 8) & 0xff
  out[o++] = opts.publicKey.length & 0xff
  out.set(opts.publicKey, o); o += opts.publicKey.length
  out[o++] = (opts.signature.length >> 16) & 0xff
  out[o++] = (opts.signature.length >> 8) & 0xff
  out[o++] = opts.signature.length & 0xff
  out.set(opts.signature, o); o += opts.signature.length
  out.set(opts.msg, o); o += opts.msg.length
  return out
}

function bytesToHex(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0')
  return s
}

function retIsTrue(ret: string): boolean {
  // 32-byte ABI bool: 0x0..01 = true.
  const v = ret.startsWith('0x') ? ret.slice(2) : ret
  if (v.length === 0) return false
  // Any non-zero byte counts as true under EVM bool semantics.
  for (let i = 0; i < v.length; i += 2) {
    if (v[i] !== '0' || v[i + 1] !== '0') return true
  }
  return false
}

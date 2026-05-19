// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * SLH-DSA (FIPS 205) hash-based signatures.
 *
 * Used for cold-storage / recovery: SLH-DSA-192f is the canonical
 * recovery parameter set per LP-4200. Hash-based signatures are
 * conservative — security rests only on the underlying hash family,
 * not on a structured assumption (LWE, MLWE, discrete log). The
 * trade-off is large signatures (~17 KB for 192f) and slow signing,
 * which is acceptable for an offline, single-use recovery flow.
 *
 * The wallet generates the recovery seed once, signs the recovery
 * envelope offline (paper / hardware), and never re-signs with the
 * same key. The on-chain verifier at 0x012203 checks the SLH-DSA
 * signature against the published public key.
 */

import {
  slh_dsa_sha2_128f,
  slh_dsa_sha2_192f,
  slh_dsa_sha2_192s,
  slh_dsa_sha2_256f,
} from '@noble/post-quantum/slh-dsa.js'
import { type SigningContext, contextBytesFor } from './domain'

/**
 * SLHDSAProvider wraps one FIPS 205 parameter set behind a uniform
 * surface. The wallet only generates a key, signs once, and verifies;
 * no in-memory long-lived private key (the recovery key is meant to
 * live offline / on paper).
 */
export interface SLHDSAProvider {
  readonly name: string
  readonly publicKeySize: number
  readonly privateKeySize: number
  readonly signatureSize: number

  keygen(seed?: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array }
  sign(privateKey: Uint8Array, msg: Uint8Array, ctx: SigningContext): Uint8Array
  verify(publicKey: Uint8Array, msg: Uint8Array, signature: Uint8Array, ctx: SigningContext): boolean
}

function wrapSphincs(signer: typeof slh_dsa_sha2_192f, name: string): SLHDSAProvider {
  const publicKeySize = signer.lengths.publicKey
  const secretKeySize = signer.lengths.secretKey
  const signatureSize = signer.lengths.signature
  if (typeof publicKeySize !== 'number') {
    throw new Error(`pq/slhdsa: noble ${name} lengths.publicKey is undefined`)
  }
  if (typeof secretKeySize !== 'number') {
    throw new Error(`pq/slhdsa: noble ${name} lengths.secretKey is undefined`)
  }
  if (typeof signatureSize !== 'number') {
    throw new Error(`pq/slhdsa: noble ${name} lengths.signature is undefined`)
  }
  return {
    name,
    publicKeySize,
    privateKeySize: secretKeySize,
    signatureSize,
    keygen(seed) {
      const { publicKey, secretKey } = signer.keygen(seed)
      return { publicKey, privateKey: secretKey }
    },
    sign(privateKey, msg, ctx) {
      return signer.sign(msg, privateKey, { context: contextBytesFor(ctx) })
    },
    verify(publicKey, msg, signature, ctx) {
      return signer.verify(signature, msg, publicKey, { context: contextBytesFor(ctx) })
    },
  }
}

/** SLH-DSA-SHA2-128f (FIPS 205 category 1). Lightweight cold storage. */
export const slhDsa128fProvider: SLHDSAProvider = wrapSphincs(slh_dsa_sha2_128f, 'slh-dsa-sha2-128f')

/** SLH-DSA-SHA2-192f (FIPS 205 category 3). Canonical recovery signature. */
export const slhDsa192fProvider: SLHDSAProvider = wrapSphincs(slh_dsa_sha2_192f, 'slh-dsa-sha2-192f')

/** SLH-DSA-SHA2-192s (FIPS 205 category 3, small variant). Slower sign, smaller signature. */
export const slhDsa192sProvider: SLHDSAProvider = wrapSphincs(slh_dsa_sha2_192s, 'slh-dsa-sha2-192s')

/** SLH-DSA-SHA2-256f (FIPS 205 category 5). High-value cold storage. */
export const slhDsa256fProvider: SLHDSAProvider = wrapSphincs(slh_dsa_sha2_256f, 'slh-dsa-sha2-256f')

/** Look up an SLH-DSA provider by lowercase canonical name. */
export function slhDsaProviderByName(name: string): SLHDSAProvider {
  switch (name) {
    case 'slh-dsa-sha2-128f':
      return slhDsa128fProvider
    case 'slh-dsa-sha2-192f':
      return slhDsa192fProvider
    case 'slh-dsa-sha2-192s':
      return slhDsa192sProvider
    case 'slh-dsa-sha2-256f':
      return slhDsa256fProvider
    default:
      throw new Error(`pq/slhdsa: unknown SLH-DSA provider ${name}`)
  }
}

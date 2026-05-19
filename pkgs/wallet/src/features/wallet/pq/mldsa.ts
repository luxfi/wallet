// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * Concrete ML-DSA providers backed by @noble/post-quantum.
 *
 * Wraps FIPS 204 (ml_dsa44 / ml_dsa65 / ml_dsa87) behind the
 * MLDSAProvider interface declared in pqAccount.ts. All signing /
 * verification paths through this module bind a domain-separator
 * context (FIPS 204 §5.4) so a signature produced for one verifier
 * surface (e.g. the EVM precompile at 0x012202) cannot be replayed
 * against another (e.g. X-Chain UTXOs).
 *
 * Threat-model boundary: the secretKey bytes accepted here are
 * sensitive material. Callers are responsible for sourcing them from
 * the auth slice (encrypted at rest, in RAM only while unlocked) and
 * MUST NOT log or persist them. This module performs no allocation
 * that outlives the call.
 */

import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'
import {
  type MLDSAProvider,
  WalletSchemeID,
} from './pqAccount'
import { type SigningContext, contextBytesFor } from './domain'

/** Wrap one @noble/post-quantum ml_dsaN export as an MLDSAProvider. */
function wrap(signer: typeof ml_dsa65, schemeID: WalletSchemeID): MLDSAProvider {
  // Lengths come from the noble signer's own `lengths` table — the only
  // source of truth for FIPS 204 byte widths in this codebase.
  const publicKeySize = signer.lengths.publicKey
  const secretKeySize = signer.lengths.secretKey
  const signatureSize = signer.lengths.signature
  if (typeof publicKeySize !== 'number') {
    throw new Error('pq/mldsa: noble ml_dsa lengths.publicKey is undefined')
  }
  if (typeof secretKeySize !== 'number') {
    throw new Error('pq/mldsa: noble ml_dsa lengths.secretKey is undefined')
  }
  if (typeof signatureSize !== 'number') {
    throw new Error('pq/mldsa: noble ml_dsa lengths.signature is undefined')
  }
  return {
    schemeID,
    publicKeySize,
    privateKeySize: secretKeySize,
    signatureSize,
    sign(privateKey, digest) {
      return signer.sign(digest, privateKey)
    },
    verify(publicKey, digest, signature) {
      return signer.verify(signature, digest, publicKey)
    },
    newKeyFromSeed(seed) {
      const { publicKey, secretKey } = signer.keygen(seed)
      return { publicKey, privateKey: secretKey }
    },
  }
}

/** ML-DSA-44 provider (FIPS 204 category 2). Lightweight-compat path. */
export const mlDsa44Provider: MLDSAProvider = wrap(ml_dsa44, WalletSchemeID.MLDSA44)

/** ML-DSA-65 provider (FIPS 204 category 3). Canonical PQ identity. */
export const mlDsa65Provider: MLDSAProvider = wrap(ml_dsa65, WalletSchemeID.MLDSA65)

/** ML-DSA-87 provider (FIPS 204 category 5). High-value / root-key path. */
export const mlDsa87Provider: MLDSAProvider = wrap(ml_dsa87, WalletSchemeID.MLDSA87)

/**
 * providerFor returns the canonical MLDSAProvider for a given scheme.
 * Throws on a non-ML-DSA scheme so misuse is loud rather than silent.
 */
export function providerFor(scheme: WalletSchemeID): MLDSAProvider {
  switch (scheme) {
    case WalletSchemeID.MLDSA44:
      return mlDsa44Provider
    case WalletSchemeID.MLDSA65:
      return mlDsa65Provider
    case WalletSchemeID.MLDSA87:
      return mlDsa87Provider
    default:
      throw new Error(
        `pq/mldsa: providerFor called with non-ML-DSA scheme 0x${scheme.toString(16)}`,
      )
  }
}

/**
 * signWithContext signs a message under the FIPS-204 ctx parameter for
 * the named SigningContext. This is the primary entry point for any
 * wallet path that produces an ML-DSA signature that will be checked by
 * a Lux on-chain verifier.
 *
 * The message is passed through unchanged — the ctx prefix is applied
 * inside the noble signer per FIPS 204 §5.4.
 */
export function signWithContext(
  provider: MLDSAProvider,
  secretKey: Uint8Array,
  msg: Uint8Array,
  ctx: SigningContext,
): Uint8Array {
  const inner = signerForScheme(provider.schemeID)
  return inner.sign(msg, secretKey, { context: contextBytesFor(ctx) })
}

/**
 * verifyWithContext checks an ML-DSA signature under the same
 * SigningContext that the signer pinned. Returns false on any
 * verification failure; throws only on malformed API arguments.
 */
export function verifyWithContext(
  provider: MLDSAProvider,
  publicKey: Uint8Array,
  msg: Uint8Array,
  signature: Uint8Array,
  ctx: SigningContext,
): boolean {
  const inner = signerForScheme(provider.schemeID)
  return inner.verify(signature, msg, publicKey, { context: contextBytesFor(ctx) })
}

/** Dispatch back to the noble signer; kept internal. */
function signerForScheme(scheme: WalletSchemeID): typeof ml_dsa65 {
  switch (scheme) {
    case WalletSchemeID.MLDSA44:
      return ml_dsa44
    case WalletSchemeID.MLDSA65:
      return ml_dsa65
    case WalletSchemeID.MLDSA87:
      return ml_dsa87
    default:
      throw new Error(
        `pq/mldsa: signerForScheme called with non-ML-DSA scheme 0x${scheme.toString(16)}`,
      )
  }
}

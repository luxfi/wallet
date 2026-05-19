// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * ML-KEM (FIPS 203) key-encapsulation wrappers.
 *
 * Used by the wallet's PQ-TLS hybrid handshake (X25519 || ML-KEM-768 in
 * TLS 1.3 hybrid_kem) and by the encrypted-DM channel for wallet-to-
 * wallet messaging. The provider surface mirrors the on-chain
 * precompile at 0x012201 (LP-4200 ML-KEM verifier) so the wallet can
 * call eth_call with the same wire shape used here.
 *
 * Wraps the @noble/post-quantum/ml-kem exports. No custom math: the
 * lib is the reference implementation we depend on.
 */

import { ml_kem512, ml_kem768, ml_kem1024 } from '@noble/post-quantum/ml-kem.js'
import { WalletSchemeID } from './pqAccount'

/**
 * KEMProvider is the wallet-side capability for one ML-KEM parameter
 * set. encapsulate produces (ciphertext, sharedSecret) under the
 * recipient's public key; decapsulate recovers the shared secret from
 * a ciphertext under the recipient's secret key.
 *
 * Lengths are pinned at construction time so a caller can validate
 * inputs without round-tripping through the noble lib.
 */
export interface KEMProvider {
  readonly name: string
  readonly publicKeySize: number
  readonly privateKeySize: number
  readonly ciphertextSize: number
  readonly sharedSecretSize: 32

  keygen(seed?: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array }
  encapsulate(publicKey: Uint8Array): { ciphertext: Uint8Array; sharedSecret: Uint8Array }
  decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Uint8Array
}

function wrapKem(kem: typeof ml_kem768, name: string): KEMProvider {
  const publicKeySize = kem.lengths.publicKey
  const secretKeySize = kem.lengths.secretKey
  const ciphertextSize = kem.lengths.cipherText
  if (typeof publicKeySize !== 'number') {
    throw new Error(`pq/mlkem: noble ${name} lengths.publicKey is undefined`)
  }
  if (typeof secretKeySize !== 'number') {
    throw new Error(`pq/mlkem: noble ${name} lengths.secretKey is undefined`)
  }
  if (typeof ciphertextSize !== 'number') {
    throw new Error(`pq/mlkem: noble ${name} lengths.cipherText is undefined`)
  }
  return {
    name,
    publicKeySize,
    privateKeySize: secretKeySize,
    ciphertextSize,
    sharedSecretSize: 32,
    keygen(seed) {
      const { publicKey, secretKey } = kem.keygen(seed)
      return { publicKey, privateKey: secretKey }
    },
    encapsulate(publicKey) {
      const { cipherText, sharedSecret } = kem.encapsulate(publicKey)
      return { ciphertext: cipherText, sharedSecret }
    },
    decapsulate(ciphertext, privateKey) {
      return kem.decapsulate(ciphertext, privateKey)
    },
  }
}

/** ML-KEM-512 (FIPS 203 category 1). Lightweight handshake. */
export const mlKem512Provider: KEMProvider = wrapKem(ml_kem512, 'ml-kem-512')

/** ML-KEM-768 (FIPS 203 category 3). Canonical KEM for PQ-TLS / encrypted-DM. */
export const mlKem768Provider: KEMProvider = wrapKem(ml_kem768, 'ml-kem-768')

/** ML-KEM-1024 (FIPS 203 category 5). High-value channel. */
export const mlKem1024Provider: KEMProvider = wrapKem(ml_kem1024, 'ml-kem-1024')

/** Convenience: the canonical KEM scheme byte (mirrors the Go-side enum). */
export const WALLET_KEM_SCHEME_MLKEM768 = WalletSchemeID.MLDSA65 // re-used as a marker; KEM has no scheme byte today

/** Look up a KEM provider by lowercase canonical name. */
export function kemProviderByName(name: string): KEMProvider {
  switch (name) {
    case 'ml-kem-512':
      return mlKem512Provider
    case 'ml-kem-768':
      return mlKem768Provider
    case 'ml-kem-1024':
      return mlKem1024Provider
    default:
      throw new Error(`pq/mlkem: unknown KEM provider ${name}`)
  }
}

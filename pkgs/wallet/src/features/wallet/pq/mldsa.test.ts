// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import {
  mlDsa44Provider,
  mlDsa65Provider,
  mlDsa87Provider,
  providerFor,
  signWithContext,
  verifyWithContext,
} from './mldsa'
import { WalletSchemeID } from './pqAccount'

describe('ML-DSA providers', () => {
  describe('ML-DSA-44 (FIPS 204 cat 2)', () => {
    it('reports the FIPS-204 byte widths', () => {
      // FIPS 204 Table 1: ML-DSA-44 sizes (pk=1312, sk=2560, sig=2420).
      expect(mlDsa44Provider.publicKeySize).toBe(1312)
      expect(mlDsa44Provider.privateKeySize).toBe(2560)
      expect(mlDsa44Provider.signatureSize).toBe(2420)
      expect(mlDsa44Provider.schemeID).toBe(WalletSchemeID.MLDSA44)
    })
  })

  describe('ML-DSA-65 (FIPS 204 cat 3 — canonical)', () => {
    it('reports the FIPS-204 byte widths', () => {
      // FIPS 204 Table 1: ML-DSA-65 sizes (pk=1952, sk=4032, sig=3309).
      expect(mlDsa65Provider.publicKeySize).toBe(1952)
      expect(mlDsa65Provider.privateKeySize).toBe(4032)
      expect(mlDsa65Provider.signatureSize).toBe(3309)
      expect(mlDsa65Provider.schemeID).toBe(WalletSchemeID.MLDSA65)
    })

    it('keygen → sign → verify round-trip', () => {
      const seed = new Uint8Array(32).fill(7)
      const { publicKey, privateKey } = mlDsa65Provider.newKeyFromSeed(seed)
      expect(publicKey.length).toBe(mlDsa65Provider.publicKeySize)
      expect(privateKey.length).toBe(mlDsa65Provider.privateKeySize)

      const msg = new TextEncoder().encode('lux-pq-wallet-mldsa-65-roundtrip')
      const sig = signWithContext(mlDsa65Provider, privateKey, msg, 'evm-precompile')
      expect(sig.length).toBe(mlDsa65Provider.signatureSize)

      const ok = verifyWithContext(mlDsa65Provider, publicKey, msg, sig, 'evm-precompile')
      expect(ok).toBe(true)
    })

    it('verification fails under a different ctx — replay protection', () => {
      const seed = new Uint8Array(32).fill(9)
      const { publicKey, privateKey } = mlDsa65Provider.newKeyFromSeed(seed)
      const msg = new TextEncoder().encode('cross-chain-replay-attempt')
      const sig = signWithContext(mlDsa65Provider, privateKey, msg, 'evm-precompile')
      // A signature minted for the EVM precompile MUST NOT verify on
      // X-Chain UTXOs or the recovery path. This is the central
      // domain-separation property of FIPS 204 §5.4.
      expect(verifyWithContext(mlDsa65Provider, publicKey, msg, sig, 'x-chain-utxo')).toBe(false)
      expect(verifyWithContext(mlDsa65Provider, publicKey, msg, sig, 'p-chain-platform')).toBe(false)
      expect(verifyWithContext(mlDsa65Provider, publicKey, msg, sig, 'recovery')).toBe(false)
    })

    it('verification fails for the wrong message', () => {
      const seed = new Uint8Array(32).fill(11)
      const { publicKey, privateKey } = mlDsa65Provider.newKeyFromSeed(seed)
      const sig = signWithContext(
        mlDsa65Provider,
        privateKey,
        new TextEncoder().encode('original'),
        'evm-precompile',
      )
      expect(
        verifyWithContext(
          mlDsa65Provider,
          publicKey,
          new TextEncoder().encode('tampered'),
          sig,
          'evm-precompile',
        ),
      ).toBe(false)
    })

    it('deterministic keygen — same seed → same keypair', () => {
      const seed = new Uint8Array(32).fill(13)
      const a = mlDsa65Provider.newKeyFromSeed(seed)
      const b = mlDsa65Provider.newKeyFromSeed(seed)
      expect(a.publicKey).toEqual(b.publicKey)
      expect(a.privateKey).toEqual(b.privateKey)
    })
  })

  describe('ML-DSA-87 (FIPS 204 cat 5 — high-value)', () => {
    it('reports the FIPS-204 byte widths', () => {
      // FIPS 204 Table 1: ML-DSA-87 sizes (pk=2592, sk=4896, sig=4627).
      expect(mlDsa87Provider.publicKeySize).toBe(2592)
      expect(mlDsa87Provider.privateKeySize).toBe(4896)
      expect(mlDsa87Provider.signatureSize).toBe(4627)
      expect(mlDsa87Provider.schemeID).toBe(WalletSchemeID.MLDSA87)
    })
  })

  describe('providerFor dispatch', () => {
    it('returns the canonical provider for each ML-DSA scheme', () => {
      expect(providerFor(WalletSchemeID.MLDSA44)).toBe(mlDsa44Provider)
      expect(providerFor(WalletSchemeID.MLDSA65)).toBe(mlDsa65Provider)
      expect(providerFor(WalletSchemeID.MLDSA87)).toBe(mlDsa87Provider)
    })

    it('throws on a non-ML-DSA scheme byte', () => {
      expect(() => providerFor(WalletSchemeID.Secp256k1)).toThrow(/non-ML-DSA/)
      expect(() => providerFor(WalletSchemeID.None)).toThrow(/non-ML-DSA/)
    })
  })
})

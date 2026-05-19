// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import {
  kemProviderByName,
  mlKem1024Provider,
  mlKem512Provider,
  mlKem768Provider,
} from './mlkem'

describe('ML-KEM providers', () => {
  describe('ML-KEM-768 (FIPS 203 cat 3 — canonical)', () => {
    it('reports the FIPS-203 byte widths', () => {
      // FIPS 203 Table 3 row ML-KEM-768: pk=1184, sk=2400, ct=1088, ss=32.
      expect(mlKem768Provider.publicKeySize).toBe(1184)
      expect(mlKem768Provider.privateKeySize).toBe(2400)
      expect(mlKem768Provider.ciphertextSize).toBe(1088)
      expect(mlKem768Provider.sharedSecretSize).toBe(32)
    })

    it('keygen → encaps → decaps round-trip', () => {
      const { publicKey, privateKey } = mlKem768Provider.keygen()
      expect(publicKey.length).toBe(mlKem768Provider.publicKeySize)
      expect(privateKey.length).toBe(mlKem768Provider.privateKeySize)

      const { ciphertext, sharedSecret } = mlKem768Provider.encapsulate(publicKey)
      expect(ciphertext.length).toBe(mlKem768Provider.ciphertextSize)
      expect(sharedSecret.length).toBe(32)

      const recovered = mlKem768Provider.decapsulate(ciphertext, privateKey)
      expect(recovered).toEqual(sharedSecret)
    })

    it('decaps under wrong sk produces a different (implicit-reject) secret', () => {
      const a = mlKem768Provider.keygen()
      const b = mlKem768Provider.keygen()
      const { ciphertext, sharedSecret } = mlKem768Provider.encapsulate(a.publicKey)
      const wrong = mlKem768Provider.decapsulate(ciphertext, b.privateKey)
      // FIPS 203 implicit rejection: decap with the wrong sk returns a
      // pseudorandom secret derived from a sk-bound rejection hash, NOT
      // an error. The returned bytes MUST differ from the original.
      expect(wrong).not.toEqual(sharedSecret)
    })
  })

  describe('ML-KEM-512', () => {
    it('reports the FIPS-203 byte widths', () => {
      expect(mlKem512Provider.publicKeySize).toBe(800)
      expect(mlKem512Provider.privateKeySize).toBe(1632)
      expect(mlKem512Provider.ciphertextSize).toBe(768)
    })
  })

  describe('ML-KEM-1024', () => {
    it('reports the FIPS-203 byte widths', () => {
      expect(mlKem1024Provider.publicKeySize).toBe(1568)
      expect(mlKem1024Provider.privateKeySize).toBe(3168)
      expect(mlKem1024Provider.ciphertextSize).toBe(1568)
    })
  })

  describe('kemProviderByName dispatch', () => {
    it('returns the canonical provider by name', () => {
      expect(kemProviderByName('ml-kem-512')).toBe(mlKem512Provider)
      expect(kemProviderByName('ml-kem-768')).toBe(mlKem768Provider)
      expect(kemProviderByName('ml-kem-1024')).toBe(mlKem1024Provider)
    })

    it('throws on unknown name', () => {
      expect(() => kemProviderByName('not-a-kem')).toThrow(/unknown KEM/)
    })
  })
})

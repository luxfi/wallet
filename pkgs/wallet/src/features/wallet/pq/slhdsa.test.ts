// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import {
  slhDsa128fProvider,
  slhDsa192fProvider,
  slhDsa192sProvider,
  slhDsaProviderByName,
} from './slhdsa'

// SLH-DSA-192f signing is slow (~hundreds of ms in JS). We keep this
// suite minimal — a single round-trip plus the parameter-set checks.
// The byte-width checks are cheap and run unconditionally.

describe('SLH-DSA providers', () => {
  describe('SLH-DSA-SHA2-192f (FIPS 205 cat 3 — canonical recovery)', () => {
    it('reports the FIPS-205 byte widths', () => {
      // FIPS 205 Table 2 row SLH-DSA-SHA2-192f: pk=48, sk=96, sig=35664.
      expect(slhDsa192fProvider.publicKeySize).toBe(48)
      expect(slhDsa192fProvider.privateKeySize).toBe(96)
      expect(slhDsa192fProvider.signatureSize).toBe(35664)
      expect(slhDsa192fProvider.name).toBe('slh-dsa-sha2-192f')
    })

    it('keygen → sign → verify round-trip under the recovery ctx', () => {
      const { publicKey, privateKey } = slhDsa192fProvider.keygen()
      expect(publicKey.length).toBe(slhDsa192fProvider.publicKeySize)
      expect(privateKey.length).toBe(slhDsa192fProvider.privateKeySize)

      const msg = new TextEncoder().encode('lux-pq-wallet-slhdsa-192f-recovery')
      const sig = slhDsa192fProvider.sign(privateKey, msg, 'recovery')
      expect(sig.length).toBe(slhDsa192fProvider.signatureSize)

      const ok = slhDsa192fProvider.verify(publicKey, msg, sig, 'recovery')
      expect(ok).toBe(true)
    }, 60000) // SLH-DSA-192f signing is slow; allow 60s.
  })

  describe('SLH-DSA-SHA2-128f', () => {
    it('reports the FIPS-205 byte widths', () => {
      // FIPS 205 Table 2 row SLH-DSA-SHA2-128f: pk=32, sk=64, sig=17088.
      expect(slhDsa128fProvider.publicKeySize).toBe(32)
      expect(slhDsa128fProvider.privateKeySize).toBe(64)
      expect(slhDsa128fProvider.signatureSize).toBe(17088)
    })
  })

  describe('SLH-DSA-SHA2-192s', () => {
    it('reports the FIPS-205 small-variant byte widths', () => {
      // FIPS 205 Table 2 row SLH-DSA-SHA2-192s: pk=48, sk=96, sig=16224.
      expect(slhDsa192sProvider.publicKeySize).toBe(48)
      expect(slhDsa192sProvider.privateKeySize).toBe(96)
      expect(slhDsa192sProvider.signatureSize).toBe(16224)
    })
  })

  describe('slhDsaProviderByName dispatch', () => {
    it('returns the canonical provider by name', () => {
      expect(slhDsaProviderByName('slh-dsa-sha2-128f')).toBe(slhDsa128fProvider)
      expect(slhDsaProviderByName('slh-dsa-sha2-192f')).toBe(slhDsa192fProvider)
      expect(slhDsaProviderByName('slh-dsa-sha2-192s')).toBe(slhDsa192sProvider)
    })

    it('throws on unknown name', () => {
      expect(() => slhDsaProviderByName('not-a-sig')).toThrow(/unknown SLH-DSA/)
    })
  })
})

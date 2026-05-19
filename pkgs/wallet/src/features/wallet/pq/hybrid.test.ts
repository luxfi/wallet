// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import { secp256k1 } from '@noble/curves/secp256k1'
import { ed25519 } from '@noble/curves/ed25519'
import {
  decodeHybrid,
  encodeHybrid,
  signHybridEd25519MLDSA,
  signHybridSecp256k1MLDSA,
  verifyHybridEd25519MLDSA,
  verifyHybridSecp256k1MLDSA,
} from './hybrid'
import { mlDsa65Provider } from './mldsa'
import { WalletSchemeID } from './pqAccount'

describe('hybrid signature container', () => {
  it('encode → decode round-trip preserves both halves byte-exactly', () => {
    const classical = new Uint8Array(65).fill(0xab)
    const pq = new Uint8Array(3309).fill(0xcd)
    const wire = encodeHybrid(classical, pq)
    expect(wire.length).toBe(2 + 65 + 2 + 3309)
    const got = decodeHybrid(wire)
    expect(got.classical).toEqual(classical)
    expect(got.pq).toEqual(pq)
  })

  it('encodes length prefixes in big-endian', () => {
    const classical = new Uint8Array(65)
    const pq = new Uint8Array(3309)
    const wire = encodeHybrid(classical, pq)
    // u16be(65)  = 0x00 0x41
    // u16be(3309) = 0x0C 0xED
    expect(wire[0]).toBe(0x00)
    expect(wire[1]).toBe(0x41)
    expect(wire[2 + 65]).toBe(0x0c)
    expect(wire[2 + 65 + 1]).toBe(0xed)
  })

  it('decodeHybrid throws on truncation', () => {
    expect(() => decodeHybrid(new Uint8Array(3))).toThrow(/too short/)
    // Length prefix promises 100 classical bytes but buffer is too small.
    const truncated = new Uint8Array(2 + 50 + 2)
    truncated[1] = 100
    expect(() => decodeHybrid(truncated)).toThrow(/truncated/)
  })

  it('decodeHybrid throws on length mismatch', () => {
    const oversized = encodeHybrid(new Uint8Array(10), new Uint8Array(20))
    // Append a stray byte → total no longer matches the prefixed sum.
    const tampered = new Uint8Array(oversized.length + 1)
    tampered.set(oversized)
    expect(() => decodeHybrid(tampered)).toThrow(/does not match/)
  })

  describe('secp256k1 + ML-DSA-65 hybrid (EVM-shaped)', () => {
    it('sign → verify round-trip succeeds', () => {
      // Use a deterministic ML-DSA seed; secp256k1 sk can be any 32 bytes
      // in [1, n-1] — we pick a clean value below the curve order.
      const classicalSk = new Uint8Array(32)
      classicalSk[31] = 0x42
      const classicalPk = secp256k1.getPublicKey(classicalSk, false)

      const pqSeed = new Uint8Array(32).fill(7)
      const { publicKey: pqPk, privateKey: pqSk } = mlDsa65Provider.newKeyFromSeed(pqSeed)

      const msg = new TextEncoder().encode('hybrid-evm-tx-blob')
      const sig = signHybridSecp256k1MLDSA({
        classicalSk,
        pqSk,
        pqScheme: WalletSchemeID.MLDSA65,
        msg,
        ctx: 'evm-precompile',
      })

      const ok = verifyHybridSecp256k1MLDSA({
        classicalPk,
        pqPk,
        pqScheme: WalletSchemeID.MLDSA65,
        msg,
        signature: sig,
        ctx: 'evm-precompile',
      })
      expect(ok).toBe(true)
    })

    it('verification fails when classical pk is wrong', () => {
      const classicalSk = new Uint8Array(32); classicalSk[31] = 0x11
      const wrongPk = secp256k1.getPublicKey(new Uint8Array(32).fill(0xaa), false)

      const pqSeed = new Uint8Array(32).fill(8)
      const { publicKey: pqPk, privateKey: pqSk } = mlDsa65Provider.newKeyFromSeed(pqSeed)
      const msg = new TextEncoder().encode('hybrid-evm-tx')
      const sig = signHybridSecp256k1MLDSA({
        classicalSk, pqSk, pqScheme: WalletSchemeID.MLDSA65, msg, ctx: 'evm-precompile',
      })
      expect(
        verifyHybridSecp256k1MLDSA({
          classicalPk: wrongPk,
          pqPk,
          pqScheme: WalletSchemeID.MLDSA65,
          msg,
          signature: sig,
          ctx: 'evm-precompile',
        }),
      ).toBe(false)
    })

    it('verification fails when pq pk is wrong (catches a forged classical-only sig)', () => {
      const classicalSk = new Uint8Array(32); classicalSk[31] = 0x22
      const classicalPk = secp256k1.getPublicKey(classicalSk, false)
      const pqSeed = new Uint8Array(32).fill(9)
      const { privateKey: pqSk } = mlDsa65Provider.newKeyFromSeed(pqSeed)
      const wrongPq = mlDsa65Provider.newKeyFromSeed(new Uint8Array(32).fill(99))
      const msg = new TextEncoder().encode('hybrid-evm-tx-2')
      const sig = signHybridSecp256k1MLDSA({
        classicalSk, pqSk, pqScheme: WalletSchemeID.MLDSA65, msg, ctx: 'evm-precompile',
      })
      expect(
        verifyHybridSecp256k1MLDSA({
          classicalPk,
          pqPk: wrongPq.publicKey,
          pqScheme: WalletSchemeID.MLDSA65,
          msg,
          signature: sig,
          ctx: 'evm-precompile',
        }),
      ).toBe(false)
    })
  })

  describe('Ed25519 + ML-DSA-65 hybrid (X-Chain-shaped)', () => {
    it('sign → verify round-trip succeeds', () => {
      const classicalSk = new Uint8Array(32).fill(3)
      const classicalPk = ed25519.getPublicKey(classicalSk)

      const pqSeed = new Uint8Array(32).fill(17)
      const { publicKey: pqPk, privateKey: pqSk } = mlDsa65Provider.newKeyFromSeed(pqSeed)

      const msg = new TextEncoder().encode('hybrid-x-chain-utxo')
      const sig = signHybridEd25519MLDSA({
        classicalSk, pqSk, pqScheme: WalletSchemeID.MLDSA65, msg, ctx: 'x-chain-utxo',
      })

      const ok = verifyHybridEd25519MLDSA({
        classicalPk, pqPk, pqScheme: WalletSchemeID.MLDSA65, msg, signature: sig, ctx: 'x-chain-utxo',
      })
      expect(ok).toBe(true)
    })

    it('verification fails under the wrong ctx (cross-chain replay)', () => {
      const classicalSk = new Uint8Array(32).fill(4)
      const classicalPk = ed25519.getPublicKey(classicalSk)
      const pqSeed = new Uint8Array(32).fill(19)
      const { publicKey: pqPk, privateKey: pqSk } = mlDsa65Provider.newKeyFromSeed(pqSeed)
      const msg = new TextEncoder().encode('cross-ctx-replay-bait')
      // Mint under X-Chain ctx, try to verify as EVM precompile.
      const sig = signHybridEd25519MLDSA({
        classicalSk, pqSk, pqScheme: WalletSchemeID.MLDSA65, msg, ctx: 'x-chain-utxo',
      })
      // classical half verifies fine (no ctx), but PQ half must fail
      // because ctx is different → verify returns false.
      expect(
        verifyHybridEd25519MLDSA({
          classicalPk, pqPk, pqScheme: WalletSchemeID.MLDSA65, msg, signature: sig, ctx: 'evm-precompile',
        }),
      ).toBe(false)
    })
  })
})

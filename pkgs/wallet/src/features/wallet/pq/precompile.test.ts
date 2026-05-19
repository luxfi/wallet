// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import {
  PRECOMPILE_MLDSA,
  PRECOMPILE_MLKEM,
  PRECOMPILE_SLHDSA,
  encodeMLDSAVerifyInput,
  encodeMLKEMVerifyInput,
  encodeSLHDSAVerifyInput,
  verifyMLDSAOnChain,
} from './precompile'
import { mlDsa65Provider, signWithContext } from './mldsa'
import { WalletSchemeID } from './pqAccount'
import { PQ_CONTEXT_EVM_PRECOMPILE_MLDSA } from './domain'

describe('LP-4200 PQ precompile encoders', () => {
  it('pins the canonical precompile addresses', () => {
    expect(PRECOMPILE_MLKEM).toBe('0x0000000000000000000000000000000000012201')
    expect(PRECOMPILE_MLDSA).toBe('0x0000000000000000000000000000000000012202')
    expect(PRECOMPILE_SLHDSA).toBe('0x0000000000000000000000000000000000012203')
  })

  describe('encodeMLDSAVerifyInput', () => {
    it('produces the canonical layout: scheme || ctx_len || ctx || pk_len || pk || sig_len || sig || msg', () => {
      const seed = new Uint8Array(32).fill(7)
      const { publicKey, privateKey } = mlDsa65Provider.newKeyFromSeed(seed)
      const msg = new TextEncoder().encode('on-chain-verify-target')
      const signature = signWithContext(mlDsa65Provider, privateKey, msg, 'evm-precompile')

      const input = encodeMLDSAVerifyInput({
        scheme: WalletSchemeID.MLDSA65,
        ctx: 'evm-precompile',
        publicKey,
        signature,
        msg,
      })

      // First byte = scheme = 0x42 (ML-DSA-65).
      expect(input[0]).toBe(0x42)
      // Second byte = ctx length = len("lux-evm-precompile-mldsa-v1") = 27.
      expect(input[1]).toBe(PQ_CONTEXT_EVM_PRECOMPILE_MLDSA.length)
      // Then ctx bytes.
      const ctxSlice = input.slice(2, 2 + 27)
      expect(new TextDecoder().decode(ctxSlice)).toBe(PQ_CONTEXT_EVM_PRECOMPILE_MLDSA)
      // Then 2-byte BE pk length = 1952.
      const pkLen = (input[2 + 27] << 8) | input[2 + 27 + 1]
      expect(pkLen).toBe(mlDsa65Provider.publicKeySize)
      // Then pk bytes.
      const pkStart = 2 + 27 + 2
      const pkSlice = input.slice(pkStart, pkStart + pkLen)
      expect(pkSlice).toEqual(publicKey)
      // Then 3-byte BE sig length = 3309.
      const sigLenStart = pkStart + pkLen
      const sigLen =
        (input[sigLenStart] << 16) |
        (input[sigLenStart + 1] << 8) |
        input[sigLenStart + 2]
      expect(sigLen).toBe(mlDsa65Provider.signatureSize)
      // Then sig bytes.
      const sigStart = sigLenStart + 3
      const sigSlice = input.slice(sigStart, sigStart + sigLen)
      expect(sigSlice).toEqual(signature)
      // Then msg.
      const msgSlice = input.slice(sigStart + sigLen)
      expect(msgSlice).toEqual(msg)
    })

    it('rejects non-ML-DSA scheme bytes', () => {
      expect(() =>
        encodeMLDSAVerifyInput({
          scheme: WalletSchemeID.Secp256k1,
          ctx: 'evm-precompile',
          publicKey: new Uint8Array(1),
          signature: new Uint8Array(1),
          msg: new Uint8Array(1),
        }),
      ).toThrow(/not ML-DSA/)
    })
  })

  describe('encodeMLKEMVerifyInput', () => {
    it('produces the canonical layout: variant || pk_len || pk || ct_len || ct || ss_len || ss', () => {
      const pk = new Uint8Array(1184).fill(0xa1)
      const ct = new Uint8Array(1088).fill(0xb2)
      const ss = new Uint8Array(32).fill(0xc3)
      const input = encodeMLKEMVerifyInput({ variant: 2, publicKey: pk, ciphertext: ct, sharedSecret: ss })
      expect(input[0]).toBe(0x02)
      const pkLen = (input[1] << 8) | input[2]
      expect(pkLen).toBe(1184)
      const ctLen = (input[3 + 1184] << 8) | input[3 + 1184 + 1]
      expect(ctLen).toBe(1088)
      const ssLen = input[3 + 1184 + 2 + 1088]
      expect(ssLen).toBe(32)
    })
  })

  describe('encodeSLHDSAVerifyInput', () => {
    it('produces a non-empty input buffer', () => {
      const input = encodeSLHDSAVerifyInput({
        paramSet: 0x09,
        ctx: 'recovery',
        publicKey: new Uint8Array(48),
        signature: new Uint8Array(35664),
        msg: new TextEncoder().encode('recovery-target'),
      })
      // paramSet(1) + ctx_len(1) + ctx(22 for 'lux-recovery-slhdsa-v1') + pk_len(2)
      //   + pk(48) + sig_len(3) + sig(35664) + msg(15) = 35756.
      expect(input.length).toBe(1 + 1 + 22 + 2 + 48 + 3 + 35664 + 15)
      expect(input[0]).toBe(0x09)
      expect(input[1]).toBe(22)
    })
  })

  describe('verifyMLDSAOnChain (eth_call wrapper)', () => {
    it('dispatches to the canonical precompile address', async () => {
      const calls: Array<{ to: string; data: string }> = []
      const mockClient = {
        async call(input: { to: `0x${string}`; data: `0x${string}` }) {
          calls.push(input)
          // Precompile returns 0x...01 on valid.
          return ('0x' + '00'.repeat(31) + '01') as `0x${string}`
        },
      }
      const seed = new Uint8Array(32).fill(11)
      const { publicKey, privateKey } = mlDsa65Provider.newKeyFromSeed(seed)
      const msg = new TextEncoder().encode('on-chain-call')
      const sig = signWithContext(mlDsa65Provider, privateKey, msg, 'evm-precompile')

      const ok = await verifyMLDSAOnChain(mockClient, {
        scheme: WalletSchemeID.MLDSA65, ctx: 'evm-precompile', publicKey, signature: sig, msg,
      })
      expect(ok).toBe(true)
      expect(calls.length).toBe(1)
      expect(calls[0].to).toBe(PRECOMPILE_MLDSA)
      // Input prefixes the scheme byte 0x42 right after "0x".
      expect(calls[0].data.startsWith('0x42')).toBe(true)
    })

    it('returns false when the precompile returns zero', async () => {
      const mockClient = {
        async call(_input: { to: `0x${string}`; data: `0x${string}` }) {
          return ('0x' + '00'.repeat(32)) as `0x${string}`
        },
      }
      const seed = new Uint8Array(32).fill(13)
      const { publicKey, privateKey } = mlDsa65Provider.newKeyFromSeed(seed)
      const msg = new TextEncoder().encode('not-on-chain')
      const sig = signWithContext(mlDsa65Provider, privateKey, msg, 'evm-precompile')
      const ok = await verifyMLDSAOnChain(mockClient, {
        scheme: WalletSchemeID.MLDSA65, ctx: 'evm-precompile', publicKey, signature: sig, msg,
      })
      expect(ok).toBe(false)
    })
  })
})

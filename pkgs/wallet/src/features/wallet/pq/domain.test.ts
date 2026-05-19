// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import {
  PQ_CONTEXT_EVM_PRECOMPILE_MLDSA,
  PQ_CONTEXT_HANDSHAKE_MLKEM,
  PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA,
  PQ_CONTEXT_RECOVERY_SLHDSA,
  PQ_CONTEXT_X_CHAIN_UTXO_MLDSA,
  contextBytesFor,
  contextStringFor,
} from './domain'

describe('PQ domain separators', () => {
  it('pin byte content for the EVM precompile + X-Chain contexts', () => {
    // These strings are wire-compatibility critical. The Lux on-chain
    // verifier rebuilds the FIPS-204 M' prefix from the same literal,
    // so any drift here is a wallet-incompatible regression.
    expect(PQ_CONTEXT_EVM_PRECOMPILE_MLDSA).toBe('lux-evm-precompile-mldsa-v1')
    expect(PQ_CONTEXT_X_CHAIN_UTXO_MLDSA).toBe('lux-x-chain-utxo-v1')
    expect(PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA).toBe('lux-p-chain-platform-mldsa-v1')
    expect(PQ_CONTEXT_RECOVERY_SLHDSA).toBe('lux-recovery-slhdsa-v1')
    expect(PQ_CONTEXT_HANDSHAKE_MLKEM).toBe('lux-handshake-mlkem-v1')
  })

  it('all contexts fit in the FIPS-204 §5.4 255-byte ctx limit', () => {
    for (const c of [
      'evm-precompile',
      'x-chain-utxo',
      'p-chain-platform',
      'recovery',
      'handshake',
    ] as const) {
      const bytes = contextBytesFor(c)
      expect(bytes.length).toBeLessThanOrEqual(255)
      expect(bytes.length).toBeGreaterThan(0)
    }
  })

  it('contextStringFor returns the canonical string', () => {
    expect(contextStringFor('evm-precompile')).toBe(PQ_CONTEXT_EVM_PRECOMPILE_MLDSA)
    expect(contextStringFor('x-chain-utxo')).toBe(PQ_CONTEXT_X_CHAIN_UTXO_MLDSA)
    expect(contextStringFor('p-chain-platform')).toBe(PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA)
    expect(contextStringFor('recovery')).toBe(PQ_CONTEXT_RECOVERY_SLHDSA)
    expect(contextStringFor('handshake')).toBe(PQ_CONTEXT_HANDSHAKE_MLKEM)
  })

  it('contextBytesFor is UTF-8 encoded', () => {
    const bytes = contextBytesFor('evm-precompile')
    expect(new TextDecoder().decode(bytes)).toBe(PQ_CONTEXT_EVM_PRECOMPILE_MLDSA)
  })
})

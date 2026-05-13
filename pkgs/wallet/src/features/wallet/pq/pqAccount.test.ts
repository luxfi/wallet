// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import { cshake256 } from '@noble/hashes/sha3-addons'
import {
  ACCOUNT_ID_SIZE,
  CSHAKE_CUSTOMIZATION_ACCOUNT_ID,
  CSHAKE_CUSTOMIZATION_IDENTITY,
  CSHAKE_CUSTOMIZATION_RECOVERY,
  CSHAKE_CUSTOMIZATION_SESSION,
  CSHAKE_CUSTOMIZATION_TX,
  WalletSchemeID,
  deriveAccountID,
  expandChildSeed,
  formatPQPath,
  formatRecoveryPath,
  isClassicalCompat,
  isPostQuantum,
  roleCustomization,
  roleHDIndex,
  walletSchemeName,
} from './pqAccount'

describe('cSHAKE customization strings', () => {
  it('pin to canonical V1 byte content', () => {
    // These strings are wire-compatibility critical. A change here
    // is a wallet-incompatible regression; pin the literal content.
    expect(CSHAKE_CUSTOMIZATION_IDENTITY).toBe('LUX/WALLET/IDENTITY/V1')
    expect(CSHAKE_CUSTOMIZATION_TX).toBe('LUX/WALLET/TX/V1')
    expect(CSHAKE_CUSTOMIZATION_SESSION).toBe('LUX/WALLET/SESSION/V1')
    expect(CSHAKE_CUSTOMIZATION_RECOVERY).toBe('LUX/WALLET/RECOVERY/V1')
    expect(CSHAKE_CUSTOMIZATION_ACCOUNT_ID).toBe('LUX/WALLET/ACCOUNT_ID/V1')
  })

  it('all start with LUX/ and end with /V1', () => {
    const all = [
      CSHAKE_CUSTOMIZATION_IDENTITY,
      CSHAKE_CUSTOMIZATION_TX,
      CSHAKE_CUSTOMIZATION_SESSION,
      CSHAKE_CUSTOMIZATION_RECOVERY,
      CSHAKE_CUSTOMIZATION_ACCOUNT_ID,
    ]
    for (const s of all) {
      expect(s.startsWith('LUX/')).toBe(true)
      expect(s.endsWith('/V1')).toBe(true)
    }
  })
})

describe('deriveAccountID', () => {
  it('produces a deterministic 48-byte AccountID', () => {
    const pubkey = new Uint8Array([1, 2, 3, 4, 5])
    const a = deriveAccountID(7, WalletSchemeID.MLDSA65, pubkey)
    const b = deriveAccountID(7, WalletSchemeID.MLDSA65, pubkey)
    expect(a.length).toBe(ACCOUNT_ID_SIZE)
    expect(a).toEqual(b)
  })

  it('produces different IDs for different chains', () => {
    const pubkey = new Uint8Array([1, 2, 3])
    const a = deriveAccountID(1, WalletSchemeID.MLDSA65, pubkey)
    const b = deriveAccountID(2, WalletSchemeID.MLDSA65, pubkey)
    expect(a).not.toEqual(b)
  })

  it('produces different IDs for different schemes', () => {
    const pubkey = new Uint8Array([1, 2, 3])
    const a = deriveAccountID(1, WalletSchemeID.MLDSA65, pubkey)
    const b = deriveAccountID(1, WalletSchemeID.MLDSA87, pubkey)
    expect(a).not.toEqual(b)
  })

  it('matches a hand-computed cSHAKE output', () => {
    // KAT: re-compute the AccountID using a fresh cshake256 call so a
    // regression in deriveAccountID's input layout (e.g. wrong byte
    // order on chainID, missing scheme byte) is caught.
    const pubkey = new TextEncoder().encode('test-pubkey-for-accountid-kat-vector-stable-across-runs')
    const chainID = 9000
    const scheme = WalletSchemeID.MLDSA65

    const got = deriveAccountID(chainID, scheme, pubkey)

    const cidBytes = new Uint8Array(4)
    new DataView(cidBytes.buffer).setUint32(0, chainID, false)
    const msg = new Uint8Array(cidBytes.length + 1 + pubkey.length)
    msg.set(cidBytes, 0)
    msg.set(new Uint8Array([scheme]), cidBytes.length)
    msg.set(pubkey, cidBytes.length + 1)
    const want = cshake256(msg, {
      personalization: CSHAKE_CUSTOMIZATION_ACCOUNT_ID,
      NISTfn: 'LUX_ACCOUNT_V1',
      dkLen: ACCOUNT_ID_SIZE,
    })
    expect(got).toEqual(want)
  })

  it('throws on nil pubkey', () => {
    expect(() =>
      // Cast through unknown so TS doesn't reject the test of a
      // runtime guard.
      deriveAccountID(1, WalletSchemeID.MLDSA65, null as unknown as Uint8Array),
    ).toThrow(/pubkey is required/)
  })

  it('throws on out-of-range chainID', () => {
    expect(() => deriveAccountID(-1, WalletSchemeID.MLDSA65, new Uint8Array(1))).toThrow(/chainID/)
    expect(() => deriveAccountID(2 ** 32, WalletSchemeID.MLDSA65, new Uint8Array(1))).toThrow(/chainID/)
  })
})

describe('expandChildSeed', () => {
  it('is deterministic for the same (seed, customization, outLen)', () => {
    const seed = new TextEncoder().encode('test-child-seed-32-bytes-long-ok!')
    const a = expandChildSeed(seed, CSHAKE_CUSTOMIZATION_IDENTITY, 32)
    const b = expandChildSeed(seed, CSHAKE_CUSTOMIZATION_IDENTITY, 32)
    expect(a).toEqual(b)
    expect(a.length).toBe(32)
  })

  it('gives different output for different customizations', () => {
    const seed = new TextEncoder().encode('test-child-seed-32-bytes-long-ok!')
    const a = expandChildSeed(seed, CSHAKE_CUSTOMIZATION_IDENTITY, 32)
    const b = expandChildSeed(seed, CSHAKE_CUSTOMIZATION_TX, 32)
    expect(a).not.toEqual(b)
  })

  it('throws on bad inputs', () => {
    expect(() => expandChildSeed(new Uint8Array(0), CSHAKE_CUSTOMIZATION_IDENTITY, 32)).toThrow(/empty/)
    expect(() => expandChildSeed(new Uint8Array([1]), CSHAKE_CUSTOMIZATION_IDENTITY, 0)).toThrow(/outLen/)
    expect(() => expandChildSeed(new Uint8Array([1]), '', 32)).toThrow(/customization/)
  })
})

describe('WalletSchemeID helpers', () => {
  it('walletSchemeName returns the canonical name', () => {
    expect(walletSchemeName(WalletSchemeID.None)).toBe('none')
    expect(walletSchemeName(WalletSchemeID.Secp256k1)).toBe('secp256k1')
    expect(walletSchemeName(WalletSchemeID.MLDSA65)).toBe('ml-dsa-65')
    expect(walletSchemeName(0xaa as WalletSchemeID)).toBe('wallet-scheme(0xaa)')
  })

  it('isPostQuantum is true for the ML-DSA block only', () => {
    expect(isPostQuantum(WalletSchemeID.MLDSA44)).toBe(true)
    expect(isPostQuantum(WalletSchemeID.MLDSA65)).toBe(true)
    expect(isPostQuantum(WalletSchemeID.MLDSA87)).toBe(true)
    expect(isPostQuantum(WalletSchemeID.Secp256k1)).toBe(false)
    expect(isPostQuantum(WalletSchemeID.None)).toBe(false)
  })

  it('isClassicalCompat is true for secp256k1 only', () => {
    expect(isClassicalCompat(WalletSchemeID.Secp256k1)).toBe(true)
    expect(isClassicalCompat(WalletSchemeID.MLDSA65)).toBe(false)
  })
})

describe('AccountRole helpers', () => {
  it('roleHDIndex returns the canonical indices', () => {
    expect(roleHDIndex('identity')).toBe(0)
    expect(roleHDIndex('tx')).toBe(1)
    expect(roleHDIndex('session')).toBe(2)
  })

  it('roleHDIndex throws on recovery', () => {
    expect(() => roleHDIndex('recovery')).toThrow(/recovery/i)
  })

  it('roleCustomization maps to the canonical strings', () => {
    expect(roleCustomization('identity')).toBe(CSHAKE_CUSTOMIZATION_IDENTITY)
    expect(roleCustomization('tx')).toBe(CSHAKE_CUSTOMIZATION_TX)
    expect(roleCustomization('session')).toBe(CSHAKE_CUSTOMIZATION_SESSION)
    expect(roleCustomization('recovery')).toBe(CSHAKE_CUSTOMIZATION_RECOVERY)
  })
})

describe('HD path formatters', () => {
  it('formatPQPath produces the canonical wallet path', () => {
    expect(formatPQPath(9000, 0, 0)).toBe("m/44'/9000'/9000'/0'/0'/0'")
    expect(formatPQPath(1, 1, 42)).toBe("m/44'/9000'/1'/0'/1'/42'")
  })

  it('formatRecoveryPath produces the canonical recovery path', () => {
    expect(formatRecoveryPath(9000, 0)).toBe("m/44'/9000'/9000'/2'/0'")
    expect(formatRecoveryPath(1, 42)).toBe("m/44'/9000'/1'/2'/42'")
  })

  it('formatPQPath rejects out-of-range indices', () => {
    expect(() => formatPQPath(-1, 0, 0)).toThrow(/chainID/)
    expect(() => formatPQPath(0, 2 ** 31, 0)).toThrow(/roleIdx/)
    expect(() => formatPQPath(0, 0, 2 ** 31)).toThrow(/accountIdx/)
  })
})

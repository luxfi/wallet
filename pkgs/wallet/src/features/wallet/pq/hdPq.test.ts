// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

import {
  derivePQAccount,
  derivePQIdentity,
  deriveRecoveryAccount,
} from './hdPq'
import { ACCOUNT_ID_SIZE, WalletSchemeID, formatPQPath, formatRecoveryPath } from './pqAccount'
import { mlDsa65Provider } from './mldsa'
import { slhDsa192fProvider } from './slhdsa'

// BIP-39 test vector — same mnemonic the upstream BIP-39 test suite uses
// for "trezor" entropy. Stable across @scure/bip39 releases.
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('HD PQ derivation', () => {
  describe('derivePQIdentity (ML-DSA-65 over m/44\'/9000\'/<chainID>\'/0\'/0\'/0\')', () => {
    it('produces a deterministic identity account for a given mnemonic + chain', () => {
      const a = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      const b = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      expect(a.publicKey).toEqual(b.publicKey)
      expect(a.privateKey).toEqual(b.privateKey)
      expect(a.accountID).toEqual(b.accountID)
    })

    it('uses the canonical Lux PQ HD path', () => {
      const acct = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      // formatPQPath(chainID=96369, roleIdx=0 (identity), accountIdx=0)
      expect(acct.derivationPath).toBe(formatPQPath(96369, 0, 0))
      expect(acct.derivationPath).toBe("m/44'/9000'/96369'/0'/0'/0'")
    })

    it('emits ML-DSA-65 key material with the FIPS-204 byte widths', () => {
      const acct = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      expect(acct.schemeID).toBe(WalletSchemeID.MLDSA65)
      expect(acct.publicKey.length).toBe(mlDsa65Provider.publicKeySize)
      expect(acct.privateKey?.length).toBe(mlDsa65Provider.privateKeySize)
      expect(acct.accountID.length).toBe(ACCOUNT_ID_SIZE)
      expect(acct.role).toBe('identity')
    })

    it('two chains produce different keys from the same mnemonic — chain binding', () => {
      const a = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 1 })
      const b = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 2 })
      expect(a.publicKey).not.toEqual(b.publicKey)
      expect(a.accountID).not.toEqual(b.accountID)
    })

    it('two account indices produce different keys — multi-account support', () => {
      const a = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 96369, accountIdx: 0 })
      const b = derivePQIdentity({ mnemonic: TEST_MNEMONIC, chainID: 96369, accountIdx: 1 })
      expect(a.publicKey).not.toEqual(b.publicKey)
    })

    it('two roles produce different keys — role binding (identity vs tx vs session)', () => {
      const identity = derivePQAccount({
        mnemonic: TEST_MNEMONIC, chainID: 96369, role: 'identity', accountIdx: 0,
        scheme: WalletSchemeID.MLDSA65,
      })
      const tx = derivePQAccount({
        mnemonic: TEST_MNEMONIC, chainID: 96369, role: 'tx', accountIdx: 0,
        scheme: WalletSchemeID.MLDSA65,
      })
      const session = derivePQAccount({
        mnemonic: TEST_MNEMONIC, chainID: 96369, role: 'session', accountIdx: 0,
        scheme: WalletSchemeID.MLDSA65,
      })
      expect(identity.publicKey).not.toEqual(tx.publicKey)
      expect(tx.publicKey).not.toEqual(session.publicKey)
      expect(identity.publicKey).not.toEqual(session.publicKey)
    })
  })

  describe('deriveRecoveryAccount (SLH-DSA-192f over m/44\'/9000\'/<chainID>\'/2\'/0\')', () => {
    it('produces a deterministic recovery keypair', () => {
      const a = deriveRecoveryAccount({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      const b = deriveRecoveryAccount({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      expect(a.publicKey).toEqual(b.publicKey)
      expect(a.privateKey).toEqual(b.privateKey)
    }, 60000)

    it('uses the canonical Lux recovery HD path', () => {
      const acct = deriveRecoveryAccount({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      expect(acct.derivationPath).toBe(formatRecoveryPath(96369, 0))
      expect(acct.derivationPath).toBe("m/44'/9000'/96369'/2'/0'")
    }, 60000)

    it('emits SLH-DSA-192f key material with the FIPS-205 byte widths', () => {
      const acct = deriveRecoveryAccount({ mnemonic: TEST_MNEMONIC, chainID: 96369 })
      expect(acct.providerName).toBe('slh-dsa-sha2-192f')
      expect(acct.publicKey.length).toBe(slhDsa192fProvider.publicKeySize)
      expect(acct.privateKey.length).toBe(slhDsa192fProvider.privateKeySize)
    }, 60000)
  })
})

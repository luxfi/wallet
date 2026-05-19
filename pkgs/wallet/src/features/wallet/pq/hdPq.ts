// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * HD derivation for PQ accounts.
 *
 * Composition pipeline (mirrors luxfi/sdk wallet/keychain pq derivation):
 *
 *   BIP-39 mnemonic
 *     → BIP-39 seed (PBKDF2-SHA512, "mnemonic"+passphrase, 2048 iters, 64 bytes)
 *       → BIP-32 master key (HMAC-SHA512 over "Bitcoin seed")
 *         → BIP-32 child node at `m/44'/9000'/<chainID>'/0'/<roleIdx>'/<accountIdx>'`
 *           → 32-byte chainCode || privateKey (256 bits)
 *             → expandChildSeed(privateKey, customization, 32)
 *               → ξ — the 32-byte FIPS-204 seed
 *                 → MLDSAProvider.newKeyFromSeed(ξ)
 *                   → (publicKey, privateKey) for the chosen ML-DSA parameter set
 *
 * The cSHAKE expansion is the domain separator: with role-specific
 * customization strings ("LUX/WALLET/IDENTITY/V1", "LUX/WALLET/TX/V1",
 * "LUX/WALLET/SESSION/V1") two accounts sharing the same BIP-32 leaf
 * still produce uncorrelated ML-DSA keys, so a leaked identity key
 * cannot be used to derive the tx key.
 *
 * Recovery keys live on a parallel branch under coin-type 9000 with
 * change-index 2 and SLH-DSA seed expansion.
 */

import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import {
  type AccountRole,
  type MLDSAProvider,
  type PQAccount,
  WalletSchemeID,
  deriveAccountID,
  expandChildSeed,
  formatPQPath,
  formatRecoveryPath,
  roleCustomization,
  roleHDIndex,
  CSHAKE_CUSTOMIZATION_RECOVERY,
} from './pqAccount'
import { providerFor } from './mldsa'
import { type SLHDSAProvider, slhDsa192fProvider } from './slhdsa'

/** Derive the canonical PQ identity account for an unlocked mnemonic. */
export function derivePQIdentity(opts: {
  mnemonic: string
  chainID: number
  accountIdx?: number
  scheme?: WalletSchemeID
  passphrase?: string
}): PQAccount {
  return derivePQAccount({
    mnemonic: opts.mnemonic,
    chainID: opts.chainID,
    role: 'identity',
    accountIdx: opts.accountIdx ?? 0,
    scheme: opts.scheme ?? WalletSchemeID.MLDSA65,
    passphrase: opts.passphrase,
  })
}

/** Derive a per-role ML-DSA account. role='identity' is the canonical PQ identity. */
export function derivePQAccount(opts: {
  mnemonic: string
  chainID: number
  role: Exclude<AccountRole, 'recovery'>
  accountIdx: number
  scheme: WalletSchemeID
  passphrase?: string
}): PQAccount {
  const provider = providerFor(opts.scheme)
  const roleIdx = roleHDIndex(opts.role)
  const customization = roleCustomization(opts.role)
  const path = formatPQPath(opts.chainID, roleIdx, opts.accountIdx)

  const childPriv = deriveBip32ChildPrivkey(opts.mnemonic, path, opts.passphrase)
  const seed = expandChildSeed(childPriv, customization, 32)
  const { publicKey, privateKey } = provider.newKeyFromSeed(seed)
  const accountID = deriveAccountID(opts.chainID, opts.scheme, publicKey)

  return {
    accountID,
    schemeID: opts.scheme,
    publicKey,
    privateKey,
    role: opts.role,
    derivationPath: path,
  }
}

/**
 * Derive an SLH-DSA recovery account on the parallel branch. Returns
 * the canonical 192f recovery account unless a different provider is
 * supplied (e.g. 128f for lightweight cold storage).
 */
export function deriveRecoveryAccount(opts: {
  mnemonic: string
  chainID: number
  accountIdx?: number
  passphrase?: string
  provider?: SLHDSAProvider
}): {
  publicKey: Uint8Array
  privateKey: Uint8Array
  derivationPath: string
  providerName: string
} {
  const provider = opts.provider ?? slhDsa192fProvider
  const accountIdx = opts.accountIdx ?? 0
  const path = formatRecoveryPath(opts.chainID, accountIdx)
  const childPriv = deriveBip32ChildPrivkey(opts.mnemonic, path, opts.passphrase)
  // SLH-DSA expects a seed roughly the size of the secret-key blocks.
  // We expand the 32-byte BIP-32 leaf to the provider's seed/secret-key
  // width via the canonical Lux cSHAKE recovery customization. For
  // SLH-DSA-192f noble takes its 96-byte secret key internally from
  // keygen(seed) when seed is the right length; noble's slh_dsa keygen
  // accepts seed length 3*N (where N is the security parameter in bytes
  // — 24 for 192). We expand to 3*24 = 72 bytes.
  const seedLen = provider.privateKeySize === 96 ? 72 : provider.privateKeySize
  const seed = expandChildSeed(childPriv, CSHAKE_CUSTOMIZATION_RECOVERY, seedLen)
  const { publicKey, privateKey } = provider.keygen(seed)
  return {
    publicKey,
    privateKey,
    derivationPath: path,
    providerName: provider.name,
  }
}

/** Convert a BIP-39 mnemonic into a 64-byte seed and run a BIP-32 derivation. */
function deriveBip32ChildPrivkey(
  mnemonic: string,
  path: string,
  passphrase?: string,
): Uint8Array {
  const seed = mnemonicToSeedSync(mnemonic.normalize('NFKD').trim(), passphrase ?? '')
  const root = HDKey.fromMasterSeed(seed)
  const child = root.derive(path)
  if (!child.privateKey) {
    throw new Error(`pq/hdPq: derivation returned no private key for ${path}`)
  }
  return child.privateKey
}

/** Re-export so consumers don't need a second import. */
export { providerFor } from './mldsa'
export type { MLDSAProvider }

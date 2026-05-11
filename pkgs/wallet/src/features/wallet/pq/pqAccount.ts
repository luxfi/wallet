// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * pqAccount — TypeScript shape mirror of the Go PQAccount type defined in
 * github.com/luxfi/sdk/wallet/account.
 *
 * The TS side intentionally does NOT implement ML-DSA-65 in this file.
 * ML-DSA itself is software-in-browser (no WebCrypto exposure of FIPS 204);
 * the cost of pulling a full ML-DSA implementation into the wallet bundle
 * is large and only justified for users who actually intend to sign
 * locally. Instead, this module:
 *
 *   1. Defines the canonical PQAccount shape (AccountID, scheme, role,
 *      derivation path, public key) so consumers can serialise / display
 *      / route accounts without owning the signing implementation.
 *
 *   2. Implements the cSHAKE-256 AccountID derivation (pure-TS via
 *      @noble/hashes) so a TS-side consumer can validate that a Go-signed
 *      transaction carries the AccountID the consumer expects.
 *
 *   3. Declares a tight MLDSAProvider interface. Consumers that need to
 *      sign in-browser plug a concrete provider (typically backed by
 *      @noble/post-quantum mlDsa65) at the call site. Browser keys are
 *      session-scoped; long-lived keys MUST live in a hardware or native
 *      wallet, not in this module's memory.
 *
 * The customization strings and HD-path constants here are byte-identical
 * to the Go side. A mismatch is a wallet-incompatible regression; the
 * unit tests in pqAccount.test.ts pin the strings.
 */

import { cshake256 } from '@noble/hashes/sha3-addons'

// ---------------------------------------------------------------------------
// Scheme enum (mirrors github.com/luxfi/sdk/wallet/account.WalletSchemeID).
// ---------------------------------------------------------------------------

export enum WalletSchemeID {
  None = 0x00,
  Secp256k1 = 0x10,
  MLDSA44 = 0x41,
  MLDSA65 = 0x42, // production default
  MLDSA87 = 0x43,
}

export function walletSchemeName(s: WalletSchemeID): string {
  switch (s) {
    case WalletSchemeID.None:
      return 'none'
    case WalletSchemeID.Secp256k1:
      return 'secp256k1'
    case WalletSchemeID.MLDSA44:
      return 'ml-dsa-44'
    case WalletSchemeID.MLDSA65:
      return 'ml-dsa-65'
    case WalletSchemeID.MLDSA87:
      return 'ml-dsa-87'
    default:
      return `wallet-scheme(0x${s.toString(16).padStart(2, '0')})`
  }
}

export function isPostQuantum(s: WalletSchemeID): boolean {
  return s === WalletSchemeID.MLDSA44 || s === WalletSchemeID.MLDSA65 || s === WalletSchemeID.MLDSA87
}

export function isClassicalCompat(s: WalletSchemeID): boolean {
  return s === WalletSchemeID.Secp256k1
}

// ---------------------------------------------------------------------------
// Account roles (mirrors account.AccountRole).
// ---------------------------------------------------------------------------

export type AccountRole = 'identity' | 'tx' | 'session' | 'recovery'

export const ACCOUNT_ROLE_IDENTITY: AccountRole = 'identity'
export const ACCOUNT_ROLE_TX: AccountRole = 'tx'
export const ACCOUNT_ROLE_SESSION: AccountRole = 'session'
export const ACCOUNT_ROLE_RECOVERY: AccountRole = 'recovery'

// Conventional HD indices on the ML-DSA branch (0'). Mirrors
// account.AccountRole.HDIndex on the Go side.
export function roleHDIndex(role: AccountRole): number {
  switch (role) {
    case 'identity':
      return 0
    case 'tx':
      return 1
    case 'session':
      return 2
    case 'recovery':
      throw new Error('pqAccount: recovery role is reserved for SLH-DSA accounts')
    default: {
      const _exhaustive: never = role
      throw new Error(`pqAccount: unknown role ${_exhaustive as string}`)
    }
  }
}

// ---------------------------------------------------------------------------
// cSHAKE customization strings (mirrors account/cshake.go).
//
// MUST be byte-identical to the Go side. Changes here are
// wallet-incompatible.
// ---------------------------------------------------------------------------

export const CSHAKE_CUSTOMIZATION_IDENTITY = 'LUX/WALLET/IDENTITY/V1'
export const CSHAKE_CUSTOMIZATION_TX = 'LUX/WALLET/TX/V1'
export const CSHAKE_CUSTOMIZATION_SESSION = 'LUX/WALLET/SESSION/V1'
export const CSHAKE_CUSTOMIZATION_RECOVERY = 'LUX/WALLET/RECOVERY/V1'
export const CSHAKE_CUSTOMIZATION_ACCOUNT_ID = 'LUX/WALLET/ACCOUNT_ID/V1'

const ACCOUNT_ID_LABEL = 'LUX_ACCOUNT_V1'
export const ACCOUNT_ID_SIZE = 48

// ---------------------------------------------------------------------------
// AccountID derivation (mirrors account.DeriveAccountID).
// ---------------------------------------------------------------------------

/**
 * Compute the canonical 48-byte AccountID for a (chainID, scheme, pubkey)
 * triple. Pure function; same inputs → same output. Throws if pubkey is
 * null/undefined.
 *
 * The function-name (N) passed to cSHAKE is "LUX_ACCOUNT_V1"; the
 * customization (S) is "LUX/WALLET/ACCOUNT_ID/V1"; the message is
 * u32be(chainID) || u8(scheme) || pubkey. Output length is fixed at 48
 * bytes (SHAKE256-384 equivalent). Identical to the Go implementation.
 */
export function deriveAccountID(chainID: number, scheme: WalletSchemeID, pubkey: Uint8Array): Uint8Array {
  if (!pubkey) {
    throw new Error('pqAccount: pubkey is required')
  }
  if (!Number.isInteger(chainID) || chainID < 0 || chainID >= 2 ** 32) {
    throw new Error(`pqAccount: chainID ${chainID} out of u32 range`)
  }

  const cidBytes = new Uint8Array(4)
  new DataView(cidBytes.buffer).setUint32(0, chainID, false) // big-endian
  const schemeByte = new Uint8Array([scheme])

  // cshake256 in @noble/hashes accepts an input message; we concatenate
  // (chainBytes || schemeByte || pubkey) into a single buffer because the
  // Go side feeds these to cSHAKE in three sequential Write calls. cSHAKE
  // does NOT length-prefix consecutive writes (per NIST SP 800-185), so
  // multi-Write and single-Write of the concatenation are identical.
  const msg = new Uint8Array(cidBytes.length + 1 + pubkey.length)
  msg.set(cidBytes, 0)
  msg.set(schemeByte, cidBytes.length)
  msg.set(pubkey, cidBytes.length + 1)

  return cshake256(msg, {
    personalization: CSHAKE_CUSTOMIZATION_ACCOUNT_ID,
    NISTfn: ACCOUNT_ID_LABEL,
    dkLen: ACCOUNT_ID_SIZE,
  })
}

/**
 * Expand a BIP-32 child seed into a fixed-length keygen-input stream
 * under a role-bound cSHAKE-256 customization. Mirrors
 * account.expandChildSeed. Function-name (N) is "LUX_PQ_KEYGEN_V1".
 */
export function expandChildSeed(childSeed: Uint8Array, customization: string, outLen: number): Uint8Array {
  if (!childSeed || childSeed.length === 0) {
    throw new Error('pqAccount: child seed is empty')
  }
  if (outLen <= 0) {
    throw new Error(`pqAccount: outLen ${outLen} must be positive`)
  }
  if (!customization) {
    throw new Error('pqAccount: customization is empty')
  }
  return cshake256(childSeed, {
    personalization: customization,
    NISTfn: 'LUX_PQ_KEYGEN_V1',
    dkLen: outLen,
  })
}

/**
 * Map an AccountRole to its cSHAKE customization string.
 */
export function roleCustomization(role: AccountRole): string {
  switch (role) {
    case 'identity':
      return CSHAKE_CUSTOMIZATION_IDENTITY
    case 'tx':
      return CSHAKE_CUSTOMIZATION_TX
    case 'session':
      return CSHAKE_CUSTOMIZATION_SESSION
    case 'recovery':
      return CSHAKE_CUSTOMIZATION_RECOVERY
    default: {
      const _exhaustive: never = role
      throw new Error(`pqAccount: unknown role ${_exhaustive as string}`)
    }
  }
}

// ---------------------------------------------------------------------------
// PQAccount shape (mirrors account.PQAccount).
// ---------------------------------------------------------------------------

/**
 * PQAccount is the TS-side view of a PQ-native wallet account.
 *
 * accountID — 48 bytes, derived via deriveAccountID().
 * schemeID — WalletSchemeID.MLDSA65 in production.
 * publicKey — packed FIPS-204 public key bytes.
 * privateKey — packed FIPS-204 private key bytes; OPTIONAL. Read-only
 *              consumers (UI list views, route handlers) MUST NOT
 *              receive privateKey-bearing accounts; only the signer
 *              layer should ever hold these bytes.
 * role — application semantic role; persisted on the struct for routing.
 * derivationPath — BIP-32 path string for record-keeping.
 */
export interface PQAccount {
  accountID: Uint8Array
  schemeID: WalletSchemeID
  publicKey: Uint8Array
  privateKey?: Uint8Array
  role: AccountRole
  derivationPath: string
}

// ---------------------------------------------------------------------------
// MLDSA provider interface (consumer-supplied).
// ---------------------------------------------------------------------------

/**
 * MLDSAProvider is the minimal capability a TS consumer must supply in
 * order to sign or verify ML-DSA-65 signatures in-browser. A concrete
 * provider would typically wrap @noble/post-quantum's mlDsa65 export, an
 * @luxfi/crypto-pq build, or a hardware-wallet bridge.
 *
 * The wallet pkg deliberately does NOT pull in an ML-DSA implementation:
 * (a) browser bundle size is precious; (b) most consumers route signing
 * through a native/hardware wallet anyway; (c) keeping the provider
 * abstract lets us swap implementations as the ML-DSA JS ecosystem
 * settles.
 *
 * sign() MUST use the "LUX/WALLET/TX/V1" context (CSHAKE_CUSTOMIZATION_TX)
 * so signatures issued from the browser are wire-compatible with the Go
 * signer. verify() MUST verify with the same context.
 */
export interface MLDSAProvider {
  readonly schemeID: WalletSchemeID
  readonly publicKeySize: number
  readonly privateKeySize: number
  readonly signatureSize: number

  /** Sign a 48-byte digest. Returns the packed FIPS-204 signature. */
  sign(privateKey: Uint8Array, digest: Uint8Array): Uint8Array

  /** Verify a packed FIPS-204 signature over the digest. */
  verify(publicKey: Uint8Array, digest: Uint8Array, signature: Uint8Array): boolean

  /** Derive (pk, sk) from a 32-byte seed. Used for HD derivation tests. */
  newKeyFromSeed(seed: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array }
}

// ---------------------------------------------------------------------------
// TxAuthEnvelope interface (mirrors account.TxAuthEnvelope).
// ---------------------------------------------------------------------------

/**
 * TxAuthEnvelope is the wallet-side view of a transaction-authorization
 * envelope. Consumers implement this to expose a deterministic 48-byte
 * signing digest and to receive the wallet's signature after signTx
 * returns.
 */
export interface TxAuthEnvelope {
  signingDigest(): Uint8Array
  attachSignature(scheme: WalletSchemeID, publicKey: Uint8Array, signature: Uint8Array): void
}

/**
 * signTx is the high-level signing entry point. Takes a PQAccount with
 * privateKey present, asks the envelope for its digest, signs the
 * digest through the supplied provider, and attaches the signature back
 * to the envelope.
 *
 * Returns the raw signature bytes for callers who want to log / audit.
 */
export function signTx(account: PQAccount, env: TxAuthEnvelope, provider: MLDSAProvider): Uint8Array {
  if (!account) {
    throw new Error('pqAccount: signTx called with null account')
  }
  if (!env) {
    throw new Error('pqAccount: signTx called with null envelope')
  }
  if (!provider) {
    throw new Error('pqAccount: signTx called with null provider')
  }
  if (account.schemeID !== provider.schemeID) {
    throw new Error(
      `pqAccount: account scheme ${walletSchemeName(account.schemeID)} does not match provider scheme ${walletSchemeName(provider.schemeID)}`,
    )
  }
  if (!account.privateKey || account.privateKey.length !== provider.privateKeySize) {
    throw new Error('pqAccount: account.privateKey missing or wrong length')
  }

  const digest = env.signingDigest()
  if (digest.length !== ACCOUNT_ID_SIZE) {
    throw new Error(`pqAccount: digest length ${digest.length} must be ${ACCOUNT_ID_SIZE}`)
  }
  const sig = provider.sign(account.privateKey, digest)
  env.attachSignature(account.schemeID, account.publicKey, sig)
  return sig
}

// ---------------------------------------------------------------------------
// HD path utilities (mirror genesis/keys.go + account/pq_account.go).
// ---------------------------------------------------------------------------

/**
 * formatPQPath returns the canonical HD-path string for an ML-DSA wallet
 * account:
 *
 *   m/44'/9000'/<chainID>'/0'/<roleIdx>'/<accountIdx>'
 *
 * Pure-string formatter — does not derive any key. Use a BIP-32
 * implementation (e.g. @scure/bip32) plus expandChildSeed() to produce
 * the actual 32-byte ξ for ML-DSA KeyGen.
 */
export function formatPQPath(chainID: number, roleIdx: number, accountIdx: number): string {
  if (!Number.isInteger(chainID) || chainID < 0 || chainID >= 2 ** 31) {
    throw new Error(`pqAccount: chainID ${chainID} out of [0, 2^31) range`)
  }
  if (!Number.isInteger(roleIdx) || roleIdx < 0 || roleIdx >= 2 ** 31) {
    throw new Error(`pqAccount: roleIdx ${roleIdx} out of [0, 2^31) range`)
  }
  if (!Number.isInteger(accountIdx) || accountIdx < 0 || accountIdx >= 2 ** 31) {
    throw new Error(`pqAccount: accountIdx ${accountIdx} out of [0, 2^31) range`)
  }
  return `m/44'/9000'/${chainID}'/0'/${roleIdx}'/${accountIdx}'`
}

/**
 * formatRecoveryPath returns the canonical HD-path string for an SLH-DSA
 * recovery account:
 *
 *   m/44'/9000'/<chainID>'/2'/<accountIdx>'
 */
export function formatRecoveryPath(chainID: number, accountIdx: number): string {
  if (!Number.isInteger(chainID) || chainID < 0 || chainID >= 2 ** 31) {
    throw new Error(`pqAccount: chainID ${chainID} out of [0, 2^31) range`)
  }
  if (!Number.isInteger(accountIdx) || accountIdx < 0 || accountIdx >= 2 ** 31) {
    throw new Error(`pqAccount: accountIdx ${accountIdx} out of [0, 2^31) range`)
  }
  return `m/44'/9000'/${chainID}'/2'/${accountIdx}'`
}

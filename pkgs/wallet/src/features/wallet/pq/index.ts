// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

// pqAccount — shape, cSHAKE AccountID, HD-path strings, MLDSAProvider interface.
export type { PQAccount, AccountRole, MLDSAProvider, TxAuthEnvelope } from './pqAccount'
export {
  ACCOUNT_ID_SIZE,
  ACCOUNT_ROLE_IDENTITY,
  ACCOUNT_ROLE_RECOVERY,
  ACCOUNT_ROLE_SESSION,
  ACCOUNT_ROLE_TX,
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
  signTx,
  walletSchemeName,
} from './pqAccount'

// domain — FIPS-204 ctx strings binding signatures to verifier surfaces.
export type { SigningContext } from './domain'
export {
  PQ_CONTEXT_EVM_PRECOMPILE_MLDSA,
  PQ_CONTEXT_HANDSHAKE_MLKEM,
  PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA,
  PQ_CONTEXT_RECOVERY_SLHDSA,
  PQ_CONTEXT_X_CHAIN_UTXO_MLDSA,
  contextBytesFor,
  contextStringFor,
} from './domain'

// mldsa — concrete ML-DSA-44/65/87 providers backed by @noble/post-quantum.
export {
  mlDsa44Provider,
  mlDsa65Provider,
  mlDsa87Provider,
  providerFor,
  signWithContext,
  verifyWithContext,
} from './mldsa'

// mlkem — ML-KEM-512/768/1024 providers (KEMs).
export type { KEMProvider } from './mlkem'
export {
  WALLET_KEM_SCHEME_MLKEM768,
  kemProviderByName,
  mlKem1024Provider,
  mlKem512Provider,
  mlKem768Provider,
} from './mlkem'

// slhdsa — SLH-DSA hash-based providers for recovery.
export type { SLHDSAProvider } from './slhdsa'
export {
  slhDsa128fProvider,
  slhDsa192fProvider,
  slhDsa192sProvider,
  slhDsa256fProvider,
  slhDsaProviderByName,
} from './slhdsa'

// hybrid — classical ∥ PQ container, byte-compatible with luxfi/sdk PQSigner.
export type { ClassicalScheme, HybridSignature } from './hybrid'
export {
  decodeHybrid,
  encodeHybrid,
  signHybridEd25519MLDSA,
  signHybridSecp256k1MLDSA,
  verifyHybridEd25519MLDSA,
  verifyHybridSecp256k1MLDSA,
} from './hybrid'

// hdPq — BIP-32 → expandChildSeed → ML-DSA / SLH-DSA keypair derivation.
export {
  derivePQAccount,
  derivePQIdentity,
  deriveRecoveryAccount,
} from './hdPq'

// precompile — eth_call wrappers for the LP-4200 0x0122xx verifiers.
export type { EthCallClient } from './precompile'
export {
  PRECOMPILE_MLDSA,
  PRECOMPILE_MLKEM,
  PRECOMPILE_SLHDSA,
  encodeMLDSAVerifyInput,
  encodeMLKEMVerifyInput,
  encodeSLHDSAVerifyInput,
  verifyMLDSAOnChain,
} from './precompile'

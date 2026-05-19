/**
 * apps/web PQ facade.
 *
 * Web-app entry point for the canonical PQ stack. The implementation
 * lives in `@luxfi/wallet`'s `features/wallet/pq` slice — this file
 * re-exports the public surface so screens import a single stable path:
 *
 *   import { derivePQIdentity, signHybridSecp256k1MLDSA, ... } from "../lib/pq"
 *
 * Rationale: the wallet pkg owns the byte-pinned domain separators,
 * the cSHAKE AccountID derivation, and the @noble/post-quantum
 * provider wrappers; apps/web is just the consumer. Keeping the
 * facade thin means there is exactly one place where the wallet's PQ
 * vocabulary is defined, and exactly one place to update on a
 * provider swap or LP-4200 precompile-input change.
 *
 * Canonical PQ stack (per LP-4200):
 *
 *   ML-DSA-65       — FIPS 204 L3 — PQ identity, signing (0x012202)
 *   ML-KEM-768      — FIPS 203 L3 — PQ-TLS, encrypted-DM (0x012201)
 *   SLH-DSA-192f    — FIPS 205 L3 — recovery / cold storage (0x012203)
 *   Hybrid containers — Ed25519∥ML-DSA-65, secp256k1∥ML-DSA-65
 *
 * HD paths:
 *
 *   m/44'/9000'/<chainID>'/0'/<roleIdx>'/<accountIdx>'  — ML-DSA identity/tx/session
 *   m/44'/9000'/<chainID>'/2'/<accountIdx>'             — SLH-DSA recovery
 *   m/44'/60'/0'/0/<accountIdx>                           — EVM C-Chain secp256k1
 */

export type {
  PQAccount,
  AccountRole,
  MLDSAProvider,
  TxAuthEnvelope,
  SigningContext,
  KEMProvider,
  SLHDSAProvider,
  ClassicalScheme,
  HybridSignature,
  EthCallClient,
} from "@luxfi/wallet/src/features/wallet/pq"

export {
  // pqAccount
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

  // domain
  PQ_CONTEXT_EVM_PRECOMPILE_MLDSA,
  PQ_CONTEXT_HANDSHAKE_MLKEM,
  PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA,
  PQ_CONTEXT_RECOVERY_SLHDSA,
  PQ_CONTEXT_X_CHAIN_UTXO_MLDSA,
  contextBytesFor,
  contextStringFor,

  // mldsa
  mlDsa44Provider,
  mlDsa65Provider,
  mlDsa87Provider,
  providerFor,
  signWithContext,
  verifyWithContext,

  // mlkem
  WALLET_KEM_SCHEME_MLKEM768,
  kemProviderByName,
  mlKem1024Provider,
  mlKem512Provider,
  mlKem768Provider,

  // slhdsa
  slhDsa128fProvider,
  slhDsa192fProvider,
  slhDsa192sProvider,
  slhDsa256fProvider,
  slhDsaProviderByName,

  // hybrid
  decodeHybrid,
  encodeHybrid,
  signHybridEd25519MLDSA,
  signHybridSecp256k1MLDSA,
  verifyHybridEd25519MLDSA,
  verifyHybridSecp256k1MLDSA,

  // hdPq
  derivePQAccount,
  derivePQIdentity,
  deriveRecoveryAccount,

  // precompile
  PRECOMPILE_MLDSA,
  PRECOMPILE_MLKEM,
  PRECOMPILE_SLHDSA,
  encodeMLDSAVerifyInput,
  encodeMLKEMVerifyInput,
  encodeSLHDSAVerifyInput,
  verifyMLDSAOnChain,
} from "@luxfi/wallet/src/features/wallet/pq"

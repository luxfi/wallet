// Copyright (C) 2019-2025, Lux Industries, Inc. All rights reserved.
// See the file LICENSE for licensing terms.

/**
 * Domain separators that bind an ML-DSA signature to a specific Lux
 * verifier context. These are *not* cSHAKE customizations (those bind
 * the AccountID derivation in pqAccount.ts); they are the FIPS-204 §5.4
 * `ctx` argument passed to ML-DSA Sign/Verify directly.
 *
 * Per FIPS 204 §5.4 the signer prefixes the message with
 *
 *   M' = 0x00 || OctetString(|ctx|) || ctx || M
 *
 * before the rest of the signing transform. The same prefix is rebuilt
 * inside the verifier, so a signature produced under one context fails
 * verification under any other. This is the canonical replay protection
 * across chains and verifier surfaces.
 *
 * The strings here MUST match byte-for-byte the strings used by:
 *   • the LP-4200 EVM precompile at 0x012202 (Lux C-Chain ML-DSA verifier)
 *   • the X-Chain UTXO signing path in luxfi/node
 *
 * Changing any byte here is a wallet-incompatible regression. Pinned by
 * domain.test.ts.
 */

/** ML-DSA context for the Lux EVM precompile at 0x012202 (LP-4200). */
export const PQ_CONTEXT_EVM_PRECOMPILE_MLDSA: string = 'lux-evm-precompile-mldsa-v1'

/** ML-DSA context for X-Chain UTXO transactions. */
export const PQ_CONTEXT_X_CHAIN_UTXO_MLDSA: string = 'lux-x-chain-utxo-v1'

/** ML-DSA context for P-Chain platform transactions. */
export const PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA: string = 'lux-p-chain-platform-mldsa-v1'

/** SLH-DSA context for cold-storage / recovery signatures (LP-4200 0x012203). */
export const PQ_CONTEXT_RECOVERY_SLHDSA: string = 'lux-recovery-slhdsa-v1'

/** ML-KEM context for the wallet's PQ-TLS / encrypted-DM hybrid handshake. */
export const PQ_CONTEXT_HANDSHAKE_MLKEM: string = 'lux-handshake-mlkem-v1'

/**
 * SigningContext is the routing key the wallet uses to pick a domain
 * separator before signing. Naming the value (the *what*) rather than
 * the place (the *where*) so the same enum reads cleanly from any
 * call site: a screen, a saga, an injected provider, etc.
 */
export type SigningContext =
  | 'evm-precompile'
  | 'x-chain-utxo'
  | 'p-chain-platform'
  | 'recovery'
  | 'handshake'

/** Look up the canonical context bytes for a SigningContext value. */
export function contextStringFor(ctx: SigningContext): string {
  switch (ctx) {
    case 'evm-precompile':
      return PQ_CONTEXT_EVM_PRECOMPILE_MLDSA
    case 'x-chain-utxo':
      return PQ_CONTEXT_X_CHAIN_UTXO_MLDSA
    case 'p-chain-platform':
      return PQ_CONTEXT_P_CHAIN_PLATFORM_MLDSA
    case 'recovery':
      return PQ_CONTEXT_RECOVERY_SLHDSA
    case 'handshake':
      return PQ_CONTEXT_HANDSHAKE_MLKEM
    default: {
      const _exhaustive: never = ctx
      throw new Error(`pq/domain: unknown signing context ${_exhaustive as string}`)
    }
  }
}

/** Encode a context string as UTF-8 bytes for the FIPS-204 ctx parameter. */
export function contextBytesFor(ctx: SigningContext): Uint8Array {
  const s = contextStringFor(ctx)
  if (s.length > 255) {
    // FIPS 204 §5.4 limits |ctx| to 255 bytes. Our strings are well under
    // this; the guard is defensive against future edits.
    throw new Error(`pq/domain: context string for ${ctx} exceeds FIPS-204 255-byte limit`)
  }
  return new TextEncoder().encode(s)
}

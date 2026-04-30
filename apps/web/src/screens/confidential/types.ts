/**
 * Confidential slice — shared types for F-Chain (FHE) and Z-Chain (ZKP).
 *
 * F-Chain: Threshold FHE (TFHE) — encrypted balances and transfers.
 * Z-Chain: ZK selective disclosure — prove claims without revealing data.
 */

/** F-Chain encrypted balance (TFHE ciphertext, base64). */
export interface FHEBalance {
  /** Owner address (0x-prefixed). */
  address: string
  /** Asset symbol (LUX, ZOO, AI, ...). */
  symbol: string
  /** F-Chain chain ID (always F-Chain for now). */
  chainId: number
  /** TFHE ciphertext, base64 encoded. */
  ciphertext: string
  /** Optional metadata commitment (Pedersen) for proof of knowledge. */
  commitment?: string
  /** ISO timestamp the ciphertext was last refreshed from chain. */
  fetchedAt: string
}

/** Decrypted view of an FHE balance, valid until expiresAt. */
export interface RevealedBalance {
  /** Plaintext amount as a decimal string (avoid bigint serialization issues). */
  amount: string
  /** Symbol (mirrored from FHEBalance for display). */
  symbol: string
  /** Decimals for formatting. */
  decimals: number
  /** Epoch ms when the reveal expires and balance auto-rehides. */
  expiresAt: number
  /** Committee threshold that signed (e.g. "3-of-5"). */
  threshold: string
}

/** A single committee member participating in threshold decryption. */
export interface CommitteeMember {
  /** Operator handle / display name. */
  name: string
  /** BLS public key fingerprint (first 8 hex chars). */
  pubkeyFingerprint: string
  /** Signing status. */
  status: "pending" | "signing" | "signed" | "failed" | "timeout"
}

/** Threshold-decrypt session state. */
export interface DecryptSession {
  /** Session ID returned by gateway. */
  sessionId: string
  /** Required signers (e.g. 3 of 5). */
  threshold: number
  /** Total committee size. */
  total: number
  /** Per-member status. */
  members: CommitteeMember[]
  /** Final decrypted plaintext (only populated when signed >= threshold). */
  plaintext?: string
  /** Error message if the session failed. */
  error?: string
}

/** Z-Chain claim types. Curated preset list. */
export type ClaimType =
  | "BalanceGT"
  | "AccreditedUS"
  | "AgeGT18"
  | "JurisdictionNotSanctioned"

/** Parameters per claim type. */
export type ClaimParams =
  | { type: "BalanceGT"; threshold: string; symbol: string }
  | { type: "AccreditedUS" }
  | { type: "AgeGT18" }
  | { type: "JurisdictionNotSanctioned" }

/** A generated ZK proof, ready to share. */
export interface ZKProof {
  /** Claim type and parameters as serialized for the verifier. */
  claim: ClaimParams
  /** Proof bytes, base64. */
  proof: string
  /** Public inputs, base64. */
  publicInputs: string
  /** Verifier circuit identifier. */
  circuit: string
  /** Generation timestamp (epoch ms). */
  generatedAt: number
  /** Optional expiry (epoch ms). Some claims time-bound (e.g. balance > X at time T). */
  expiresAt?: number
  /** Local proof ID (uuid-like, for store keying). */
  id: string
}

/** Recipient lookup — to encrypt a transfer client-side, we need their F-Chain pubkey. */
export interface FHERecipient {
  /** F-Chain address (0x-prefixed). */
  address: string
  /** TFHE public key (base64) — must be registered on F-Chain. */
  pubkey: string
  /** True if the recipient has registered an FHE pubkey. False = transfer impossible. */
  registered: boolean
}

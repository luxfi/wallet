// Package custody is the wallet backend's custody port — the ONE interface the
// API depends on to create wallets and sign transactions. Custody is MPC: the
// private key is split t-of-n across the MPC nodes and NEVER exists in one
// place, so this backend stores public keys + addresses only — no plaintext
// key, ever.
//
// The port mirrors the security contract of github.com/luxfi/mpc/client's
// Threshold interface (idempotency, org-scoping) but the wallet owns its own
// minimal interface (decomplect: depend on a value we define, not on MPC's
// whole module). The HTTP adapter (mpc.go) speaks the real lux/mpc wire.
package custody

import (
	"context"
	"errors"
)

// Scheme is a signature scheme. PQ schemes (mldsa65) are first-class — the
// custody layer is PQ-ready; the PQ primitives themselves live in the wallet's
// pkgs/wallet/src/features/wallet/pq (Go-verified ML-DSA), not duplicated here.
type Scheme string

const (
	SchemeSecp256k1 Scheme = "secp256k1" // EVM / BTC
	SchemeEd25519   Scheme = "ed25519"   // Solana
	SchemeMLDSA65   Scheme = "mldsa65"   // post-quantum (FIPS-204)
)

// Wallet is a custody wallet: an MPC-held key referenced by WalletID, with its
// derived public addresses. There is no field for a private key — by design.
type Wallet struct {
	WalletID    string            `json:"walletId"`
	ECDSAPubKey string            `json:"ecdsaPubKey,omitempty"`
	EDDSAPubKey string            `json:"eddsaPubKey,omitempty"`
	Addresses   map[string]string `json:"addresses"` // chain → address (evm, btc, sol)
}

// SignRequest is a custody signing request. PayloadHash is the 32-byte tx hash
// to sign; the backend never sees or reconstructs a private key. Idempotency is
// required — a replayed key with a different payload MUST be refused (anti-
// oracle), matching the MPC client contract.
type SignRequest struct {
	WalletID       string
	Scheme         Scheme
	ChainID        int
	PayloadHash    string // 32-byte hex
	IdempotencyKey string
}

// SignResult carries the signature bytes (hex). The signature is produced by
// the MPC threshold protocol; no key reconstruction occurs.
type SignResult struct {
	Signature string `json:"signature"`
	SessionID string `json:"sessionId,omitempty"`
}

var (
	ErrIdempotencyKeyRequired = errors.New("custody: idempotency key required")
	ErrUnsupportedScheme      = errors.New("custody: unsupported scheme")
	ErrBackendUnavailable     = errors.New("custody: backend unavailable")
	ErrKeygenFailed           = errors.New("custody: keygen failed")
)

// Custodian is the MPC custody backend. org scopes every call to one tenant —
// the API derives it from the verified lux.id identity, never from the client.
type Custodian interface {
	// CreateWallet runs an MPC distributed keygen for the org and returns the
	// resulting Wallet (public keys + addresses). The private key is generated
	// in shares across the MPC nodes and is never assembled.
	CreateWallet(ctx context.Context, org string) (*Wallet, error)

	// Sign requests an MPC threshold signature over req.PayloadHash for the
	// org's wallet. No private key is reconstructed.
	Sign(ctx context.Context, org string, req SignRequest) (*SignResult, error)
}

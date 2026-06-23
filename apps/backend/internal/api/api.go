// Package api is the wallet backend's HTTP surface — the canonical App(Wallet)
// server. Every wallet route is gated by lux.id IAM and scoped to the caller's
// org. Paths are /v1/* (no /api/ prefix — house rule). No plaintext keys ever
// touch this layer: wallet creation and signing both go through MPC custody.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/luxfi/wallet/backend/internal/custody"
	"github.com/luxfi/wallet/backend/internal/iam"
	"github.com/luxfi/wallet/backend/internal/store"
)

// Server wires the custody backend, the wallet store, and IAM verification.
type Server struct {
	custodian custody.Custodian
	store     store.Store
	verifier  *iam.Verifier
	log       *slog.Logger
}

func New(custodian custody.Custodian, st store.Store, v *iam.Verifier, log *slog.Logger) *Server {
	if log == nil {
		log = slog.Default()
	}
	return &Server{custodian: custodian, store: st, verifier: v, log: log}
}

// Handler returns the mux. /v1/health is open; every /v1/wallets* route is
// IAM-gated.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	mux.Handle("POST /v1/wallets", s.authed(s.createWallet))
	mux.Handle("GET /v1/wallets", s.authed(s.listWallets))
	mux.Handle("GET /v1/wallets/{id}", s.authed(s.getWallet))
	mux.Handle("POST /v1/wallets/{id}/sign", s.authed(s.signTx))
	return mux
}

// --- middleware ---

type ctxKey int

const identityKey ctxKey = 0

// authed verifies the lux.id bearer token and injects the Identity into ctx.
func (s *Server) authed(h http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, err := iam.BearerFromHeader(r.Header)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "missing bearer token")
			return
		}
		id, err := s.verifier.Verify(r.Context(), raw)
		if err != nil {
			s.log.Warn("auth rejected", "err", err)
			writeErr(w, http.StatusUnauthorized, "invalid token")
			return
		}
		ctx := context.WithValue(r.Context(), identityKey, id)
		h(w, r.WithContext(ctx))
	})
}

func identityOf(ctx context.Context) *iam.Identity {
	id, _ := ctx.Value(identityKey).(*iam.Identity)
	return id
}

// --- handlers ---

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// createWallet runs an MPC keygen for the caller's org and records the public
// wallet. The 201 body has addresses + pubkeys — never a private key.
func (s *Server) createWallet(w http.ResponseWriter, r *http.Request) {
	id := identityOf(r.Context())
	wallet, err := s.custodian.CreateWallet(r.Context(), id.Org)
	if err != nil {
		s.log.Error("createWallet", "org", id.Org, "err", err)
		writeErr(w, http.StatusBadGateway, "custody unavailable")
		return
	}
	if err := s.store.Put(r.Context(), id.Org, wallet); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to record wallet")
		return
	}
	s.log.Info("wallet created", "org", id.Org, "walletId", wallet.WalletID)
	writeJSON(w, http.StatusCreated, wallet)
}

func (s *Server) listWallets(w http.ResponseWriter, r *http.Request) {
	id := identityOf(r.Context())
	wallets, err := s.store.List(r.Context(), id.Org)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to list wallets")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"wallets": wallets})
}

func (s *Server) getWallet(w http.ResponseWriter, r *http.Request) {
	id := identityOf(r.Context())
	wallet, err := s.store.Get(r.Context(), id.Org, r.PathValue("id"))
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "wallet not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to read wallet")
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

type signBody struct {
	Scheme         custody.Scheme `json:"scheme"`
	ChainID        int            `json:"chainId"`
	PayloadHash    string         `json:"payloadHash"`
	IdempotencyKey string         `json:"idempotencyKey"`
}

// signTx requests an MPC threshold signature over a payload hash for the org's
// wallet. The private key is never reconstructed.
func (s *Server) signTx(w http.ResponseWriter, r *http.Request) {
	id := identityOf(r.Context())
	walletID := r.PathValue("id")

	// The wallet must belong to the caller's org (org-scoped Get; cross-org →
	// 404, no existence disclosure).
	if _, err := s.store.Get(r.Context(), id.Org, walletID); err != nil {
		writeErr(w, http.StatusNotFound, "wallet not found")
		return
	}

	var body signBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(body.PayloadHash) == 0 {
		writeErr(w, http.StatusBadRequest, "payloadHash required")
		return
	}

	res, err := s.custodian.Sign(r.Context(), id.Org, custody.SignRequest{
		WalletID:       walletID,
		Scheme:         body.Scheme,
		ChainID:        body.ChainID,
		PayloadHash:    body.PayloadHash,
		IdempotencyKey: body.IdempotencyKey,
	})
	if errors.Is(err, custody.ErrIdempotencyKeyRequired) {
		writeErr(w, http.StatusBadRequest, "idempotencyKey required")
		return
	}
	if errors.Is(err, custody.ErrUnsupportedScheme) {
		writeErr(w, http.StatusBadRequest, "unsupported scheme")
		return
	}
	if err != nil {
		s.log.Error("sign", "org", id.Org, "walletId", walletID, "err", err)
		writeErr(w, http.StatusBadGateway, "signing failed")
		return
	}
	s.log.Info("tx signed", "org", id.Org, "walletId", walletID, "chainId", body.ChainID)
	writeJSON(w, http.StatusOK, res)
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

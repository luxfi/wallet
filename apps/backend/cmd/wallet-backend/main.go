// wallet-backend — the canonical App(Wallet) custody server.
//
// Config is env-only (12-factor); secrets arrive from KMS via the operator
// Service CR, never hardcoded. White-label is per-tenant: IAM_ISSUER (lux →
// lux.id) and MPC_ENDPOINT (M-Chain by default) are injected, so the same
// binary serves any brand against their own IAM + MPC.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/luxfi/wallet/backend/internal/api"
	"github.com/luxfi/wallet/backend/internal/custody"
	"github.com/luxfi/wallet/backend/internal/iam"
	"github.com/luxfi/wallet/backend/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg := loadConfig()
	if err := run(cfg, log); err != nil {
		log.Error("fatal", "err", err)
		os.Exit(1)
	}
}

type config struct {
	addr        string
	iamIssuer   string
	iamAudience string
	mpcEndpoint string
	mpcToken    string
}

func loadConfig() config {
	return config{
		addr:        env("LISTEN_ADDR", ":8080"),
		iamIssuer:   env("IAM_ISSUER", "https://lux.id"),
		iamAudience: env("IAM_AUDIENCE", "lux-wallet"),
		// M-Chain, which is where threshold custody lives. The ceremony runs
		// natively across the chain's own validators — leaderless, the
		// committee IS the validator set — rather than on a REST cluster of
		// its own. mpcvm/transport.go calls that cluster "the old off-chain
		// REST cluster" in as many words; M-Chain is what replaced it.
		//
		// MPC_ENDPOINT still overrides, because a tenant running centralized
		// or bring-your-own MPC points at mpc.lux.cloud instead. That is the
		// exception, and it is now the one that has to be asked for.
		mpcEndpoint: env("MPC_ENDPOINT", "https://api.lux.network/v1/chain/M"),
		mpcToken:    os.Getenv("MPC_SERVICE_TOKEN"),
	}
}

func run(cfg config, log *slog.Logger) error {
	hc := &http.Client{Timeout: 15 * time.Second}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	verifier, err := iam.New(ctx, cfg.iamIssuer, cfg.iamAudience, hc)
	cancel()
	if err != nil {
		return err
	}

	custodian, err := custody.NewMPC(custody.MPCConfig{
		Endpoint:     cfg.mpcEndpoint,
		ServiceToken: cfg.mpcToken,
	})
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              cfg.addr,
		Handler:           api.New(custodian, store.NewMemory(), verifier, log).Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      120 * time.Second, // MPC keygen can take ~60s
	}

	// Graceful shutdown on SIGINT/SIGTERM.
	idle := make(chan struct{})
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Info("shutting down")
		sctx, scancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer scancel()
		if err := srv.Shutdown(sctx); err != nil {
			log.Error("shutdown", "err", err)
		}
		close(idle)
	}()

	log.Info("wallet-backend listening", "addr", cfg.addr, "iam", cfg.iamIssuer, "mpc", cfg.mpcEndpoint)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	<-idle
	return nil
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

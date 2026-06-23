// wallet-backend — the canonical App(Wallet) custody server.
//
// Config is env-only (12-factor); secrets arrive from KMS via the operator
// Service CR, never hardcoded. White-label is per-tenant: IAM_ISSUER (lux →
// lux.id) and MPC_ENDPOINT (lux → mpc.lux.network) are injected, so the same
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
		mpcEndpoint: env("MPC_ENDPOINT", "https://mpc.lux.network"),
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

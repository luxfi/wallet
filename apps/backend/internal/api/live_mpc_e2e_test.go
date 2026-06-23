// Copyright (C) 2020-2026, Lux Industries Inc. All rights reserved.
// See the file LICENSE for licensing terms.

//go:build integration

// Package api, file live_mpc_e2e_test.go.
//
// LIVE backend ↔ MPC custody proof. This is the not-mock counterpart to
// e2e_test.go (TestE2E_RealCustodyAdapter_CreateThenSign), which wires the real
// custody adapter to a MOCK lux/mpc. Here the adapter talks to a REAL 3-node
// mpcd ensemble (consensus mode — the production code path) over the real HTTP
// /keygen + /sign endpoints. The full chain is exercised:
//
//	lux.id OIDC verify (real iam.Verifier against a local issuer)
//	  → org scope (owner claim)
//	    → api.Server /v1 handlers (the real server)
//	      → custody.NewMPC adapter (the real adapter)
//	        → LIVE mpcd 3-node 2-of-3 threshold keygen + sign
//
// Path (a) full-OIDC is used (not the in-process handler shortcut): a local
// RSA-signed OIDC issuer + a real iam.Verifier doing standard discovery + JWKS,
// so the IAM verification, org-scoping, and MPC custody are all genuinely
// exercised. The OIDC helpers (newIDP, tokenForOrg, do) are shared with
// api_test.go.
//
// The mpcd binary is built from the lux/mpc repo (located via LUX_MPC_REPO,
// default /Users/z/work/lux/mpc). If that repo is not present the test skips
// with a clear message rather than failing — it is a cross-repo live proof.
//
// Run:
//
//	cd /Users/z/work/lux/wallet/apps/backend && \
//	  go test -tags integration ./internal/api/ -run TestBackendLiveMPC -count=1 -timeout 300s -v
package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"github.com/luxfi/wallet/backend/internal/custody"
	"github.com/luxfi/wallet/backend/internal/iam"
	"github.com/luxfi/wallet/backend/internal/store"
)

const (
	liveInternalAPIKey = "backend-live-e2e-api-key"
	liveZapDBPassword  = "backend-live-e2e-zapdb-pw"
)

// mpcRepo returns the path to the lux/mpc repo, or "" if it cannot be found.
func mpcRepo() string {
	if p := os.Getenv("LUX_MPC_REPO"); p != "" {
		return p
	}
	const def = "/Users/z/work/lux/mpc"
	if _, err := os.Stat(filepath.Join(def, "cmd", "mpcd")); err == nil {
		return def
	}
	return ""
}

func liveFreePort(t *testing.T) int {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

// randID returns a random lowercase hex id (stdlib only — the backend module
// carries no uuid dependency and we keep it that way).
func randID(t *testing.T) string {
	t.Helper()
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return hex.EncodeToString(b[:])
}

// liveEnsemble is a running mpcd ensemble for the backend proof.
type liveEnsemble struct {
	t        *testing.T
	apiAddrs []string
	procs    []*exec.Cmd
	logs     []*lockedBuf
}

type lockedBuf struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *lockedBuf) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}
func (b *lockedBuf) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// startLiveEnsemble builds mpcd from the lux/mpc repo and launches an n-node,
// t-of-n consensus ensemble, waiting until all nodes report quorum + readiness.
func startLiveEnsemble(t *testing.T, repo string, n, threshold int) *liveEnsemble {
	t.Helper()

	bin := filepath.Join(t.TempDir(), "mpcd")
	build := exec.Command("go", "build", "-o", bin, "./cmd/mpcd")
	build.Dir = repo
	build.Env = append(os.Environ(),
		"GOWORK=off",
		"GOEXPERIMENT=runtimesecret,simd",
		"CGO_ENABLED=0",
	)
	var bout bytes.Buffer
	build.Stdout, build.Stderr = &bout, &bout
	t.Logf("building mpcd from %s …", repo)
	if err := build.Run(); err != nil {
		t.Fatalf("build mpcd: %v\n%s", err, bout.String())
	}

	root := t.TempDir()
	nodeIDs := make([]string, n)
	listen := make([]int, n)
	api := make([]int, n)
	for i := range nodeIDs {
		nodeIDs[i] = fmt.Sprintf("node%d", i)
		listen[i] = liveFreePort(t)
		api[i] = liveFreePort(t)
	}

	e := &liveEnsemble{t: t, apiAddrs: make([]string, n), procs: make([]*exec.Cmd, n), logs: make([]*lockedBuf, n)}
	for i := 0; i < n; i++ {
		args := []string{
			"start",
			"--node-id", nodeIDs[i],
			"--listen", fmt.Sprintf("127.0.0.1:%d", listen[i]),
			"--api", fmt.Sprintf("127.0.0.1:%d", api[i]),
			"--data", filepath.Join(root, nodeIDs[i]),
			"--keys", filepath.Join(root, nodeIDs[i], "keys"),
			"--threshold", fmt.Sprint(threshold),
			"--log-level", "warn",
			"--kms-zap-listen", "",
			"--threshold-listen", "",
		}
		for j := 0; j < n; j++ {
			if j != i {
				args = append(args, "--peer", fmt.Sprintf("%s@127.0.0.1:%d", nodeIDs[j], listen[j]))
			}
		}
		cmd := exec.Command(bin, args...)
		cmd.Env = append(os.Environ(),
			"MPC_HSM_PROVIDER=env",
			"MPC_PASSWORD="+liveZapDBPassword,
			"ZAPDB_PASSWORD="+liveZapDBPassword,
			"MPC_INTERNAL_API_KEY="+liveInternalAPIKey,
		)
		lb := &lockedBuf{}
		cmd.Stdout, cmd.Stderr = lb, lb
		if err := cmd.Start(); err != nil {
			t.Fatalf("start %s: %v", nodeIDs[i], err)
		}
		e.procs[i] = cmd
		e.logs[i] = lb
		e.apiAddrs[i] = fmt.Sprintf("127.0.0.1:%d", api[i])
	}
	t.Cleanup(e.stop)

	deadline := time.Now().Add(90 * time.Second)
	for time.Now().Before(deadline) {
		ok := true
		for _, addr := range e.apiAddrs {
			resp, err := http.Get("http://" + addr + "/healthz")
			if err != nil {
				ok = false
				break
			}
			var h struct {
				SigningQuorum bool `json:"signing_quorum"`
				Ready         bool `json:"ready"`
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			_ = json.Unmarshal(body, &h)
			if resp.StatusCode != http.StatusOK || !h.SigningQuorum || !h.Ready {
				ok = false
				break
			}
		}
		if ok {
			t.Logf("live ensemble healthy: %d nodes, %d-of-%d quorum", n, threshold, n)
			return e
		}
		time.Sleep(500 * time.Millisecond)
	}
	for i, lb := range e.logs {
		t.Logf("node%d log:\n%s", i, lb.String())
	}
	t.Fatal("live ensemble never reached readiness")
	return nil
}

func (e *liveEnsemble) stop() {
	for _, c := range e.procs {
		if c != nil && c.Process != nil {
			_ = c.Process.Signal(syscall.SIGTERM)
		}
	}
	for _, c := range e.procs {
		if c == nil || c.Process == nil {
			continue
		}
		done := make(chan struct{})
		go func(c *exec.Cmd) { _, _ = c.Process.Wait(); close(done) }(c)
		select {
		case <-done:
		case <-time.After(10 * time.Second):
			_ = c.Process.Kill()
			<-done
		}
	}
}

func (e *liveEnsemble) logs0() string {
	var b strings.Builder
	for i, lb := range e.logs {
		fmt.Fprintf(&b, "=== node%d ===\n%s\n", i, lb.String())
	}
	return b.String()
}

// TestBackendLiveMPC drives the wallet backend's /v1 API against a LIVE 3-node
// MPC ensemble — the live (not mock) backend↔MPC custody proof.
func TestBackendLiveMPC(t *testing.T) {
	repo := mpcRepo()
	if repo == "" {
		t.Skip("lux/mpc repo not found (set LUX_MPC_REPO); skipping live backend↔MPC proof")
	}

	// --- LIVE MPC ensemble (3 nodes, 2-of-3). custody points at node0. ---
	ens := startLiveEnsemble(t, repo, 3, 2)
	mpcEndpoint := "http://" + ens.apiAddrs[0]

	// REAL custody adapter → live MPC node0, authenticated with the node's
	// internal API key (the production wire: Authorization: Bearer <token>).
	custodian, err := custody.NewMPC(custody.MPCConfig{
		Endpoint:     mpcEndpoint,
		ServiceToken: liveInternalAPIKey,
		HTTPClient:   &http.Client{Timeout: 90 * time.Second},
	})
	if err != nil {
		t.Fatalf("custody.NewMPC: %v", err)
	}

	// Path (a): REAL iam.Verifier against a local RSA OIDC issuer (newIDP +
	// tokenForOrg are shared with api_test.go). Standard discovery + JWKS.
	d := newIDP(t)
	v, err := iam.New(context.Background(), d.issuer, "lux-wallet", http.DefaultClient)
	if err != nil {
		t.Fatalf("iam.New: %v", err)
	}

	// REAL api.Server: live custodian + real verifier + memory store.
	srv := New(custodian, store.NewMemory(), v, nil)
	h := srv.Handler()
	tok := d.tokenForOrg(t, "live-org", "user-1")

	// --- 1) POST /v1/wallets → LIVE MPC keygen (real address, no key). ---
	w := do(t, h, "POST", "/v1/wallets", tok, "")
	if w.Code != http.StatusCreated {
		t.Fatalf("POST /v1/wallets: code=%d body=%s\nMPC logs:\n%s", w.Code, w.Body, ens.logs0())
	}
	var wallet custody.Wallet
	if err := json.Unmarshal(w.Body.Bytes(), &wallet); err != nil {
		t.Fatalf("decode wallet: %v (%s)", err, w.Body)
	}
	if wallet.WalletID == "" {
		t.Fatalf("empty wallet id: %s", w.Body)
	}
	evm := wallet.Addresses["evm"]
	if evm == "" || !strings.HasPrefix(evm, "0x") || len(evm) != 42 {
		t.Fatalf("bad evm address %q in %s", evm, w.Body)
	}
	for _, banned := range []string{"private", "secret", "seed", "mnemonic", "privkey"} {
		if strings.Contains(strings.ToLower(w.Body.String()), banned) {
			t.Fatalf("create response leaked %q: %s", banned, w.Body)
		}
	}
	t.Logf("LIVE /v1/wallets OK: walletId=%s evm=%s", wallet.WalletID, evm)

	// --- 2) GET /v1/wallets → lists the wallet just created. ---
	w = do(t, h, "GET", "/v1/wallets", tok, "")
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), wallet.WalletID) {
		t.Fatalf("GET /v1/wallets: code=%d body=%s", w.Code, w.Body)
	}
	t.Logf("LIVE GET /v1/wallets OK: wallet listed")

	// --- 3) POST /v1/wallets/{id}/sign → LIVE threshold signature. ---
	digest := sha256.Sum256([]byte("backend live e2e tx for " + wallet.WalletID))
	payloadHash := "0x" + hex.EncodeToString(digest[:])
	idem := randID(t)
	signBody := fmt.Sprintf(
		`{"scheme":"secp256k1","chainId":96369,"payloadHash":%q,"idempotencyKey":%q}`,
		payloadHash, idem,
	)
	w = do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", tok, signBody)
	if w.Code != http.StatusOK {
		t.Fatalf("POST sign: code=%d body=%s\nMPC logs:\n%s", w.Code, w.Body, ens.logs0())
	}
	var res custody.SignResult
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("decode sign result: %v (%s)", err, w.Body)
	}
	if res.Signature == "" {
		t.Fatalf("empty signature: %s", w.Body)
	}
	sig := strings.TrimPrefix(res.Signature, "0x")
	if _, err := hex.DecodeString(sig); err != nil {
		t.Fatalf("signature not hex: %q", res.Signature)
	}
	t.Logf("LIVE /v1/wallets/{id}/sign OK: signature=%s… session=%s",
		sig[:min2(32, len(sig))], res.SessionID)

	// --- 4) Idempotency through the backend: same idempotency key + same body
	// → the backend returns the same live signature (MPC cache). ---
	w2 := do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", tok, signBody)
	if w2.Code != http.StatusOK {
		t.Fatalf("idempotent re-sign via backend: code=%d body=%s", w2.Code, w2.Body)
	}
	var res2 custody.SignResult
	_ = json.Unmarshal(w2.Body.Bytes(), &res2)
	if res2.Signature != res.Signature {
		t.Fatalf("backend idempotency broken: %q != %q", res2.Signature, res.Signature)
	}
	t.Logf("LIVE backend idempotency OK: identical signature on repeat")

	// --- 5) Missing idempotency key through the backend → 400. ---
	w3 := do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", tok,
		fmt.Sprintf(`{"scheme":"secp256k1","chainId":96369,"payloadHash":%q}`, payloadHash))
	if w3.Code != http.StatusBadRequest {
		t.Fatalf("sign w/o idempotencyKey: code=%d, want 400 (%s)", w3.Code, w3.Body)
	}
	t.Logf("LIVE backend boundary OK: missing idempotencyKey → 400")

	// --- 6) No plaintext key in any backend response or MPC node log. ---
	hay := strings.ToLower(w.Body.String() + " " + w2.Body.String() + " " + ens.logs0())
	for _, marker := range []string{"private_key", "privatekey", "privkey", "secret_share", "mnemonic", "seed phrase"} {
		if strings.Contains(hay, marker) {
			t.Errorf("possible key leak (marker %q)", marker)
		}
	}
	t.Logf("LIVE no-leak OK: no plaintext key in backend responses or MPC logs")
}

func min2(a, b int) int {
	if a < b {
		return a
	}
	return b
}

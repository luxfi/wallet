package custody

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// mockMPC stands up a fake lux/mpc with the verified /keygen + /sign wire.
func mockMPC(t *testing.T) (*httptest.Server, *[]string) {
	t.Helper()
	var seenAuth []string
	mux := http.NewServeMux()
	mux.HandleFunc("/keygen", func(w http.ResponseWriter, r *http.Request) {
		seenAuth = append(seenAuth, r.Header.Get("Authorization"))
		var req struct {
			OrgID string `json:"org_id"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.OrgID == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "org_id is required"})
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"wallet_id":     "wallet-abc",
			"result_type":   "success",
			"ecdsa_pub_key": "04aabb",
			"eddsa_pub_key": "ccdd",
			"evm_address":   "0x1111111111111111111111111111111111111111",
			"btc_address":   "bc1qexample",
			"sol_address":   "So1example",
		})
	})
	mux.HandleFunc("/sign", func(w http.ResponseWriter, r *http.Request) {
		var req signReq
		json.NewDecoder(r.Body).Decode(&req)
		if req.IdempotencyKey == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "idempotency required"})
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"session_id": "sess-1",
			"signature":  "0xdeadbeef",
			"status":     "signed",
		})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv, &seenAuth
}

func newCustodian(t *testing.T, endpoint, token string) Custodian {
	t.Helper()
	c, err := NewMPC(MPCConfig{Endpoint: endpoint, ServiceToken: token})
	if err != nil {
		t.Fatalf("NewMPC: %v", err)
	}
	return c
}

func TestNewMPC_NoEndpoint_NoInProcessFallback(t *testing.T) {
	// There is no plaintext-key fallback — an unconfigured endpoint is an error.
	if _, err := NewMPC(MPCConfig{Endpoint: "  "}); err == nil {
		t.Fatal("expected error for empty endpoint (no in-process custody)")
	}
}

func TestCreateWallet_ReturnsAddresses_NoPrivateKey(t *testing.T) {
	srv, auth := mockMPC(t)
	c := newCustodian(t, srv.URL, "svc-token")

	w, err := c.CreateWallet(context.Background(), "acme")
	if err != nil {
		t.Fatalf("CreateWallet: %v", err)
	}
	if w.WalletID != "wallet-abc" {
		t.Errorf("walletId = %q", w.WalletID)
	}
	if w.Addresses["evm"] == "" || w.Addresses["btc"] == "" || w.Addresses["sol"] == "" {
		t.Errorf("missing addresses: %+v", w.Addresses)
	}
	// The service token must be forwarded to MPC.
	if len(*auth) == 0 || (*auth)[0] != "Bearer svc-token" {
		t.Errorf("auth forwarded = %v", *auth)
	}
	// No private key anywhere in the serialized wallet.
	b, _ := json.Marshal(w)
	for _, banned := range []string{"private", "secret", "privKey", "seed", "mnemonic"} {
		if strings.Contains(strings.ToLower(string(b)), banned) {
			t.Errorf("wallet JSON leaked %q: %s", banned, b)
		}
	}
}

func TestSign_RequiresIdempotencyKey(t *testing.T) {
	srv, _ := mockMPC(t)
	c := newCustodian(t, srv.URL, "")

	_, err := c.Sign(context.Background(), "acme", SignRequest{
		WalletID: "wallet-abc", Scheme: SchemeSecp256k1, PayloadHash: "0xab",
	})
	if err != ErrIdempotencyKeyRequired {
		t.Errorf("err = %v, want ErrIdempotencyKeyRequired", err)
	}
}

func TestSign_RejectsUnknownScheme(t *testing.T) {
	srv, _ := mockMPC(t)
	c := newCustodian(t, srv.URL, "")

	_, err := c.Sign(context.Background(), "acme", SignRequest{
		WalletID: "w", Scheme: "rsa-2048", PayloadHash: "0xab", IdempotencyKey: "k1",
	})
	if err == nil || !strings.Contains(err.Error(), "unsupported scheme") {
		t.Errorf("err = %v, want unsupported scheme", err)
	}
}

func TestSign_PQScheme_Accepted(t *testing.T) {
	srv, _ := mockMPC(t)
	c := newCustodian(t, srv.URL, "")

	res, err := c.Sign(context.Background(), "acme", SignRequest{
		WalletID: "wallet-abc", Scheme: SchemeMLDSA65, ChainID: 96369,
		PayloadHash: "0xab", IdempotencyKey: "k1",
	})
	if err != nil {
		t.Fatalf("PQ sign: %v", err)
	}
	if res.Signature != "0xdeadbeef" {
		t.Errorf("signature = %q", res.Signature)
	}
}

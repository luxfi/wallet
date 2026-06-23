package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/luxfi/wallet/backend/internal/custody"
	"github.com/luxfi/wallet/backend/internal/iam"
	"github.com/luxfi/wallet/backend/internal/store"
)

// TestE2E_RealCustodyAdapter_CreateThenSign wires the REAL MPC custody adapter
// (custody.NewMPC) to a mock lux/mpc that speaks the verified /keygen + /sign
// wire, behind the REAL api.Server and a REAL iam.Verifier. This proves the
// whole chain: lux.id auth → org scope → MPC keygen (addresses, no key) → MPC
// threshold sign — end to end, with no plaintext key anywhere.
func TestE2E_RealCustodyAdapter_CreateThenSign(t *testing.T) {
	// Mock lux/mpc (verified wire).
	mpcMux := http.NewServeMux()
	mpcMux.HandleFunc("/keygen", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrgID string `json:"org_id"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.OrgID == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"wallet_id": "w-" + req.OrgID, "result_type": "success",
			"ecdsa_pub_key": "04aa", "evm_address": "0x2222222222222222222222222222222222222222",
		})
	})
	mpcMux.HandleFunc("/sign", func(w http.ResponseWriter, r *http.Request) {
		var req map[string]any
		json.NewDecoder(r.Body).Decode(&req)
		if req["idempotency_key"] == "" || req["payload_hash"] == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"signature": "0xfeed", "status": "signed"})
	})
	mpcSrv := httptest.NewServer(mpcMux)
	defer mpcSrv.Close()

	custodian, err := custody.NewMPC(custody.MPCConfig{Endpoint: mpcSrv.URL, ServiceToken: "svc"})
	if err != nil {
		t.Fatal(err)
	}

	d := newIDP(t)
	v, err := iam.New(context.Background(), d.issuer, "lux-wallet", http.DefaultClient)
	if err != nil {
		t.Fatal(err)
	}
	h := New(custodian, store.NewMemory(), v, nil).Handler()
	tok := d.tokenForOrg(t, "acme", "u1")

	// 1) Create wallet via real adapter → real MPC keygen.
	w := do(t, h, "POST", "/v1/wallets", tok, "")
	if w.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", w.Code, w.Body)
	}
	var wallet custody.Wallet
	json.Unmarshal(w.Body.Bytes(), &wallet)
	if wallet.WalletID != "w-acme" || wallet.Addresses["evm"] == "" {
		t.Fatalf("wallet = %+v", wallet)
	}
	// No private key in the create response.
	if strings.Contains(strings.ToLower(w.Body.String()), "priv") {
		t.Fatalf("leaked key: %s", w.Body)
	}

	// 2) Sign a tx hash via real adapter → real MPC threshold sign.
	w = do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", tok,
		`{"scheme":"secp256k1","chainId":96369,"payloadHash":"0xdeadbeef","idempotencyKey":"idem-1"}`)
	if w.Code != 200 {
		t.Fatalf("sign: %d %s", w.Code, w.Body)
	}
	var res custody.SignResult
	json.Unmarshal(w.Body.Bytes(), &res)
	if res.Signature != "0xfeed" {
		t.Fatalf("signature = %q", res.Signature)
	}
}

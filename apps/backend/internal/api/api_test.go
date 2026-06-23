package api

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/luxfi/wallet/backend/internal/custody"
	"github.com/luxfi/wallet/backend/internal/iam"
	"github.com/luxfi/wallet/backend/internal/store"
)

// --- test IDP (fake lux.id) ---

type idp struct {
	srv    *httptest.Server
	key    *rsa.PrivateKey
	issuer string
}

func newIDP(t *testing.T) *idp {
	t.Helper()
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	d := &idp{key: key}
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"jwks_uri": d.issuer + "/jwks"})
	})
	mux.HandleFunc("/jwks", func(w http.ResponseWriter, _ *http.Request) {
		pub := key.PublicKey
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kty": "RSA", "kid": "k1",
			"n": base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
			"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes()),
		}}})
	})
	d.srv = httptest.NewServer(mux)
	d.issuer = d.srv.URL
	t.Cleanup(d.srv.Close)
	return d
}

func (d *idp) tokenForOrg(t *testing.T, org, sub string) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, iam.Claims{
		Owner: org,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: d.issuer, Audience: jwt.ClaimStrings{"lux-wallet"},
			Subject: sub, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	tok.Header["kid"] = "k1"
	s, _ := tok.SignedString(d.key)
	return s
}

// --- fake custodian (no real MPC) ---

type fakeCustodian struct{ n int }

func (f *fakeCustodian) CreateWallet(_ context.Context, org string) (*custody.Wallet, error) {
	f.n++
	return &custody.Wallet{
		WalletID:  org + "-wallet-" + string(rune('0'+f.n)),
		Addresses: map[string]string{"evm": "0xabc"},
	}, nil
}
func (f *fakeCustodian) Sign(_ context.Context, _ string, req custody.SignRequest) (*custody.SignResult, error) {
	if req.IdempotencyKey == "" {
		return nil, custody.ErrIdempotencyKeyRequired
	}
	return &custody.SignResult{Signature: "0xsig", SessionID: "s1"}, nil
}

func newServer(t *testing.T) (*Server, *idp) {
	t.Helper()
	d := newIDP(t)
	v, err := iam.New(context.Background(), d.issuer, "lux-wallet", http.DefaultClient)
	if err != nil {
		t.Fatalf("verifier: %v", err)
	}
	return New(&fakeCustodian{}, store.NewMemory(), v, nil), d
}

func do(t *testing.T, h http.Handler, method, path, token, body string) *httptest.ResponseRecorder {
	t.Helper()
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestHealth_Open(t *testing.T) {
	s, _ := newServer(t)
	w := do(t, s.Handler(), "GET", "/v1/health", "", "")
	if w.Code != 200 {
		t.Fatalf("health code = %d", w.Code)
	}
}

func TestWallets_RequireAuth(t *testing.T) {
	s, _ := newServer(t)
	for _, p := range []struct{ m, path string }{
		{"POST", "/v1/wallets"}, {"GET", "/v1/wallets"}, {"GET", "/v1/wallets/x"},
		{"POST", "/v1/wallets/x/sign"},
	} {
		w := do(t, s.Handler(), p.m, p.path, "", "")
		if w.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without token: code = %d, want 401", p.m, p.path, w.Code)
		}
	}
}

func TestCreateAndListWallet_NoKeyLeak(t *testing.T) {
	s, d := newServer(t)
	h := s.Handler()
	tok := d.tokenForOrg(t, "acme", "u1")

	w := do(t, h, "POST", "/v1/wallets", tok, "")
	if w.Code != http.StatusCreated {
		t.Fatalf("create code = %d body=%s", w.Code, w.Body)
	}
	body, _ := io.ReadAll(w.Body)
	for _, banned := range []string{"private", "secret", "seed", "mnemonic", "privkey"} {
		if strings.Contains(strings.ToLower(string(body)), banned) {
			t.Errorf("create response leaked %q: %s", banned, body)
		}
	}

	w = do(t, h, "GET", "/v1/wallets", tok, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), "acme-wallet") {
		t.Errorf("list code=%d body=%s", w.Code, w.Body)
	}
}

func TestOrgScoping_CrossOrgWalletIsNotFound(t *testing.T) {
	s, d := newServer(t)
	h := s.Handler()

	// acme creates a wallet.
	w := do(t, h, "POST", "/v1/wallets", d.tokenForOrg(t, "acme", "u1"), "")
	var wallet custody.Wallet
	json.Unmarshal(w.Body.Bytes(), &wallet)

	// evil-corp (different org) must NOT be able to read it — 404, not 200.
	w = do(t, h, "GET", "/v1/wallets/"+wallet.WalletID, d.tokenForOrg(t, "evil-corp", "u2"), "")
	if w.Code != http.StatusNotFound {
		t.Errorf("cross-org read: code = %d, want 404 (no existence disclosure)", w.Code)
	}

	// And evil-corp's list is empty.
	w = do(t, h, "GET", "/v1/wallets", d.tokenForOrg(t, "evil-corp", "u2"), "")
	if strings.Contains(w.Body.String(), wallet.WalletID) {
		t.Errorf("evil-corp list leaked acme wallet: %s", w.Body)
	}
}

func TestSign_OrgScopedAndIdempotent(t *testing.T) {
	s, d := newServer(t)
	h := s.Handler()
	tok := d.tokenForOrg(t, "acme", "u1")

	w := do(t, h, "POST", "/v1/wallets", tok, "")
	var wallet custody.Wallet
	json.Unmarshal(w.Body.Bytes(), &wallet)

	// Missing idempotency key → 400.
	w = do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", tok,
		`{"scheme":"secp256k1","chainId":96369,"payloadHash":"0xab"}`)
	if w.Code != http.StatusBadRequest {
		t.Errorf("sign w/o idempotency: code=%d, want 400", w.Code)
	}

	// Full request → 200 with a signature, no key.
	w = do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", tok,
		`{"scheme":"secp256k1","chainId":96369,"payloadHash":"0xab","idempotencyKey":"k1"}`)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "0xsig") {
		t.Errorf("sign: code=%d body=%s", w.Code, w.Body)
	}

	// Cross-org sign on acme's wallet → 404.
	w = do(t, h, "POST", "/v1/wallets/"+wallet.WalletID+"/sign", d.tokenForOrg(t, "evil-corp", "u2"),
		`{"scheme":"secp256k1","chainId":96369,"payloadHash":"0xab","idempotencyKey":"k2"}`)
	if w.Code != http.StatusNotFound {
		t.Errorf("cross-org sign: code=%d, want 404", w.Code)
	}
}

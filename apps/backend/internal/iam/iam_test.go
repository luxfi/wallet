package iam

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// testIDP stands up a fake lux.id: a discovery doc + JWKS for one RSA key, and
// mints tokens with that key.
type testIDP struct {
	srv    *httptest.Server
	key    *rsa.PrivateKey
	kid    string
	issuer string
}

func newTestIDP(t *testing.T) *testIDP {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	idp := &testIDP{key: key, kid: "test-kid-1"}
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"jwks_uri": idp.issuer + "/jwks"})
	})
	mux.HandleFunc("/jwks", func(w http.ResponseWriter, _ *http.Request) {
		pub := key.PublicKey
		eb := big.NewInt(int64(pub.E)).Bytes()
		json.NewEncoder(w).Encode(map[string]any{
			"keys": []map[string]string{{
				"kty": "RSA",
				"kid": idp.kid,
				"n":   base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
				"e":   base64.RawURLEncoding.EncodeToString(eb),
			}},
		})
	})
	idp.srv = httptest.NewServer(mux)
	idp.issuer = idp.srv.URL
	return idp
}

func (idp *testIDP) token(t *testing.T, claims Claims) string {
	t.Helper()
	if claims.Issuer == "" {
		claims.Issuer = idp.issuer
	}
	if len(claims.Audience) == 0 {
		claims.Audience = jwt.ClaimStrings{"lux-wallet"}
	}
	if claims.ExpiresAt == nil {
		claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(time.Hour))
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = idp.kid
	s, err := tok.SignedString(idp.key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func newVerifier(t *testing.T, idp *testIDP) *Verifier {
	t.Helper()
	v, err := New(context.Background(), idp.issuer, "lux-wallet", http.DefaultClient)
	if err != nil {
		t.Fatalf("New verifier: %v", err)
	}
	return v
}

func TestVerify_ValidToken_ResolvesOrgFromOwner(t *testing.T) {
	idp := newTestIDP(t)
	defer idp.srv.Close()
	v := newVerifier(t, idp)

	raw := idp.token(t, Claims{
		Owner:            "acme",
		Email:            "z@lux.network",
		RegisteredClaims: jwt.RegisteredClaims{Subject: "user-1"},
	})
	id, err := v.Verify(context.Background(), raw)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if id.Org != "acme" {
		t.Errorf("org = %q, want acme", id.Org)
	}
	if id.Subject != "user-1" || id.Email != "z@lux.network" {
		t.Errorf("identity = %+v", id)
	}
}

func TestVerify_NoOrgClaim_Rejected(t *testing.T) {
	idp := newTestIDP(t)
	defer idp.srv.Close()
	v := newVerifier(t, idp)

	raw := idp.token(t, Claims{RegisteredClaims: jwt.RegisteredClaims{Subject: "user-1"}})
	if _, err := v.Verify(context.Background(), raw); err != ErrNoOrg {
		t.Errorf("err = %v, want ErrNoOrg", err)
	}
}

func TestVerify_WrongAudience_Rejected(t *testing.T) {
	idp := newTestIDP(t)
	defer idp.srv.Close()
	v := newVerifier(t, idp)

	raw := idp.token(t, Claims{
		Owner:            "acme",
		RegisteredClaims: jwt.RegisteredClaims{Subject: "u", Audience: jwt.ClaimStrings{"some-other-app"}},
	})
	if _, err := v.Verify(context.Background(), raw); err == nil {
		t.Error("expected rejection for wrong audience")
	}
}

func TestVerify_Expired_Rejected(t *testing.T) {
	idp := newTestIDP(t)
	defer idp.srv.Close()
	v := newVerifier(t, idp)

	raw := idp.token(t, Claims{
		Owner:            "acme",
		RegisteredClaims: jwt.RegisteredClaims{Subject: "u", ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour))},
	})
	if _, err := v.Verify(context.Background(), raw); err == nil {
		t.Error("expected rejection for expired token")
	}
}

func TestVerify_HMACToken_Rejected(t *testing.T) {
	// An attacker presenting an HS256 token (alg confusion) must be refused —
	// we only accept asymmetric methods.
	idp := newTestIDP(t)
	defer idp.srv.Close()
	v := newVerifier(t, idp)

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		Owner:            "acme",
		RegisteredClaims: jwt.RegisteredClaims{Issuer: idp.issuer, Audience: jwt.ClaimStrings{"lux-wallet"}, Subject: "u", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))},
	})
	tok.Header["kid"] = idp.kid
	raw, _ := tok.SignedString([]byte("guessed-secret"))
	if _, err := v.Verify(context.Background(), raw); err == nil {
		t.Error("expected rejection for HMAC-signed token (alg confusion)")
	}
}

func TestBearerFromHeader(t *testing.T) {
	h := http.Header{}
	if _, err := BearerFromHeader(h); err != ErrNoToken {
		t.Errorf("empty: err = %v", err)
	}
	h.Set("Authorization", "Bearer abc.def.ghi")
	got, err := BearerFromHeader(h)
	if err != nil || got != "abc.def.ghi" {
		t.Errorf("got %q, %v", got, err)
	}
}

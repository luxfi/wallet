// Package iam verifies lux.id OIDC bearer tokens — the ONE identity provider
// for the wallet backend. No built-in accounts; the superuser is z@lux.network,
// an IAM user. Every wallet operation is scoped to the org taken from the
// token's `owner` claim (house convention).
//
// Tokens are asymmetric (RS256/ES256) and verified against lux.id's JWKS, which
// is discovered from the issuer's /.well-known/openid-configuration and cached.
// No shared secret — the backend never holds a signing key.
package iam

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Identity is the verified caller. Org scopes every data access; Subject is the
// stable user id; Email is for display/audit.
type Identity struct {
	Subject string
	Email   string
	Org     string
}

// Claims is the lux.id token shape we read. `owner` is the canonical org claim
// (falls back to org/organization/tenant in resolveOrg).
type Claims struct {
	Email         string `json:"email"`
	PreferredUser string `json:"preferred_username"`
	Owner         string `json:"owner"`
	Org           string `json:"org"`
	Organization  string `json:"organization"`
	Tenant        string `json:"tenant"`
	jwt.RegisteredClaims
}

// Verifier validates bearer tokens against a single lux.id issuer + audience.
type Verifier struct {
	issuer   string
	audience string
	keys     *jwks
}

// New builds a Verifier for an issuer (e.g. https://lux.id) and the audience
// this backend expects (its IAM client id, e.g. lux-wallet). The JWKS endpoint
// is discovered from the issuer and refreshed lazily.
func New(ctx context.Context, issuer, audience string, hc *http.Client) (*Verifier, error) {
	issuer = strings.TrimRight(issuer, "/")
	jwksURI, err := discoverJWKS(ctx, issuer, hc)
	if err != nil {
		return nil, fmt.Errorf("iam: discover jwks: %w", err)
	}
	return &Verifier{
		issuer:   issuer,
		audience: audience,
		keys:     newJWKS(jwksURI, hc),
	}, nil
}

var (
	ErrNoToken      = errors.New("iam: no bearer token")
	ErrInvalidToken = errors.New("iam: invalid token")
	ErrNoOrg        = errors.New("iam: token carries no org claim")
)

// Verify parses + validates a raw JWT and returns the caller Identity. It
// enforces issuer, audience, expiry, and a non-empty org claim, and only
// accepts asymmetric signatures (RS*/ES*/PS*) — never `none`, never HMAC.
func (v *Verifier) Verify(ctx context.Context, raw string) (*Identity, error) {
	claims := &Claims{}
	parser := jwt.NewParser(
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.audience),
		jwt.WithExpirationRequired(),
		jwt.WithValidMethods([]string{"RS256", "RS384", "RS512", "ES256", "ES384", "PS256"}),
	)
	_, err := parser.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		return v.keys.key(ctx, t)
	})
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	org := resolveOrg(claims)
	if org == "" {
		return nil, ErrNoOrg
	}
	email := claims.Email
	return &Identity{
		Subject: claims.Subject,
		Email:   email,
		Org:     org,
	}, nil
}

func resolveOrg(c *Claims) string {
	for _, v := range []string{c.Owner, c.Org, c.Organization, c.Tenant} {
		if v != "" {
			return v
		}
	}
	return ""
}

// BearerFromHeader extracts the raw token from an Authorization header.
func BearerFromHeader(h http.Header) (string, error) {
	v := h.Get("Authorization")
	if v == "" {
		return "", ErrNoToken
	}
	const p = "Bearer "
	if len(v) <= len(p) || !strings.EqualFold(v[:len(p)], p) {
		return "", ErrNoToken
	}
	return strings.TrimSpace(v[len(p):]), nil
}

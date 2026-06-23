// JWKS discovery + key cache. Stdlib only (no jose/keyfunc dep): fetch the
// issuer's JWKS, decode RSA/EC public keys, and resolve a token's `kid` to its
// key. Keys are cached; a cache miss (rotated kid) triggers one refresh.
package iam

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type discoveryDoc struct {
	JWKSURI string `json:"jwks_uri"`
}

func discoverJWKS(ctx context.Context, issuer string, hc *http.Client) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, issuer+"/.well-known/openid-configuration", nil)
	if err != nil {
		return "", err
	}
	res, err := hc.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("discovery %s: status %d", issuer, res.StatusCode)
	}
	var doc discoveryDoc
	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return "", err
	}
	if doc.JWKSURI == "" {
		return "", fmt.Errorf("discovery %s: no jwks_uri", issuer)
	}
	return doc.JWKSURI, nil
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`   // RSA modulus
	E   string `json:"e"`   // RSA exponent
	Crv string `json:"crv"` // EC curve
	X   string `json:"x"`   // EC x
	Y   string `json:"y"`   // EC y
}

type jwks struct {
	uri string
	hc  *http.Client

	mu        sync.RWMutex
	keys      map[string]interface{} // kid → *rsa.PublicKey | *ecdsa.PublicKey
	fetchedAt time.Time
}

func newJWKS(uri string, hc *http.Client) *jwks {
	return &jwks{uri: uri, hc: hc, keys: map[string]interface{}{}}
}

// key resolves the token's `kid` to its public key, refreshing once on a miss
// (handles key rotation) but no more than every 60s (avoids fetch storms).
func (j *jwks) key(ctx context.Context, t *jwt.Token) (interface{}, error) {
	kid, _ := t.Header["kid"].(string)
	if kid == "" {
		return nil, fmt.Errorf("token has no kid")
	}
	if k := j.lookup(kid); k != nil {
		return k, nil
	}
	j.mu.RLock()
	stale := time.Since(j.fetchedAt) > time.Minute
	j.mu.RUnlock()
	if stale || j.empty() {
		if err := j.refresh(ctx); err != nil {
			return nil, err
		}
	}
	if k := j.lookup(kid); k != nil {
		return k, nil
	}
	return nil, fmt.Errorf("no key for kid %q", kid)
}

func (j *jwks) lookup(kid string) interface{} {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return j.keys[kid]
}

func (j *jwks) empty() bool {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return len(j.keys) == 0
}

func (j *jwks) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, j.uri, nil)
	if err != nil {
		return err
	}
	res, err := j.hc.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks %s: status %d", j.uri, res.StatusCode)
	}
	var doc struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return err
	}
	parsed := make(map[string]interface{}, len(doc.Keys))
	for _, k := range doc.Keys {
		pub, err := k.publicKey()
		if err != nil || pub == nil {
			continue // skip keys we can't parse rather than failing the whole set
		}
		parsed[k.Kid] = pub
	}
	if len(parsed) == 0 {
		return fmt.Errorf("jwks %s: no usable keys", j.uri)
	}
	j.mu.Lock()
	j.keys = parsed
	j.fetchedAt = time.Now()
	j.mu.Unlock()
	return nil
}

func (k jwk) publicKey() (interface{}, error) {
	switch k.Kty {
	case "RSA":
		nb, err := b64uint(k.N)
		if err != nil {
			return nil, err
		}
		eb, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			return nil, err
		}
		// Right-align the exponent into 8 bytes for a uint64.
		var ebuf [8]byte
		copy(ebuf[8-len(eb):], eb)
		return &rsa.PublicKey{N: nb, E: int(binary.BigEndian.Uint64(ebuf[:]))}, nil
	case "EC":
		var curve elliptic.Curve
		switch k.Crv {
		case "P-256":
			curve = elliptic.P256()
		case "P-384":
			curve = elliptic.P384()
		case "P-521":
			curve = elliptic.P521()
		default:
			return nil, fmt.Errorf("unsupported EC curve %q", k.Crv)
		}
		xb, err := b64uint(k.X)
		if err != nil {
			return nil, err
		}
		yb, err := b64uint(k.Y)
		if err != nil {
			return nil, err
		}
		return &ecdsa.PublicKey{Curve: curve, X: xb, Y: yb}, nil
	default:
		return nil, fmt.Errorf("unsupported kty %q", k.Kty)
	}
}

func b64uint(s string) (*big.Int, error) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	return new(big.Int).SetBytes(b), nil
}

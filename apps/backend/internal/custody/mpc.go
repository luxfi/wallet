// MPC custody adapter — speaks the lux/mpc HTTP wire (mpc.lux.network).
//
// Wallet creation calls MPC `POST /keygen {org_id, wallet_id}` (the verified
// contract: returns ecdsa/eddsa pubkeys + evm/btc/sol addresses, never a
// private key). Signing calls `POST /sign` with the org-scoped wallet + payload
// hash and idempotency key, conforming to the MPC client's Sign contract.
//
// The MPC endpoint is per-tenant (shared hanzo-mpc or BYOMPC; lux →
// mpc.lux.network) — the URL is injected, so a tenant points custody at their
// own MPC without a code change. Auth to MPC is a service token (the MPC nodes'
// internalAuth); user identity/org is carried in the body and re-derived by MPC
// from its own bearer claims at the consensus layer.
package custody

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// MPCConfig configures the lux/mpc adapter. Endpoint is the MPC API base
// (e.g. https://mpc.lux.network); ServiceToken authenticates to the MPC nodes.
type MPCConfig struct {
	Endpoint     string
	ServiceToken string
	HTTPClient   *http.Client
}

// mpcCustodian is the HTTP-backed Custodian.
type mpcCustodian struct {
	endpoint string
	token    string
	hc       *http.Client
}

// NewMPC builds an MPC-backed Custodian. Returns an error if no endpoint is
// configured — there is no in-process fallback custody (no plaintext keys, ever).
func NewMPC(cfg MPCConfig) (Custodian, error) {
	if strings.TrimSpace(cfg.Endpoint) == "" {
		return nil, fmt.Errorf("%w: no MPC endpoint configured", ErrBackendUnavailable)
	}
	hc := cfg.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: 90 * time.Second} // keygen can take ~60s
	}
	return &mpcCustodian{
		endpoint: strings.TrimRight(cfg.Endpoint, "/"),
		token:    cfg.ServiceToken,
		hc:       hc,
	}, nil
}

// keygenResp mirrors lux/mpc cmd/mpcd /keygen response.
type keygenResp struct {
	WalletID    string `json:"wallet_id"`
	ResultType  string `json:"result_type"`
	ECDSAPubKey string `json:"ecdsa_pub_key"`
	EDDSAPubKey string `json:"eddsa_pub_key"`
	EVMAddress  string `json:"evm_address"`
	BTCAddress  string `json:"btc_address"`
	SOLAddress  string `json:"sol_address"`
	Error       string `json:"error"`
}

func (m *mpcCustodian) CreateWallet(ctx context.Context, org string) (*Wallet, error) {
	var resp keygenResp
	if err := m.post(ctx, "/keygen", map[string]string{"org_id": org}, &resp); err != nil {
		return nil, err
	}
	if resp.ResultType != "" && resp.ResultType != "success" {
		return nil, fmt.Errorf("%w: %s", ErrKeygenFailed, resp.Error)
	}
	if resp.WalletID == "" {
		return nil, fmt.Errorf("%w: empty wallet id", ErrKeygenFailed)
	}
	addrs := map[string]string{}
	if resp.EVMAddress != "" {
		addrs["evm"] = resp.EVMAddress
	}
	if resp.BTCAddress != "" {
		addrs["btc"] = resp.BTCAddress
	}
	if resp.SOLAddress != "" {
		addrs["sol"] = resp.SOLAddress
	}
	return &Wallet{
		WalletID:    resp.WalletID,
		ECDSAPubKey: resp.ECDSAPubKey,
		EDDSAPubKey: resp.EDDSAPubKey,
		Addresses:   addrs,
	}, nil
}

// signReq is the org-scoped MPC sign request. Conforms to the MPC client
// SignRequest contract: org-scoped, payload-hash-bound, idempotent.
type signReq struct {
	OrgID          string `json:"org_id"`
	WalletID       string `json:"wallet_id"`
	KeyType        string `json:"key_type"`
	ChainID        int    `json:"chain_id"`
	PayloadHash    string `json:"payload_hash"`
	IdempotencyKey string `json:"idempotency_key"`
}

type signResp struct {
	SessionID string `json:"session_id"`
	Signature string `json:"signature"`
	Status    string `json:"status"`
	Error     string `json:"error"`
}

func (m *mpcCustodian) Sign(ctx context.Context, org string, req SignRequest) (*SignResult, error) {
	if req.IdempotencyKey == "" {
		return nil, ErrIdempotencyKeyRequired
	}
	switch req.Scheme {
	case SchemeSecp256k1, SchemeEd25519, SchemeMLDSA65:
	default:
		return nil, fmt.Errorf("%w: %q", ErrUnsupportedScheme, req.Scheme)
	}
	body := signReq{
		OrgID:          org,
		WalletID:       req.WalletID,
		KeyType:        string(req.Scheme),
		ChainID:        req.ChainID,
		PayloadHash:    req.PayloadHash,
		IdempotencyKey: req.IdempotencyKey,
	}
	var resp signResp
	if err := m.post(ctx, "/sign", body, &resp); err != nil {
		return nil, err
	}
	if resp.Error != "" {
		return nil, fmt.Errorf("custody: sign rejected: %s", resp.Error)
	}
	return &SignResult{Signature: resp.Signature, SessionID: resp.SessionID}, nil
}

// post sends a JSON body to an MPC endpoint and decodes the JSON response.
func (m *mpcCustodian) post(ctx context.Context, path string, body, out interface{}) error {
	buf, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.endpoint+path, bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if m.token != "" {
		req.Header.Set("Authorization", "Bearer "+m.token)
	}
	res, err := m.hc.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrBackendUnavailable, err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusServiceUnavailable {
		return fmt.Errorf("%w: MPC peers not ready", ErrBackendUnavailable)
	}
	if res.StatusCode/100 != 2 {
		return fmt.Errorf("custody: MPC %s → status %d", path, res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(out)
}

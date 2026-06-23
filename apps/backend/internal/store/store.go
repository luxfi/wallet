// Package store persists the wallet↔org mapping and the wallet's public
// addresses. It NEVER stores a private key (custody is MPC). Org scoping is
// enforced here: a wallet read/list is always filtered by org, so one tenant
// can never see another's wallets.
package store

import (
	"context"
	"errors"
	"sync"

	"github.com/luxfi/wallet/backend/internal/custody"
)

var ErrNotFound = errors.New("store: wallet not found")

// Store is the wallet record store. All methods are org-scoped.
type Store interface {
	// Put records a wallet under an org. Idempotent on WalletID within the org.
	Put(ctx context.Context, org string, w *custody.Wallet) error
	// Get returns the org's wallet by id, or ErrNotFound (also for a wallet
	// owned by a different org — no cross-org existence disclosure).
	Get(ctx context.Context, org, walletID string) (*custody.Wallet, error)
	// List returns all wallets for an org.
	List(ctx context.Context, org string) ([]*custody.Wallet, error)
}

// Memory is an in-process Store. Production swaps in a Postgres-backed Store
// behind the same interface; the API is indifferent. Records hold public data
// only — there is no key field to leak.
type Memory struct {
	mu sync.RWMutex
	// org → walletID → wallet
	byOrg map[string]map[string]*custody.Wallet
}

func NewMemory() *Memory {
	return &Memory{byOrg: map[string]map[string]*custody.Wallet{}}
}

func (m *Memory) Put(_ context.Context, org string, w *custody.Wallet) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	wallets := m.byOrg[org]
	if wallets == nil {
		wallets = map[string]*custody.Wallet{}
		m.byOrg[org] = wallets
	}
	wallets[w.WalletID] = w
	return nil
}

func (m *Memory) Get(_ context.Context, org, walletID string) (*custody.Wallet, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if w, ok := m.byOrg[org][walletID]; ok {
		return w, nil
	}
	return nil, ErrNotFound
}

func (m *Memory) List(_ context.Context, org string) ([]*custody.Wallet, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	wallets := m.byOrg[org]
	out := make([]*custody.Wallet, 0, len(wallets))
	for _, w := range wallets {
		out = append(out, w)
	}
	return out, nil
}

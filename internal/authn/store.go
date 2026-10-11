package authn

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"
)

// UserRepository persists principals.
type UserRepository interface {
	CreateUser(ctx context.Context, u *User) error
	UpdateUser(ctx context.Context, u *User) error
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	ListUsersByTenant(ctx context.Context, tenantID string) ([]*User, error)
}

// SessionRepository persists refresh sessions. RefreshHash is unique.
type SessionRepository interface {
	CreateSession(ctx context.Context, s *Session) error
	UpdateSession(ctx context.Context, s *Session) error
	GetSessionByID(ctx context.Context, id string) (*Session, error)
	GetSessionByRefreshHash(ctx context.Context, hash string) (*Session, error)
	ListSessionsByUser(ctx context.Context, userID string) ([]*Session, error)
	RevokeSessionsForUser(ctx context.Context, userID string) error
}

// TokenRepository persists single-use out-of-band tokens by hash.
type TokenRepository interface {
	CreateToken(ctx context.Context, t *Token) error
	GetToken(ctx context.Context, hash string) (*Token, error)
	MarkTokenUsed(ctx context.Context, hash string) error
}

// Store is the full persistence surface for the lifecycle.
type Store interface {
	UserRepository
	SessionRepository
	TokenRepository
}

// clock is injectable for deterministic tests.
type clock func() time.Time

// memStore is an in-memory Store. It is safe for concurrent use and is the
// fallback when no SQL database is configured (OSS/demo). State is not shared
// across processes.
type memStore struct {
	mu             sync.RWMutex
	now            clock
	usersByID      map[string]*User
	usersByEmail   map[string]*User
	sessions       map[string]*Session
	sessionsByHash map[string]*Session
	tokens         map[string]*Token
}

// NewMemStore returns an empty in-memory store.
func NewMemStore() Store {
	return &memStore{
		now:            time.Now,
		usersByID:      make(map[string]*User),
		usersByEmail:   make(map[string]*User),
		sessions:       make(map[string]*Session),
		sessionsByHash: make(map[string]*Session),
		tokens:         make(map[string]*Token),
	}
}

func (m *memStore) CreateUser(_ context.Context, u *User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := normalizeEmail(u.Email)
	if _, exists := m.usersByEmail[key]; exists {
		return ErrEmailTaken
	}
	stored := u.Clone()
	if stored.CreatedAt.IsZero() {
		stored.CreatedAt = m.now().UTC()
	}
	stored.UpdatedAt = m.now().UTC()
	m.usersByID[stored.ID] = stored
	m.usersByEmail[key] = stored
	return nil
}

func (m *memStore) UpdateUser(_ context.Context, u *User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	existing, ok := m.usersByID[u.ID]
	if !ok {
		return ErrUserNotFound
	}
	u.UpdatedAt = m.now().UTC()
	if u.CreatedAt.IsZero() {
		u.CreatedAt = existing.CreatedAt
	}
	// Email changes must keep the unique index consistent.
	if oldKey := normalizeEmail(existing.Email); oldKey != normalizeEmail(u.Email) {
		delete(m.usersByEmail, oldKey)
	}
	stored := u.Clone()
	m.usersByID[stored.ID] = stored
	m.usersByEmail[normalizeEmail(stored.Email)] = stored
	return nil
}

func (m *memStore) GetUserByID(_ context.Context, id string) (*User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	u, ok := m.usersByID[id]
	if !ok {
		return nil, ErrUserNotFound
	}
	return u.Clone(), nil
}

func (m *memStore) GetUserByEmail(_ context.Context, email string) (*User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	u, ok := m.usersByEmail[normalizeEmail(email)]
	if !ok {
		return nil, ErrUserNotFound
	}
	return u.Clone(), nil
}

func (m *memStore) ListUsersByTenant(_ context.Context, tenantID string) ([]*User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*User, 0, len(m.usersByID))
	for _, u := range m.usersByID {
		if tenantID == "" || u.TenantID == tenantID {
			out = append(out, u.Clone())
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Email < out[j].Email })
	return out, nil
}

func (m *memStore) CreateSession(_ context.Context, s *Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	stored := *s
	m.sessions[stored.ID] = &stored
	m.sessionsByHash[stored.RefreshHash] = &stored
	return nil
}

func (m *memStore) UpdateSession(_ context.Context, s *Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	stored := *s
	m.sessions[stored.ID] = &stored
	m.sessionsByHash[stored.RefreshHash] = &stored
	return nil
}

func (m *memStore) GetSessionByID(_ context.Context, id string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sessions[id]
	if !ok {
		return nil, ErrInvalidToken
	}
	c := *s
	return &c, nil
}

func (m *memStore) GetSessionByRefreshHash(_ context.Context, hash string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sessionsByHash[strings.TrimSpace(hash)]
	if !ok {
		return nil, ErrInvalidToken
	}
	c := *s
	return &c, nil
}

func (m *memStore) ListSessionsByUser(_ context.Context, userID string) ([]*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*Session, 0)
	for _, s := range m.sessions {
		if s.UserID == userID {
			c := *s
			out = append(out, &c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (m *memStore) RevokeSessionsForUser(_ context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.now().UTC()
	for _, s := range m.sessions {
		if s.UserID == userID && s.RevokedAt == nil {
			t := now
			s.RevokedAt = &t
		}
	}
	return nil
}

func (m *memStore) CreateToken(_ context.Context, t *Token) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	stored := *t
	m.tokens[stored.Hash] = &stored
	return nil
}

func (m *memStore) GetToken(_ context.Context, hash string) (*Token, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	t, ok := m.tokens[strings.TrimSpace(hash)]
	if !ok {
		return nil, ErrInvalidToken
	}
	c := *t
	return &c, nil
}

func (m *memStore) MarkTokenUsed(_ context.Context, hash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.tokens[strings.TrimSpace(hash)]
	if !ok {
		return ErrInvalidToken
	}
	now := m.now().UTC()
	t.UsedAt = &now
	return nil
}

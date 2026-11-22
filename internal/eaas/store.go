package eaas

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Store is a concurrency-safe, file-backed store used by the standalone EaaS
// development/sandbox service. Production deployments must use the PostgreSQL
// schema in deploy/migrations/004_eaas_schema.sql instead.
type Store struct {
	mu   sync.RWMutex
	path string
	data State
}

// State is the complete persisted state of the EaaS service.
type State struct {
	Users             map[string]*User         `json:"users"`
	Sessions          map[string]*Session      `json:"sessions"`
	Projects          map[string]*Project      `json:"projects"`
	APIKeys           map[string]*APIKey       `json:"api_keys"`
	SigningKeys       map[string]*SigningKey   `json:"signing_keys"`
	UsageEvents       []UsageEvent             `json:"usage_events"`
	Subscriptions     map[string]*Subscription `json:"subscriptions"`
	BetaRegistrations []*BetaRegistration      `json:"beta_registrations"`
	RateWindows       map[string]*RateWindow   `json:"rate_windows"`
}

// User is a developer account. PasswordHash is a bcrypt hash; verification
// codes are stored as SHA-256 hashes and are never returned in production.
type User struct {
	ID                  string    `json:"id"`
	Email               string    `json:"email"`
	Name                string    `json:"name"`
	PasswordHash        string    `json:"password_hash"`
	Verified            bool      `json:"verified"`
	VerificationHash    string    `json:"verification_hash,omitempty"`
	VerificationExpires time.Time `json:"verification_expires,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	FailedVerifications int       `json:"failed_verifications"`
}

// Session is a dashboard bearer session. Only the hash of the token is kept.
type Session struct {
	TokenHash string    `json:"token_hash"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Project groups keys and usage for one environment.
type Project struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Environment string    `json:"environment"`
	CreatedAt   time.Time `json:"created_at"`
}

// APIKey is a developer API credential. Only Prefix and Hash are persisted;
// the plaintext secret is returned to the caller exactly once.
type APIKey struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	ProjectID   string     `json:"project_id"`
	Prefix      string     `json:"prefix"`
	Hash        string     `json:"hash"`
	Environment string     `json:"environment"`
	CreatedAt   time.Time  `json:"created_at"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
}

// SigningKey holds server-side key material. Private bytes never leave the
// service through an API response.
type SigningKey struct {
	ID         string    `json:"id"`
	ProjectID  string    `json:"project_id"`
	UserID     string    `json:"user_id"`
	Algorithm  string    `json:"algorithm"`
	PrivateB64 string    `json:"private_b64"`
	PublicB64  string    `json:"public_b64,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// UsageEvent records metadata only. Payloads, keys, plaintext and signatures
// are deliberately never persisted here.
type UsageEvent struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	ProjectID   string    `json:"project_id"`
	KeyID       string    `json:"key_id"`
	Operation   string    `json:"operation"`
	Category    string    `json:"category"`
	Environment string    `json:"environment"`
	Status      string    `json:"status"`
	ErrorCode   string    `json:"error_code,omitempty"`
	LatencyMS   int64     `json:"latency_ms"`
	Timestamp   time.Time `json:"timestamp"`
}

// Subscription captures entitlements. Billing/payment state is explicitly
// separate and is not implemented in this release.
type Subscription struct {
	UserID        string    `json:"user_id"`
	Plan          string    `json:"plan"`
	Status        string    `json:"status"`
	BillingStatus string    `json:"billing_status"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// BetaRegistration is a securely captured early-beta expression of interest.
type BetaRegistration struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	WorkEmail       string    `json:"work_email"`
	Organisation    string    `json:"organisation"`
	Role            string    `json:"role"`
	UseCase         string    `json:"use_case"`
	EditionInterest []string  `json:"edition_interest"`
	Deployments     []string  `json:"deployments"`
	Integrations    []string  `json:"integrations"`
	Consent         bool      `json:"consent"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

// RateWindow is a fixed one-minute counter per API key.
type RateWindow struct {
	Bucket string `json:"bucket"`
	Count  int    `json:"count"`
}

// NewStore loads an existing state file or creates an empty one.
func NewStore(path string) (*Store, error) {
	if path == "" {
		return nil, errors.New("eaas: data file path is required")
	}
	s := &Store{path: path, data: newState()}
	raw, err := os.ReadFile(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return nil, err
		}
		if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
			return nil, err
		}
		if err := s.persistLocked(); err != nil {
			return nil, err
		}
		return s, nil
	}
	if err := json.Unmarshal(raw, &s.data); err != nil {
		return nil, err
	}
	s.data.ensureMaps()
	return s, nil
}

func newState() State {
	s := State{}
	s.ensureMaps()
	return s
}

func (s *State) ensureMaps() {
	if s.Users == nil {
		s.Users = map[string]*User{}
	}
	if s.Sessions == nil {
		s.Sessions = map[string]*Session{}
	}
	if s.Projects == nil {
		s.Projects = map[string]*Project{}
	}
	if s.APIKeys == nil {
		s.APIKeys = map[string]*APIKey{}
	}
	if s.SigningKeys == nil {
		s.SigningKeys = map[string]*SigningKey{}
	}
	if s.Subscriptions == nil {
		s.Subscriptions = map[string]*Subscription{}
	}
	if s.RateWindows == nil {
		s.RateWindows = map[string]*RateWindow{}
	}
}

func (s *Store) persistLocked() error {
	raw, err := json.Marshal(s.data)
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

// View executes fn with a read lock. fn must not mutate state.
func (s *Store) View(fn func(*State)) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	fn(&s.data)
}

// Update executes fn with a write lock and atomically persists on success.
func (s *Store) Update(fn func(*State) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := fn(&s.data); err != nil {
		return err
	}
	return s.persistLocked()
}

// PurgeExpired removes expired sessions and stale rate windows.
func (s *Store) PurgeExpired(now time.Time) error {
	return s.Update(func(st *State) error {
		for k, v := range st.Sessions {
			if now.After(v.ExpiresAt) {
				delete(st.Sessions, k)
			}
		}
		for k, v := range st.RateWindows {
			if v.Bucket != now.UTC().Format(time.RFC3339) {
				delete(st.RateWindows, k)
			}
		}
		return nil
	})
}

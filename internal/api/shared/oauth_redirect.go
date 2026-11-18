package shared

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// frontendOAuthCallbackURL returns the browser URL that completes OAuth (includes router basename).
func frontendOAuthCallbackURL() string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_REDIRECT_URL"))
	if base == "" {
		base = "http://localhost:3000"
	}
	base = strings.TrimRight(base, "/")

	// When FRONTEND_REDIRECT_URL is just the origin, append the SPA basename.
	if !strings.Contains(strings.TrimPrefix(base, "http://"), "/") &&
		!strings.Contains(strings.TrimPrefix(base, "https://"), "/") {
		path := strings.TrimSpace(os.Getenv("FRONTEND_BASE_PATH"))
		if path == "" {
			path = "/platform"
		}
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		base += strings.TrimRight(path, "/")
	}

	return base + "/oauth/callback"
}

func buildOAuthFrontendRedirect(params url.Values) string {
	return frontendOAuthCallbackURL() + "?" + params.Encode()
}

const (
	oauthStateTTL    = 10 * time.Minute
	oauthExchangeTTL = 2 * time.Minute
)

var errOAuthStateInvalid = errors.New("invalid state parameter")

type oauthStateEntry struct {
	expiresAt time.Time
	used      bool
}

type oauthExchangeEntry struct {
	state        string
	accessToken  string
	refreshToken string
	user         authUserResponse
	edition      string
	expiresAt    time.Time
	used         bool
}

type oauthStateStore struct {
	mu        sync.Mutex
	states    map[string]oauthStateEntry
	exchanges map[string]oauthExchangeEntry
}

var defaultOAuthStore = &oauthStateStore{
	states:    make(map[string]oauthStateEntry),
	exchanges: make(map[string]oauthExchangeEntry),
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *oauthStateStore) createState(now time.Time) (string, error) {
	token, err := randomToken(32)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcLocked(now)
	s.states[token] = oauthStateEntry{expiresAt: now.Add(oauthStateTTL)}
	return token, nil
}

func (s *oauthStateStore) consumeState(state string, now time.Time) error {
	state = strings.TrimSpace(state)
	if state == "" {
		return errOAuthStateInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcLocked(now)
	e, ok := s.states[state]
	if !ok || e.used || !now.Before(e.expiresAt) {
		delete(s.states, state)
		return errOAuthStateInvalid
	}
	e.used = true
	delete(s.states, state)
	return nil
}

func (s *oauthStateStore) createExchange(state string, res *oauthCompletion, now time.Time) (string, error) {
	code, err := randomToken(32)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcLocked(now)
	s.exchanges[code] = oauthExchangeEntry{
		state:        strings.TrimSpace(state),
		accessToken:  res.AccessToken,
		refreshToken: res.RefreshToken,
		user:         res.User,
		edition:      res.Edition,
		expiresAt:    now.Add(oauthExchangeTTL),
	}
	return code, nil
}

func (s *oauthStateStore) consumeExchange(code, state string, now time.Time) (*oauthExchangeEntry, error) {
	code = strings.TrimSpace(code)
	state = strings.TrimSpace(state)
	if code == "" || state == "" {
		return nil, errOAuthStateInvalid
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcLocked(now)
	e, ok := s.exchanges[code]
	if !ok || e.used || !now.Before(e.expiresAt) || e.state != state {
		delete(s.exchanges, code)
		return nil, errOAuthStateInvalid
	}
	e.used = true
	delete(s.exchanges, code)
	out := e
	return &out, nil
}

func (s *oauthStateStore) gcLocked(now time.Time) {
	for k, v := range s.states {
		if v.used || !now.Before(v.expiresAt) {
			delete(s.states, k)
		}
	}
	for k, v := range s.exchanges {
		if v.used || !now.Before(v.expiresAt) {
			delete(s.exchanges, k)
		}
	}
}

type oauthCompletion struct {
	AccessToken  string
	RefreshToken string
	Edition      string
	User         authUserResponse
}

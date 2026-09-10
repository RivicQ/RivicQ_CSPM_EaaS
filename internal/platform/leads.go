package platform

import (
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Lead is a commercial inbound record. Email is stored for operators; it is
// never forwarded to Discord or GitHub Pages.
type Lead struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Company    string    `json:"company"`
	Intent     string    `json:"intent"`
	Source     string    `json:"source"`
	Stage      string    `json:"stage"`
	Owner      string    `json:"owner,omitempty"`
	NextAction string    `json:"next_action,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type LeadStore struct {
	mu    sync.RWMutex
	items map[string]*Lead
}

func NewLeadStore() *LeadStore {
	return &LeadStore{items: make(map[string]*Lead)}
}

func NormalizeIntent(in string) string {
	switch strings.ToLower(strings.TrimSpace(in)) {
	case "demo", "poc", "pilot", "signup", "pricing", "ibm":
		return strings.ToLower(strings.TrimSpace(in))
	default:
		return "demo"
	}
}

func ValidEmail(addr string) bool {
	addr = strings.TrimSpace(strings.ToLower(addr))
	if addr == "" || len(addr) > 254 {
		return false
	}
	parsed, err := mail.ParseAddress(addr)
	return err == nil && parsed.Address == addr
}

func (s *LeadStore) Create(name, email, company, intent, source string) (*Lead, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if !ValidEmail(email) {
		return nil, errInvalidEmail
	}
	lead := &Lead{
		ID:        uuid.NewString(),
		Name:      strings.TrimSpace(name),
		Email:     email,
		Company:   strings.TrimSpace(company),
		Intent:    NormalizeIntent(intent),
		Source:    strings.TrimSpace(source),
		Stage:     "identified",
		CreatedAt: time.Now().UTC(),
	}
	if lead.Source == "" {
		lead.Source = "website"
	}
	s.mu.Lock()
	s.items[lead.ID] = lead
	s.mu.Unlock()
	return lead, nil
}

func (s *LeadStore) List() []*Lead {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Lead, 0, len(s.items))
	for _, l := range s.items {
		cp := *l
		out = append(out, &cp)
	}
	return out
}

func (s *LeadStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.items)
}

func PublicLead(l *Lead) map[string]any {
	return map[string]any{
		"id":         l.ID,
		"intent":     l.Intent,
		"stage":      l.Stage,
		"created_at": l.CreatedAt,
		"message":    "Request recorded. Sales will follow up from sales@rivicq.com.",
	}
}

package platform

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"strings"
	"sync"
)

var (
	errInvalidEmail   = errors.New("valid work email is required")
	errPaymentNotLive = errors.New("payment adapter is not configured")
	errDuplicateEvent = errors.New("webhook already processed")
	errBadSignature   = errors.New("invalid webhook signature")
)

// PaymentAdapter is the PSP boundary. Card numbers, CVV, and raw PAN must
// never enter this process. The webhook is authoritative for payment events.
type PaymentAdapter interface {
	Configured() bool
	Provider() string
	Checkout(planID, customerEmail string) (map[string]any, error)
	HandleWebhook(eventID, signature string, body []byte) (map[string]any, error)
}

type StubPayments struct {
	mu       sync.Mutex
	seen     map[string]struct{}
	secret   string
	provider string
}

func NewStubPayments() *StubPayments {
	provider := strings.TrimSpace(os.Getenv("RIVICQ_PAYMENTS_PROVIDER"))
	if provider == "" {
		provider = "stub"
	}
	return &StubPayments{
		seen:     make(map[string]struct{}),
		secret:   strings.TrimSpace(os.Getenv("RIVICQ_PAYMENTS_WEBHOOK_SECRET")),
		provider: provider,
	}
}

func (s *StubPayments) Configured() bool {
	return strings.TrimSpace(os.Getenv("RIVICQ_PAYMENTS_WEBHOOK_SECRET")) != "" ||
		strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")) != ""
}

func (s *StubPayments) Provider() string {
	if s.Configured() && s.provider == "stub" {
		return "configured_stub"
	}
	return s.provider
}

func (s *StubPayments) Checkout(planID, customerEmail string) (map[string]any, error) {
	plan, ok := PlanByID(planID)
	if !ok {
		return nil, errors.New("unknown plan")
	}
	if !s.Configured() {
		return map[string]any{
			"status":   "not_configured",
			"plan":     plan.ID,
			"provider": s.Provider(),
			"message":  "Hosted checkout is not live. Request a quote from sales@rivicq.com. Card data is never accepted by RivicQ APIs.",
		}, nil
	}
	return nil, errPaymentNotLive
}

func (s *StubPayments) HandleWebhook(eventID, signature string, body []byte) (map[string]any, error) {
	if !s.Configured() {
		return nil, errPaymentNotLive
	}
	if s.secret != "" {
		mac := hmac.New(sha256.New, []byte(s.secret))
		_, _ = mac.Write(body)
		expect := hex.EncodeToString(mac.Sum(nil))
		if !hmac.Equal([]byte(strings.ToLower(strings.TrimSpace(signature))), []byte(strings.ToLower(expect))) {
			return nil, errBadSignature
		}
	}
	eventID = strings.TrimSpace(eventID)
	if eventID == "" {
		return nil, errors.New("event id required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.seen[eventID]; ok {
		return nil, errDuplicateEvent
	}
	s.seen[eventID] = struct{}{}
	return map[string]any{
		"status":   "accepted",
		"event_id": eventID,
		"provider": s.Provider(),
		"message":  "Webhook stored. Entitlements update only after a real PSP event is verified.",
	}, nil
}

func PaymentStatus(p PaymentAdapter) map[string]any {
	return map[string]any{
		"provider":              p.Provider(),
		"configured":            p.Configured(),
		"stores_card_data":      false,
		"frontend_trusted":      false,
		"webhook_authoritative": true,
		"plans":                 Catalog(),
		"message":               "Never send PAN/CVV to RivicQ. Use a provider-hosted checkout when the adapter is live.",
	}
}

// Package server exposes a minimal, inert Stripe HTTP handler for the pivot.
//
// WARNING: this code is NOT wired into the running application. It is provided
// as a concrete migration target. To wire it, register the handlers in the Gin
// router (see cmd/server/oss/main.go) and ensure stripe-go is imported.
//
// Dependencies:
//   - github.com/stripe/stripe-go/v81 (checkout, webhook)
//   - github.com/gin-gonic/gin (when wrapping with gin.WrapF)
//
// Notes:
//   - Never logs the raw webhook body before verification; read raw bytes.
//   - Verification is mandatory (STRIPE_WEBHOOK_SECRET). Reject unsigned requests.
//   - No card data is read or stored. Use Stripe Checkout only.

package server

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
)

const (
	contentTypeJSON = "application/json"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// CheckoutRequest is the minimum payload expected by the checkout endpoint.
type CheckoutRequest struct {
	PriceID string `json:"priceId"`
	Tenant  string `json:"tenantId"`
	Email   string `json:"email"`
}

// CheckoutResponse contains the Stripe Checkout URL.
type CheckoutResponse struct {
	URL string `json:"url"`
}

// CheckoutHandler creates a Stripe Checkout Session (subscription) and returns
// its URL. It expects STRIPE_SECRET_KEY to be set.
func CheckoutHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", contentTypeJSON)
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}
	stripeKey := env("STRIPE_SECRET_KEY", "")
	if stripeKey == "" {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "stripe not configured"})
		return
	}
	var req CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
		return
	}
	appURL := env("APP_URL", "http://localhost:3000")
	successURL := env("STRIPE_SUCCESS_URL", appURL+"/billing/success")
	cancelURL := env("STRIPE_CANCEL_URL", appURL+"/billing/cancel")
	if req.PriceID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "priceId required"})
		return
	}
	// Real implementation uses stripe-go:
	//
	//   sc := &stripe.CheckoutSessionParams{
	//     Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
	//     SuccessURL:        stripe.String(successURL),
	//     CancelURL:         stripe.String(cancelURL),
	//     LineItems:         []*stripe.CheckoutSessionLineItemParams{{Price: stripe.String(req.PriceID), Quantity: stripe.Int64(1)}},
	//     ClientReferenceID: stripe.String(req.Tenant),
	//     CustomerEmail:     stripe.String(req.Email),
	//     Metadata:          map[string]string{"tenantId": req.Tenant},
	//   }
	//   s, err := session.New(sc, &stripe.BackendConfig{SecretKey: stripeKey})
	//   ...
	//   w.WriteHeader(http.StatusCreated)
	//   _ = json.NewEncoder(w).Encode(CheckoutResponse{URL: s.URL})
	w.WriteHeader(http.StatusNotImplemented)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "not wired; use official stripe-go checkout.SessionNew"})
}

// WebhookHandler verifies the Stripe signature and records the event. The raw
// body is read for verification; never decode JSON before webhook.ConstructEvent.
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", contentTypeJSON)
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		return
	}
	whSecret := env("STRIPE_WEBHOOK_SECRET", "")
	if whSecret == "" {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "webhook not configured"})
		return
	}
	const maxBody = 10 << 20 // 10MB
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBody))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid body"})
		return
	}
	sig := r.Header.Get("Stripe-Signature")
	if sig == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing stripe-signature"})
		return
	}
	// Real implementation:
	//   event, err := webhook.ConstructEvent(body, sig, whSecret)
	//   if err != nil {
	//     w.WriteHeader(http.StatusBadRequest)
	//     _ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid signature"})
	//     return
	//   }
	//   idempotently record event.ID and event.Type; forward to Convex or audit log.
	_ = body
	_ = sig
	w.WriteHeader(http.StatusNotImplemented)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "not wired; verify with stripe-go webhook.ConstructEvent"})
}

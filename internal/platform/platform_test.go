package platform

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

func setupPlatform(t *testing.T) (*gin.Engine, *auth.AuthService) {
	t.Helper()
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")
	t.Setenv("DISCORD_WEBHOOK_URL", "")
	t.Setenv("RIVICQ_PAYMENTS_WEBHOOK_SECRET", "")
	t.Setenv("STRIPE_SECRET_KEY", "")
	gin.SetMode(gin.TestMode)
	store, err := auth.NewMockUserStore()
	require.NoError(t, err)
	svc := auth.NewAuthService("test-secret", store)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupRoutes(g, logrus.New(), svc, nil)
	return r, svc
}

func TestPlansAreConfigurationDriven(t *testing.T) {
	r, _ := setupPlatform(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/platform/plans", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	plans, _ := resp["plans"].([]any)
	require.GreaterOrEqual(t, len(plans), 6)
}

func TestLeadCaptureRejectsBadEmailAndHidesAddressOnCreate(t *testing.T) {
	r, _ := setupPlatform(t)
	body, _ := json.Marshal(map[string]string{"email": "not-an-email", "company": "Acme"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/leads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusBadRequest, w.Code)

	okBody, _ := json.Marshal(map[string]string{
		"name": "Dana", "email": "dana@example.com", "company": "Example GmbH", "intent": "poc",
	})
	okReq := httptest.NewRequest(http.MethodPost, "/api/v1/leads", bytes.NewReader(okBody))
	okReq.Header.Set("Content-Type", "application/json")
	okW := httptest.NewRecorder()
	r.ServeHTTP(okW, okReq)
	require.Equal(t, http.StatusCreated, okW.Code)
	var created map[string]any
	require.NoError(t, json.Unmarshal(okW.Body.Bytes(), &created))
	_, hasEmail := created["email"]
	require.False(t, hasEmail, "public create response must not echo the mailbox")
	require.Equal(t, "poc", created["intent"])
}

func TestLeadsListRequiresAdmin(t *testing.T) {
	r, _ := setupPlatform(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/leads", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestIBMSnapshotDoesNotInventAPIs(t *testing.T) {
	r, _ := setupPlatform(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/ibm", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Equal(t, false, resp["ibm_apis_connected"])
	require.Equal(t, false, resp["marketplace_live"])
	cosell, _ := resp["cosell_records"].([]any)
	require.Empty(t, cosell)
}

func TestCheckoutDoesNotAcceptCards(t *testing.T) {
	r, _ := setupPlatform(t)
	body, _ := json.Marshal(map[string]string{"plan_id": "startup", "email": "billing@example.com"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/billing/checkout", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Equal(t, "not_configured", resp["status"])
}

func TestPaymentWebhookIdempotentWhenConfigured(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")
	t.Setenv("RIVICQ_PAYMENTS_WEBHOOK_SECRET", "whsec_test")
	gin.SetMode(gin.TestMode)
	store, err := auth.NewMockUserStore()
	require.NoError(t, err)
	svc := auth.NewAuthService("test-secret", store)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupRoutes(g, logrus.New(), svc, nil)

	payload := []byte(`{"type":"payment_succeeded"}`)
	mac := hmac.New(sha256.New, []byte("whsec_test"))
	_, _ = mac.Write(payload)
	sig := hex.EncodeToString(mac.Sum(nil))

	post := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/billing/webhooks", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Webhook-Event-Id", "evt_1")
		req.Header.Set("X-Webhook-Signature", sig)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	first := post()
	require.Equal(t, http.StatusOK, first.Code)
	second := post()
	require.Equal(t, http.StatusOK, second.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(second.Body.Bytes(), &resp))
	require.Equal(t, "duplicate", resp["status"])
}

func TestSafeFieldsStripsEmailAndSecrets(t *testing.T) {
	out := SafeFields(map[string]string{
		"email":   "hidden@example.com",
		"company": "Example GmbH",
		"api_key": "sk_live_secret",
		"intent":  "poc",
		"notes":   "reach us at sales@rivicq.com please",
	})
	require.Equal(t, "Example GmbH", out["company"])
	require.Equal(t, "poc", out["intent"])
	_, hasEmail := out["email"]
	require.False(t, hasEmail)
	_, hasKey := out["api_key"]
	require.False(t, hasKey)
	_, hasNotes := out["notes"]
	require.False(t, hasNotes)
}

func TestFunnelHasNoSeededDeals(t *testing.T) {
	r, _ := setupPlatform(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/platform/funnel", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	opps, _ := resp["opportunities"].([]any)
	require.Empty(t, opps)
	stages, _ := resp["stages"].([]any)
	require.Contains(t, stages, "poc")
	require.Contains(t, stages, "customer")
}

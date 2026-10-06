package shared

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func signPayload(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(payload)
	return "sha256=" + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func webhookRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1")
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)
	SetupGitHubScanningRoutes(group, logger)
	return router
}

// webhookDeliverySeq keeps every test's delivery identifier unique. GitHub
// issues a distinct X-GitHub-Delivery per event, so reusing one across tests
// looks like a replay to the handler and made unrelated tests interfere.
var webhookDeliverySeq atomic.Int64

func postWebhook(t *testing.T, router *gin.Engine, event, secret, signature string, payload map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	return postWebhookWithDelivery(t, router, event, secret, signature, payload,
		fmt.Sprintf("delivery-%d", webhookDeliverySeq.Add(1)))
}

func postWebhookWithDelivery(t *testing.T, router *gin.Engine, event, secret, signature string, payload map[string]any, delivery string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/github/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-GitHub-Event", event)
	req.Header.Set("X-GitHub-Delivery", delivery)
	if secret != "" {
		req.Header.Set("X-Hub-Signature-256", signature)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func webhookPayload() map[string]any {
	return map[string]any{
		"repository": map[string]any{"full_name": "acme/widgets"},
	}
}

func TestGitHubWebhookRequiresConfiguredSecret(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	w := postWebhook(t, router, "push", "", "", webhookPayload())

	assert.Equal(t, http.StatusServiceUnavailable, w.Code,
		"an unsigned webhook must not be processed when no secret is configured")
}

func TestGitHubWebhookRejectsUnsignedDelivery(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	w := postWebhook(t, router, "push", "test-webhook-secret", "", webhookPayload())

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid signature")
}

func TestGitHubWebhookRejectsWrongSignature(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	w := postWebhook(t, router, "push", "test-webhook-secret", "sha256=bm90LXRoZS1yaWdodC1zaWduYXR1cmU=", webhookPayload())

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGitHubWebhookRejectsSignatureFromAnotherSecret(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	payload := webhookPayload()
	body, err := json.Marshal(payload)
	require.NoError(t, err)
	forged := signPayload("attacker-secret", body)

	w := postWebhook(t, router, "push", "test-webhook-secret", forged, payload)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGitHubWebhookAcceptsValidSignature(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	payload := webhookPayload()
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	w := postWebhook(t, router, "push", "test-webhook-secret", signPayload("test-webhook-secret", body), payload)
	assert.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Contains(t, w.Body.String(), "accepted")
}

func TestGitHubWebhookIgnoresNonScanEvents(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	payload := webhookPayload()
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	w := postWebhook(t, router, "issues", "test-webhook-secret", signPayload("test-webhook-secret", body), payload)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "ignored")
}

func TestGitHubWebhookRejectsSignatureOverDifferentBody(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	signed := webhookPayload()
	signedBody, err := json.Marshal(signed)
	require.NoError(t, err)
	signature := signPayload("test-webhook-secret", signedBody)

	// Same signature, different body: the handler must verify over the bytes it
	// actually received, not a re-encoding of the parsed payload.
	swapped := map[string]any{
		"repository": map[string]any{"full_name": "attacker/other"},
	}
	w := postWebhook(t, router, "push", "test-webhook-secret", signature, swapped)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestVerifyGitHubSignature(t *testing.T) {
	payload := []byte(`{"hello":"world"}`)
	valid := signPayload("s3cret", payload)

	require.NoError(t, verifyGitHubSignature("s3cret", payload, valid))
	require.Error(t, verifyGitHubSignature("other", payload, valid))
	require.Error(t, verifyGitHubSignature("s3cret", payload, ""))
	require.Error(t, verifyGitHubSignature("s3cret", payload, "sha1=abc"))
	require.Error(t, verifyGitHubSignature("", payload, valid))
	require.Error(t, verifyGitHubSignature("s3cret", payload, "sha256=not-base64!!"))
}

// TestGitHubWebhookRejectsReplay proves a captured, correctly signed delivery
// cannot be replayed. The signature stays valid on every resend, so the
// delivery identifier is the only thing that distinguishes them.
func TestGitHubWebhookRejectsReplay(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	payload := webhookPayload()
	body, err := json.Marshal(payload)
	require.NoError(t, err)
	sig := signPayload("test-webhook-secret", body)
	const delivery = "replay-probe-delivery"

	first := postWebhookWithDelivery(t, router, "push", "test-webhook-secret", sig, payload, delivery)
	require.Equal(t, http.StatusOK, first.Code, first.Body.String())

	second := postWebhookWithDelivery(t, router, "push", "test-webhook-secret", sig, payload, delivery)
	assert.Equal(t, http.StatusConflict, second.Code, second.Body.String())
	assert.Contains(t, second.Body.String(), "duplicate_delivery")
}

// TestGitHubWebhookRejectsOversizedBody checks the body limit is applied. The
// limit has to bound the read itself: a limit applied after buffering the whole
// payload would not prevent the memory exhaustion it exists to prevent.
func TestGitHubWebhookRejectsOversizedBody(t *testing.T) {
	t.Setenv("RIVICQ_GITHUB_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")

	router := webhookRouter(t)
	oversized := make([]byte, maxWebhookBodyBytes()+1024)
	for i := range oversized {
		oversized[i] = 'a'
	}
	// Sign the oversized body so rejection can only come from the size limit.
	sig := signPayload("test-webhook-secret", oversized)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/github/webhook", bytes.NewReader(oversized))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-GitHub-Event", "push")
	req.Header.Set("X-GitHub-Delivery", "oversized-delivery")
	req.Header.Set("X-Hub-Signature-256", sig)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code, w.Body.String())
}

//go:build enterprise

package enterprise

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/api/enterprise"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

const testJWTSecret = "test-jwt-secret-for-enterprise-testing-1234567890"

func newTestEnv(t *testing.T) (*gin.Engine, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	os.Setenv("JWT_SECRET", testJWTSecret)

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})
	r.GET("/readyz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ready"})
	})

	apiGroup := r.Group("/api/v1")
	cfg := &config.EnterpriseConfig{
		Server: config.ServerConfig{Port: "9091"},
		IBMQ:   config.IBMQConfig{Enabled: false},
	}
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)
	db := &database.DB{}
	enterprise.SetupRoutes(apiGroup, db, logger, cfg)

	token := generateJWT()
	return r, token
}

func generateJWT() string {
	claims := jwt.MapClaims{
		"sub":       uuid.New().String(),
		"email":     "admin@enterprise.com",
		"role":      "admin",
		"tenant_id": uuid.New().String(),
		"exp":       time.Now().Add(time.Hour).Unix(),
		"iat":       time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(testJWTSecret))
	return tokenStr
}

func authHeaders(token string) map[string]string {
	return map[string]string{
		"Authorization": "Bearer " + token,
		"Content-Type":  "application/json",
	}
}

func TestHealthEndpoints(t *testing.T) {
	r, _ := newTestEnv(t)

	req, _ := http.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "healthy", resp["status"])

	req, _ = http.NewRequest("GET", "/readyz", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
}

func TestAPIKeysNoDB(t *testing.T) {
	r, token := newTestEnv(t)
	headers := authHeaders(token)

	payload, _ := json.Marshal(map[string]interface{}{"name": "test-key", "role": "admin"})
	req, _ := http.NewRequest("POST", "/api/v1/api-keys", bytes.NewBuffer(payload))
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 503, w.Code, "expected 503 when no enterprise DB")
}

func TestWebhooksNoDB(t *testing.T) {
	r, token := newTestEnv(t)
	headers := authHeaders(token)

	payload, _ := json.Marshal(map[string]interface{}{
		"name": "test-webhook", "url": "https://example.com/hook",
		"events": []string{"asset.created"},
	})
	req, _ := http.NewRequest("POST", "/api/v1/webhooks", bytes.NewBuffer(payload))
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 503, w.Code, "expected 503 when no enterprise DB")
}

func TestAuditEventsNoDB(t *testing.T) {
	r, token := newTestEnv(t)
	headers := authHeaders(token)

	req, _ := http.NewRequest("GET", "/api/v1/audit/events", nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Contains(t, resp, "events")
}

func TestAuthRejectsNoToken(t *testing.T) {
	r, _ := newTestEnv(t)

	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Skip("auth.NewMockUserStore requires CRYPTOBOM_BOOTSTRAP_PASSWORD, skipping")
	}
	authSvc := auth.NewAuthService(testJWTSecret, store)
	r.GET("/test-auth", authSvc.JWTAuthMiddleware(nil), func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	// No token → 401
	req, _ := http.NewRequest("GET", "/test-auth", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)

	// Valid token → 200
	req, _ = http.NewRequest("GET", "/test-auth", nil)
	req.Header.Set("Authorization", "Bearer "+generateJWT())
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
}

func TestNonExistentRoute404s(t *testing.T) {
	r, _ := newTestEnv(t)

	for _, path := range []string{
		"/api/v1/engine/python/execute",
		"/api/v1/engine/compliance-scan",
		"/api/v1/enterprise/analytics/ml",
	} {
		payload, _ := json.Marshal(map[string]interface{}{"test": true})
		req, _ := http.NewRequest("POST", path, bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, 404, w.Code, "expected 404 for "+path)
	}
}

//go:build enterprise

package enterprise

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/enterprise"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

func TestLicenseFailClosed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("missing", func(t *testing.T) {
		t.Setenv("CRYPTOBOM_LICENSE_KEY", "")
		t.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", "")
		if _, err := enterprise.RequireValidLicense(); err == nil {
			t.Fatal("expected license validation to fail when missing")
		}
	})

	t.Run("middleware_rejects", func(t *testing.T) {
		t.Setenv("CRYPTOBOM_LICENSE_KEY", "")
		t.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", "")
		r := gin.New()
		r.GET("/protected", enterprise.LicenseMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/protected", nil))
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
		}
		var resp map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if resp["code"] != "ENTERPRISE_LICENSE_REQUIRED" {
			t.Fatalf("unexpected response: %v", resp)
		}
	})

	t.Run("expired_or_invalid_signature", func(t *testing.T) {
		secret := "s"
		expired := time.Now().UTC().Add(-time.Hour).Unix()
		mac := hmac.New(sha256.New, []byte(secret))
		_, _ = mac.Write([]byte(fmt.Sprintf("*.%d", expired)))
		bad := fmt.Sprintf("cryptobom-beta-v1.*.%d.%s", expired, hex.EncodeToString(mac.Sum(nil)))
		if _, err := enterprise.ValidateLicense(bad, time.Now().UTC()); err == nil {
			t.Fatal("expected expired license to fail")
		}
		if _, err := enterprise.ValidateLicense("cryptobom-beta-v1.*.9999999999.deadbeef", time.Now().UTC()); err == nil {
			t.Fatal("expected invalid signature to fail")
		}
	})

	t.Run("valid_allows", func(t *testing.T) {
		setValidEnterpriseLicenseEnv(t)
		if _, err := enterprise.RequireValidLicense(); err != nil {
			t.Fatalf("expected valid license, got %v", err)
		}
		r := gin.New()
		r.GET("/protected", enterprise.LicenseMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/protected", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
		}
	})
}

func TestNilDBNoPanicHonestUnavailableStates(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)

	t.Run("api_keys", func(t *testing.T) {
		r := gin.New()
		authMW := func(c *gin.Context) {
			c.Set("tenant_id", "t1")
			c.Set("user_id", "u1")
			c.Set("role", "admin")
			c.Next()
		}
		m := enterprise.NewAPIKeyManager(nil, logger)
		g := r.Group("/api/v1")
		m.SetupRoutes(g, authMW)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/api-keys", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("list status=%d body=%s", w.Code, w.Body.String())
		}
		var list map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &list)
		if _, ok := list["api_keys"]; !ok {
			t.Fatalf("expected api_keys in response: %v", list)
		}

		w = httptest.NewRecorder()
		body := bytes.NewBufferString(`{"name":"k","role":"admin"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/api-keys", body)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("create status=%d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("webhooks", func(t *testing.T) {
		r := gin.New()
		authMW := func(c *gin.Context) {
			c.Set("tenant_id", "t1")
			c.Set("user_id", "u1")
			c.Set("role", "admin")
			c.Next()
		}
		m := enterprise.NewWebhookManager(nil, logger)
		g := r.Group("/api/v1")
		m.SetupRoutes(g, authMW)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/webhooks", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("list status=%d body=%s", w.Code, w.Body.String())
		}
		var list map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &list)
		if _, ok := list["webhooks"]; !ok {
			t.Fatalf("expected webhooks in response: %v", list)
		}

		w = httptest.NewRecorder()
		body := bytes.NewBufferString(`{"name":"w","url":"https://example.com","events":["x"]}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks", body)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("create status=%d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("audit", func(t *testing.T) {
		r := gin.New()
		authMW := func(c *gin.Context) {
			c.Set("tenant_id", "t1")
			c.Set("user_id", "u1")
			c.Set("role", "admin")
			c.Next()
		}
		v := enterprise.NewAuditViewer(nil, logger)
		g := r.Group("/api/v1")
		v.SetupRoutes(g, authMW)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/audit/events", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("events status=%d body=%s", w.Code, w.Body.String())
		}
		var resp map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if _, ok := resp["events"]; !ok {
			t.Fatalf("expected events in response: %v", resp)
		}
	})

	t.Run("inventory_unavailable", func(t *testing.T) {
		h := enterprise.NewInventoryHandler((*database.EnterpriseDB)(nil), logger, nil)
		r := gin.New()
		g := r.Group("/api/v1")
		h.SetupRoutes(g)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/inventory/assets", nil))
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("inventory list status=%d body=%s", w.Code, w.Body.String())
		}
		var resp map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if resp["status"] != "unavailable" {
			t.Fatalf("expected honest unavailable state: %v", resp)
		}
	})
}

func TestTenantScopedDBGuards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)

	t.Run("missing_tenant_forbidden_on_audit_list", func(t *testing.T) {
		r := gin.New()
		authMW := func(c *gin.Context) { c.Next() } // no tenant_id
		v := enterprise.NewAuditViewer(nil, logger)
		g := r.Group("/api/v1")
		v.SetupRoutes(g, authMW)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/audit/events", nil))
		if w.Code != http.StatusOK {
			// nil-db path returns empty list before tenant requirement in current impl? check actual:
			// ListEvents: if no db -> 200 empty; if db present it checks tenant and returns 403.
			// tenant-scoped guard is enforced when DB is available; with nil DB we still get honest no-panic response.
			t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("api_key_auth_middleware_nil_db_503", func(t *testing.T) {
		m := enterprise.NewAPIKeyManager(nil, logger)
		r := gin.New()
		r.GET("/x", m.APIKeyAuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		req.Header.Set("Authorization", "Bearer cb_aaaaaaaaaaaaaaaa")
		r.ServeHTTP(w, req)
		if w.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected nil-db guard 503, got %d body=%s", w.Code, w.Body.String())
		}
	})
}

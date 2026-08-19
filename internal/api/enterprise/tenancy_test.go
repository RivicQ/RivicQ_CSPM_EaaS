package enterprise

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestTenantIDForIgnoresSpoofedHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c.Request.Header.Set("X-Tenant-ID", "malicious-tenant")

	if got := tenantIDFor(c); got != enterpriseDefaultTenant {
		t.Fatalf("spoofed header must not win, got %q", got)
	}

	c.Set("tenant_id", "jwt-tenant")
	if got := tenantIDFor(c); got != "jwt-tenant" {
		t.Fatalf("JWT tenant must win, got %q", got)
	}
}

func TestJWTTenantOrAbort(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c.Request.Header.Set("X-Tenant-ID", "malicious-tenant")

	if _, ok := jwtTenantOrAbort(c); ok {
		t.Fatal("expected abort without JWT tenant")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("status %d", w.Code)
	}

	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c2.Set("tenant_id", "tenant-a")
	got, ok := jwtTenantOrAbort(c2)
	if !ok || got != "tenant-a" {
		t.Fatalf("got %q ok=%v", got, ok)
	}
}

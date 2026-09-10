package tenant_test

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
)

func TestDefaultTenantResolver_ReturnsPublicWhenUnauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := tenant.NewDefaultTenantResolver()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/", nil)

	got, err := r.Resolve(c)
	if err != nil {
		t.Fatalf("Resolve returned unexpected error: %v", err)
	}
	if got != tenant.PublicTenantID {
		t.Errorf("expected tenant %q, got %q", tenant.PublicTenantID, got)
	}
}

func TestDefaultTenantResolver_IgnoresSpoofedHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := tenant.NewDefaultTenantResolver()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Tenant-ID", "malicious-tenant")
	c.Request = req

	got, err := r.Resolve(c)
	if err != nil {
		t.Fatalf("Resolve returned unexpected error: %v", err)
	}
	if got != tenant.PublicTenantID {
		t.Errorf("must ignore X-Tenant-ID, expected %q, got %q", tenant.PublicTenantID, got)
	}
}

func TestDefaultTenantResolver_UsesJWTClaim(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := tenant.NewDefaultTenantResolver()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/", nil)
	c.Request.Header.Set("X-Tenant-ID", "malicious-tenant")
	c.Set("tenant_id", "jwt-tenant")

	got, err := r.Resolve(c)
	if err != nil {
		t.Fatalf("Resolve returned unexpected error: %v", err)
	}
	if got != "jwt-tenant" {
		t.Errorf("JWT tenant must win, got %q", got)
	}
}

func TestDefaultTenantResolver_ImplementsInterface(t *testing.T) {
	var _ tenant.TenantResolver = (*tenant.DefaultTenantResolver)(nil)
}

func TestNormalize(t *testing.T) {
	if tenant.Normalize("") != tenant.PublicTenantID {
		t.Fatal("empty must map to public tenant")
	}
	if tenant.Normalize("  acme  ") != "acme" {
		t.Fatal("trim failed")
	}
}

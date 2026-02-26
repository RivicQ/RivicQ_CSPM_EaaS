package tenant_test

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
)

func TestDefaultTenantResolver_ReturnsDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := tenant.NewDefaultTenantResolver()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/", nil)

	got, err := r.Resolve(c)
	if err != nil {
		t.Fatalf("Resolve returned unexpected error: %v", err)
	}
	if got != "default" {
		t.Errorf("expected tenant %q, got %q", "default", got)
	}
}

func TestDefaultTenantResolver_AlwaysReturnsDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := tenant.NewDefaultTenantResolver()

	// Even if X-Tenant-ID header is set, OSS resolver must return "default".
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Tenant-ID", "malicious-tenant")
	c.Request = req

	got, err := r.Resolve(c)
	if err != nil {
		t.Fatalf("Resolve returned unexpected error: %v", err)
	}
	if got != "default" {
		t.Errorf("OSS TenantResolver must always return %q regardless of headers, got %q", "default", got)
	}
}

func TestDefaultTenantResolver_ImplementsInterface(t *testing.T) {
	// Compile-time check: DefaultTenantResolver implements TenantResolver.
	var _ tenant.TenantResolver = (*tenant.DefaultTenantResolver)(nil)
}

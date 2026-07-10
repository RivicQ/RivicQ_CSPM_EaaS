// Package tenant provides tenant resolution for CryptoBOM SaaS.
package tenant

import (
	"github.com/gin-gonic/gin"
)

// TenantResolver resolves the tenant for a request.
type TenantResolver interface {
	Resolve(c *gin.Context) (string, error)
}

// DefaultTenantResolver resolves tenant from JWT claims set by auth middleware.
// This works for both OSS and Enterprise — the JWT middleware sets tenant_id
// on the context after token validation, preventing header-spoofing attacks.
type DefaultTenantResolver struct{}

// NewDefaultTenantResolver returns a new DefaultTenantResolver.
func NewDefaultTenantResolver() *DefaultTenantResolver {
	return &DefaultTenantResolver{}
}

// Resolve extracts the tenant_id from the JWT claims stored in the gin context.
// This is set by auth.JWTAuthMiddleware after token validation.
// Falls back to "default" if not present (e.g. public endpoints).
func (r *DefaultTenantResolver) Resolve(c *gin.Context) (string, error) {
	tenantID := c.GetString("tenant_id")
	if tenantID != "" {
		return tenantID, nil
	}
	return "default", nil
}

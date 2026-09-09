// Package tenant provides tenant resolution for CryptoBOM SaaS.
package tenant

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// PublicTenantID is the workspace for unauthenticated Community traffic
// (Home CBOM pilot, local demo). JWT tenant_id always wins when present.
// The X-Tenant-ID header is never a source of truth.
const PublicTenantID = "00000000-0000-0000-0000-000000000001"

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

// Normalize returns PublicTenantID when tenantID is empty.
func Normalize(tenantID string) string {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return PublicTenantID
	}
	return tenantID
}

// Resolve extracts the tenant from JWT/API-key context (c.GetString("tenant_id")).
// Unauthenticated requests map to PublicTenantID so the Home CBOM pilot still works.
// Spoofable headers are ignored.
func Resolve(c *gin.Context) string {
	if c == nil {
		return PublicTenantID
	}
	return Normalize(c.GetString("tenant_id"))
}

// Resolve extracts the tenant_id from the JWT claims stored in the gin context.
// This is set by auth.JWTAuthMiddleware / OptionalJWTAuthMiddleware after token validation.
func (r *DefaultTenantResolver) Resolve(c *gin.Context) (string, error) {
	return Resolve(c), nil
}

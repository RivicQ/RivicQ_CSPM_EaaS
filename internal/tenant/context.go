// Package tenant provides tenant resolution for CryptoBOM SaaS.
package tenant

import (
	"github.com/gin-gonic/gin"
)

// TenantResolver resolves the tenant for a request.
// OSS: always returns "default". Enterprise: resolves from JWT + DB.
type TenantResolver interface {
	// Resolve returns the tenant identifier for the current request.
	// It must never return an empty string; use "default" as the OSS fallback.
	Resolve(c *gin.Context) (string, error)
}

// DefaultTenantResolver is the OSS implementation of TenantResolver.
// It always returns "default", making CryptoBOM operate in single-tenant mode.
//
// Enterprise builds replace this with a resolver that reads the tenant from a
// validated JWT claim and looks it up in the tenants database table.
type DefaultTenantResolver struct{}

// NewDefaultTenantResolver returns a new DefaultTenantResolver.
func NewDefaultTenantResolver() *DefaultTenantResolver {
	return &DefaultTenantResolver{}
}

// Resolve always returns "default" in the OSS build.
// The gin.Context is accepted as part of the TenantResolver interface contract to allow
// enterprise implementations to extract tenant information from JWT claims or request
// headers; the OSS resolver intentionally ignores all context and header values to
// prevent X-Tenant-ID header-spoofing attacks.
func (r *DefaultTenantResolver) Resolve(_ *gin.Context) (string, error) {
	return "default", nil
}

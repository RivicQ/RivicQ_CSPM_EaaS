package enterprise

import "github.com/gin-gonic/gin"

// tenantIDFor resolves the tenant for the current request. It prefers the JWT
// tenant claim (set by the auth middleware), then the X-Tenant-ID header, and
// finally falls back to the platform default tenant. Callers that need strict
// tenant isolation should reject requests without an explicit tenant rather
// than rely on the fallback.
func tenantIDFor(c *gin.Context) string {
	if tenant := c.GetString("tenant_id"); tenant != "" {
		return tenant
	}
	if tenant := c.GetHeader("X-Tenant-ID"); tenant != "" {
		return tenant
	}
	return enterpriseDefaultTenant
}

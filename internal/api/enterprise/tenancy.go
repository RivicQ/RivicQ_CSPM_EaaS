package enterprise

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// tenantIDFor resolves the tenant for unauthenticated or read-mostly handlers.
// JWT tenant claims win. The X-Tenant-ID header is ignored (it is spoofable).
// Callers that mutate tenant data must use jwtTenantOrAbort instead of this fallback.
func tenantIDFor(c *gin.Context) string {
	if tenant := c.GetString("tenant_id"); tenant != "" {
		return tenant
	}
	return enterpriseDefaultTenant
}

// jwtTenantOrAbort returns the JWT/API-key tenant or writes 403 and false.
func jwtTenantOrAbort(c *gin.Context) (string, bool) {
	tenant := c.GetString("tenant_id")
	if tenant == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "tenant context required"})
		return "", false
	}
	return tenant, true
}

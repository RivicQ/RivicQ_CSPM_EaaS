package enterprise

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
)

// standardDBReady reports whether the standard database wrapper carries a live
// handle. A zero-value database.DB passes a nil check and then panics later.
func standardDBReady(db *database.DB) bool {
	return db != nil && db.DB != nil
}

// enterpriseDBReady reports whether the wrapper carries a live handle.
//
// Checking only `db == nil` is not enough: a zero-value database.EnterpriseDB
// passes that test and then panics on the nil *sql.DB, which turns a dependency
// outage into a 500 with a stack trace instead of an honest 503.
func enterpriseDBReady(db *database.EnterpriseDB) bool {
	return db != nil && db.DB != nil
}

// abortIfNoDB writes 503 and reports false when the database is unusable.
func abortIfNoDB(c *gin.Context, db *database.EnterpriseDB) bool {
	if enterpriseDBReady(db) {
		return true
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
	return false
}

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

// mutatingTenantIDFor resolves the tenant for a handler that writes tenant data,
// and fails closed when the request carries an identity but no tenant.
//
// tenantIDFor falls back to a shared default tenant, which is right for an
// anonymous demo read and wrong for a write: a token that authenticates a user
// without naming a tenant would otherwise deposit data into the default tenant,
// where it becomes visible to every other unauthenticated caller of the same
// endpoint. That is cross-tenant contamination reached without any attacker
// effort, so it is refused rather than defaulted.
//
// The distinction is intentional:
//
//   - tenant claim present: use it.
//   - authenticated but no tenant: 403. The token is malformed or was minted
//     before tenancy existed; guessing is not safe.
//   - no identity at all (demo/fabricated mode): the default tenant, because
//     there is no real party to protect from.
func mutatingTenantIDFor(c *gin.Context) (string, bool) {
	if tenant := c.GetString("tenant_id"); tenant != "" {
		return tenant, true
	}
	if c.GetString("user_id") != "" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "tenant_context_required",
			"message": "The authenticated identity does not specify a tenant.",
		})
		return "", false
	}
	return enterpriseDefaultTenant, true
}

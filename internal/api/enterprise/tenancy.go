package enterprise

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
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
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"error":  "enterprise database unavailable",
		"status": "unavailable",
		"source": "unconfigured",
	})
	return false
}

// tenantIDFor resolves the tenant for unauthenticated or read-mostly handlers.
// JWT/API-key tenant claims win. Spoofable headers are ignored.
func tenantIDFor(c *gin.Context) string {
	return tenant.Resolve(c)
}

// jwtTenantOrAbort returns the JWT/API-key tenant or writes 403 and false.
func jwtTenantOrAbort(c *gin.Context) (string, bool) {
	t := c.GetString("tenant_id")
	if t == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "tenant context required"})
		return "", false
	}
	return t, true
}

// mutatingTenantIDFor resolves the tenant for a handler that writes tenant data,
// and fails closed when the request carries an identity but no tenant.
func mutatingTenantIDFor(c *gin.Context) (string, bool) {
	if t := c.GetString("tenant_id"); t != "" {
		return t, true
	}
	if c.GetString("user_id") != "" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "tenant_context_required",
			"message": "The authenticated identity does not specify a tenant.",
		})
		return "", false
	}
	return tenant.PublicTenantID, true
}

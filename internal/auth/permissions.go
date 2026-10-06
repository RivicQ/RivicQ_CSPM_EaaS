package auth

import (
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

// Permission is a server-side authorization capability. Frontend role checks are
// UX only; these constants are the authorization boundary.
type Permission string

const (
	PermCBOMRead   Permission = "cbom:read"
	PermCBOMWrite  Permission = "cbom:write"
	PermCBOMDelete Permission = "cbom:delete"

	PermAssetsRead  Permission = "assets:read"
	PermAssetsWrite Permission = "assets:write"

	PermFindingsRead   Permission = "findings:read"
	PermFindingsWrite  Permission = "findings:write"
	PermFindingsIgnore Permission = "findings:ignore"

	PermScansRead  Permission = "scans:read"
	PermScansStart Permission = "scans:start"

	PermPQCRead       Permission = "pqc:read"
	PermPQCAttest     Permission = "pqc:attest"
	PermPQCAdminister Permission = "pqc:administer"

	PermComplianceRead  Permission = "compliance:read"
	PermComplianceWrite Permission = "compliance:write"

	PermReportsRead  Permission = "reports:read"
	PermReportsWrite Permission = "reports:write"

	PermUsersRead     Permission = "users:read"
	PermUsersManage   Permission = "users:manage"
	PermAuditRead     Permission = "audit:read"
	PermAPIKeysRead   Permission = "apikeys:read"
	PermAPIKeysWrite  Permission = "apikeys:write"
	PermWebhooksRead  Permission = "webhooks:read"
	PermWebhooksWrite Permission = "webhooks:write"
	PermCloudRead     Permission = "cloud:read"
	PermCloudManage   Permission = "cloud:manage"
	PermSSOManage     Permission = "sso:manage"
	PermIntegrations  Permission = "integrations:manage"
	PermBillingManage Permission = "billing:manage"
)

// rolePermissions is the single source of truth for server-side authorization.
// Owner/Administrator/Security Manager are aliases of admin; Developer is an
// alias of operator (see roleAliases).
var rolePermissions = map[string][]Permission{
	"admin": {
		PermCBOMRead, PermCBOMWrite, PermCBOMDelete,
		PermAssetsRead, PermAssetsWrite,
		PermFindingsRead, PermFindingsWrite, PermFindingsIgnore,
		PermScansRead, PermScansStart,
		PermPQCRead, PermPQCAttest, PermPQCAdminister,
		PermComplianceRead, PermComplianceWrite,
		PermReportsRead, PermReportsWrite,
		PermUsersRead, PermUsersManage,
		PermAuditRead,
		PermAPIKeysRead, PermAPIKeysWrite,
		PermWebhooksRead, PermWebhooksWrite,
		PermCloudRead, PermCloudManage,
		PermSSOManage, PermIntegrations, PermBillingManage,
	},
	"operator": {
		PermCBOMRead, PermCBOMWrite,
		PermAssetsRead, PermAssetsWrite,
		PermFindingsRead, PermFindingsWrite,
		PermScansRead, PermScansStart,
		PermPQCRead, PermPQCAttest,
		PermComplianceRead,
		PermReportsRead, PermReportsWrite,
		PermUsersRead,
		PermAuditRead,
		PermAPIKeysRead,
		PermWebhooksRead,
		PermCloudRead,
		PermIntegrations, PermBillingManage,
	},
	"analyst": {
		PermCBOMRead,
		PermAssetsRead,
		PermFindingsRead,
		PermScansRead, PermScansStart,
		PermPQCRead,
		PermComplianceRead,
		PermReportsRead, PermReportsWrite,
		PermAuditRead,
		PermCloudRead,
	},
	"viewer": {
		PermCBOMRead,
		PermAssetsRead,
		PermFindingsRead,
		PermScansRead,
		PermPQCRead,
		PermComplianceRead,
		PermReportsRead,
		PermCloudRead,
	},
}

// PermissionsForRole returns the sorted permission set for a role.
// Unknown roles collapse to the viewer set (fail closed).
func PermissionsForRole(role string) []string {
	perms, ok := rolePermissions[NormalizeRole(role)]
	if !ok {
		perms = rolePermissions["viewer"]
	}
	out := make([]string, 0, len(perms))
	for _, p := range perms {
		out = append(out, string(p))
	}
	sort.Strings(out)
	return out
}

// HasPermission reports whether the caller context satisfies the permission.
func HasPermission(c *gin.Context, permission Permission) bool {
	granted, ok := c.Get("permissions")
	if !ok {
		return false
	}
	list, ok := granted.([]string)
	if !ok {
		return false
	}
	for _, p := range list {
		if p == string(permission) {
			return true
		}
	}
	return false
}

// RequirePermission rejects callers that do not hold the permission.
// Must run after JWTAuthMiddleware so `permissions` is on the context.
func RequirePermission(required ...Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, perm := range required {
			if !HasPermission(c, perm) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error":              "insufficient_permissions",
					"required":           string(perm),
					"message":            "Your role does not grant this operation.",
					"request_id":         c.GetString("request_id"),
					"authenticated_role": NormalizeRole(c.GetString("role")),
				})
				return
			}
		}
		c.Next()
	}
}

// PermissionSet is the set of permissions granted to a role, exposed for tests
// and for token issuance.
func PermissionSet(role string) map[string]bool {
	set := make(map[string]bool)
	for _, p := range PermissionsForRole(role) {
		set[strings.ToLower(p)] = true
	}
	return set
}

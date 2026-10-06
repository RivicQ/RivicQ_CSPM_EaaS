package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// This file makes the permission matrix in permissions.go actually reachable
// from HTTP. Until now RequirePermission existed but was called from nowhere,
// so every authenticated role could call every route: a viewer could delete a
// CBOM report, and a developer could mint API keys.
//
// The mapping is deliberately coarse (resource prefix plus HTTP verb) rather
// than one entry per route. A per-route table looks more precise but drifts the
// moment someone adds a route, and drift here is a silent authorization hole.
// Coarse rules are boring and stay correct.
//
// Failure policy:
//   - GET/HEAD: allowed when unmapped. Reads are already tenant-scoped, and
//     denying unknown reads would break the product on every new dashboard.
//   - POST/PUT/PATCH/DELETE: denied when unmapped. An unmapped mutation is a
//     new route someone forgot to authorize, so it fails closed.
// TestRoutePermissionsAreMapped asserts no real mutating route is unmapped, so
// the deny branch only ever fires on genuinely unknown routes.

// resourcePermissions maps a path's first segment to its read, write, and
// delete permissions. An empty write means the resource is read-only. An empty
// del falls back to write, which is right for resources where removing an item
// is no more dangerous than editing it, and wrong for cbom, where deleting a
// report destroys evidence and cbom:delete exists precisely to separate that.
type resourcePermissions struct {
	read  Permission
	write Permission
	del   Permission
}

var resourcePermissionTable = map[string]resourcePermissions{
	"cbom":         {read: PermCBOMRead, write: PermCBOMWrite, del: PermCBOMDelete},
	"reports":      {read: PermReportsRead, write: PermReportsWrite},
	"assets":       {read: PermAssetsRead, write: PermAssetsWrite},
	"findings":     {read: PermFindingsRead, write: PermFindingsWrite},
	"scans":        {read: PermScansRead, write: PermScansStart},
	"pqc":          {read: PermPQCRead, write: PermPQCAttest},
	"compliance":   {read: PermComplianceRead, write: PermComplianceWrite},
	"governance":   {read: PermComplianceRead, write: PermComplianceWrite},
	"controls":     {read: PermComplianceRead, write: PermComplianceWrite},
	"users":        {read: PermUsersRead, write: PermUsersManage},
	"audit":        {read: PermAuditRead, write: ""},
	"apikeys":      {read: PermAPIKeysRead, write: PermAPIKeysWrite},
	"api-keys":     {read: PermAPIKeysRead, write: PermAPIKeysWrite},
	"webhooks":     {read: PermWebhooksRead, write: PermWebhooksWrite},
	"sso":          {read: "", write: PermSSOManage},
	"saml":         {read: "", write: PermSSOManage},
	"ldap":         {read: "", write: PermSSOManage},
	"cloud":        {read: PermCloudRead, write: PermCloudManage},
	"aws":          {read: PermCloudRead, write: PermCloudManage},
	"azure":        {read: PermCloudRead, write: PermCloudManage},
	"gcp":          {read: PermCloudRead, write: PermCloudManage},
	"gke":          {read: PermCloudRead, write: PermCloudManage},
	"kms":          {read: PermCloudRead, write: PermCloudManage},
	"hsm":          {read: PermCloudRead, write: PermCloudManage},
	"hpcs":         {read: PermCloudRead, write: PermCloudManage},
	"cos":          {read: PermCloudRead, write: PermCloudManage},
	"cloudtrail":   {read: PermCloudRead, write: PermCloudManage},
	"integrations": {read: "", write: PermIntegrations},
	"repos":        {read: "", write: PermIntegrations},
	"github":       {read: "", write: PermIntegrations},
	"google":       {read: "", write: PermIntegrations},
	"billing":      {read: "", write: PermBillingManage},
	"events":       {read: "", write: PermFindingsWrite},
	"policies":     {read: PermCBOMRead, write: PermCBOMWrite},
	"intelligence": {read: PermCBOMRead, write: PermCBOMWrite},
	"analytics":    {read: PermReportsRead, write: PermReportsWrite},
	"cilium":       {read: PermComplianceRead, write: PermComplianceWrite},
	"security":     {read: PermFindingsRead, write: PermFindingsWrite},
	"kubernetes":   {read: PermCloudRead, write: PermCloudManage},
	"monitoring":   {read: "", write: PermIntegrations},
}

// exactPathPermissions covers routes whose permission is not a function of
// their first segment, either because they are self-service or because a
// generic segment rule would be wrong for them.
var exactPathPermissions = map[string]Permission{
	// Self-service and public authentication endpoints: a valid session is the
	// only requirement, and most are reachable without one at all.
	"/auth/login":           "",
	"/auth/register":        "",
	"/auth/refresh":         "",
	"/auth/logout":          "",
	"/auth/forgot-password": "",
	"/auth/reset-password":  "",
	"/auth/change-password": "",
	"/auth/mfa/setup":       "",
	"/auth/mfa/verify":      "",
	"/auth/mfa/confirm":     "",
	"/auth/mfa/disable":     "",
	"/auth/me":              "",
	// Changing another user's role is an administrative act.
	"/auth/workspace/users/:id/role": PermUsersManage,

	"/scan":             PermScansStart,
	"/ml-scan":          PermScansStart,
	"/security/ml-scan": PermScansStart,
}

// routePath strips the API mount point and normalizes the remainder, so
// /api/v1/users/42/role is compared as /users/42/role.
func routePath(path string) string {
	if path == APIPrefix {
		return "/"
	}
	if trimmed := strings.TrimPrefix(path, APIPrefix+"/"); trimmed != path {
		path = "/" + trimmed
	}
	if path == "" {
		return "/"
	}
	return path
}

// resourceSegment returns the first path segment, so /users/42/role resolves
// to "users".
func resourceSegment(path string) string {
	path = strings.TrimPrefix(path, "/")
	if i := strings.Index(path, "/"); i >= 0 {
		return path[:i]
	}
	return path
}

// RequiredPermission returns the permission a request needs, and whether the
// route is governed by the permission model at all.
func RequiredPermission(method, path string) (Permission, bool) {
	normalized := strings.TrimSuffix(routePath(path), "/")
	if normalized == "" {
		normalized = "/"
	}

	if perm, ok := exactPathPermissions[normalized]; ok {
		if perm == "" {
			// Self-service: any authenticated principal may call it.
			return "", true
		}
		return perm, true
	}

	perms, ok := resourcePermissionTable[resourceSegment(normalized)]
	if !ok {
		return "", false
	}

	switch method {
	case http.MethodGet, http.MethodHead:
		if perms.read == "" {
			// Read-only-in-name-only: this resource exposes no read permission.
			return "", false
		}
		return perms.read, true
	case http.MethodDelete:
		perm := perms.del
		if perm == "" {
			perm = perms.write
		}
		if perm == "" {
			return "", false
		}
		return perm, true
	default:
		if perms.write == "" {
			return "", false
		}
		return perms.write, true
	}
}

// IsMutatingMethod reports whether a method changes state.
func IsMutatingMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

// RequireRoutePermission enforces the permission model for the request.
//
// It must be installed after EnforceAuth: an unauthenticated request is
// rejected there, and here the caller is known to be authenticated so a
// permission failure is a 403 rather than a 401.
func RequireRoutePermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Public routes are decided by the authentication allow-list. Applying
		// the permission model here would 403 a login or a provider webhook,
		// which has no session and therefore no permissions.
		if IsPublicRoute(c.Request.Method, c.Request.URL.Path) {
			c.Next()
			return
		}

		perm, governed := RequiredPermission(c.Request.Method, c.Request.URL.Path)
		if !governed {
			if IsMutatingMethod(c.Request.Method) {
				// Fail closed on an unmapped mutation.
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error":      "permission_not_defined",
					"message":    "This operation is not covered by the permission model.",
					"method":     c.Request.Method,
					"path":       c.Request.URL.Path,
					"request_id": c.GetString("request_id"),
				})
				return
			}
			c.Next()
			return
		}

		if perm == "" {
			c.Next()
			return
		}

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

		c.Next()
	}
}

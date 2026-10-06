package auth

import (
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

// PublicRoute identifies a route that is reachable without authentication.
// Everything not listed here requires a valid access token.
type PublicRoute struct {
	Method string
	Path   string
}

// APIPrefix is the mount point of the versioned API group that EnforceAuth
// guards. PublicRoutes are written relative to it because that is how the
// routes are registered; the middleware strips this prefix before matching.
const APIPrefix = "/api/v1"

// PublicRoutes is the explicit allow-list of unauthenticated /api/v1 endpoints.
//
// Paths are relative to APIPrefix: "/auth/login" means "/api/v1/auth/login".
//
// It exists so the default is deny: a new route is authenticated unless an
// operator deliberately adds it here. Reviewing this list is the security
// review; there is no "optional auth" mode.
var PublicRoutes = []PublicRoute{
	// Self-service authentication. Each handler is responsible for its own
	// brute-force, enumeration and validation controls.
	{Method: http.MethodPost, Path: "/auth/login"},
	{Method: http.MethodPost, Path: "/auth/register"},
	{Method: http.MethodPost, Path: "/auth/refresh"},
	{Method: http.MethodPost, Path: "/auth/mfa/verify"},
	{Method: http.MethodPost, Path: "/auth/forgot-password"},
	{Method: http.MethodPost, Path: "/auth/reset-password"},
	{Method: http.MethodGet, Path: "/auth/editions"},
	{Method: http.MethodGet, Path: "/auth/providers"},
	{Method: http.MethodGet, Path: "/auth/demo"},

	// OAuth entry and callback. The callback is authenticated by the `state`
	// parameter; the browser cannot carry a bearer token.
	{Method: http.MethodGet, Path: "/auth/google/login"},
	{Method: http.MethodPost, Path: "/auth/google/exchange"},
	{Method: http.MethodGet, Path: "/auth/google/callback"},
	{Method: http.MethodPost, Path: "/auth/google/callback"},
	{Method: http.MethodGet, Path: "/auth/github/login"},
	{Method: http.MethodGet, Path: "/auth/github/callback"},
	{Method: http.MethodPost, Path: "/auth/github/callback"},

	// Public product surface.
	{Method: http.MethodGet, Path: "/platform/status"},
	{Method: http.MethodGet, Path: "/platform/plans"},
	{Method: http.MethodGet, Path: "/platform/funnel"},
	{Method: http.MethodGet, Path: "/platform/contacts"},
	{Method: http.MethodGet, Path: "/ibm"},
	{Method: http.MethodGet, Path: "/billing/status"},
	{Method: http.MethodPost, Path: "/leads"},

	// Webhooks authenticate with a provider signature, not a session token.
	{Method: http.MethodPost, Path: "/billing/webhooks"},
	{Method: http.MethodPost, Path: "/github/webhook"},
}

// publicRouteSet is the compiled lookup used by EnforceAuth.
var publicRouteSet = buildPublicRouteSet()

func buildPublicRouteSet() map[string]bool {
	set := make(map[string]bool, len(PublicRoutes))
	for _, r := range PublicRoutes {
		set[normalizeRoute(r.Method, r.Path)] = true
	}
	return set
}

func normalizeRoute(method, path string) string {
	return strings.ToUpper(strings.TrimSpace(method)) + " " + cleanPath(path)
}

// cleanPath strips a trailing slash so /auth/login/ matches /auth/login.
func cleanPath(p string) string {
	p = strings.TrimSpace(p)
	if len(p) > 1 {
		p = strings.TrimRight(p, "/")
	}
	return p
}

// IsPublicRoute reports whether a request is on the unauthenticated allow-list.
//
// path is the full request path, with or without the API prefix.
func IsPublicRoute(method, path string) bool {
	return IsPublicRouteUnder(method, path, APIPrefix)
}

// IsPublicRouteUnder reports whether a request is public for a group mounted at
// the given prefix.
func IsPublicRouteUnder(method, path, prefix string) bool {
	if prefix == "" {
		prefix = APIPrefix
	}
	return publicRouteSet[normalizeRoute(method, relativeToPrefix(path, prefix))]
}

// PublicRouteList returns the allow-list sorted for documentation and tests.
func PublicRouteList() []string {
	out := make([]string, 0, len(PublicRoutes))
	for _, r := range PublicRoutes {
		out = append(out, normalizeRoute(r.Method, r.Path))
	}
	sort.Strings(out)
	return out
}

// bindClaims copies validated claims onto the gin context.
func bindClaims(c *gin.Context, claims *Claims) {
	c.Set("user_id", claims.UserID)
	c.Set("tenant_id", claims.TenantID)
	c.Set("email", claims.Email)
	c.Set("role", NormalizeRole(claims.Role))
	c.Set("edition", claims.Edition)
	c.Set("permissions", PermissionsForRole(claims.Role))
}

// bearerToken extracts the credential from an Authorization header.
//
// Only the Bearer scheme is accepted. Returning the raw header for any other
// scheme would let a Basic or Negotiate credential be parsed as a token.
func bearerToken(header string) string {
	header = strings.TrimSpace(header)
	if header == "" {
		return ""
	}
	if len(header) > 7 && strings.EqualFold(header[:7], "Bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

// EnforceAuth is the deny-by-default gate for the API group.
//
// Requests on the public allow-list continue. Requests carrying a bearer token
// have their claims bound and continue. Everything else is rejected with 401.
//
// groupPrefix overrides APIPrefix for callers that mount the group elsewhere.
//
// Unlike OptionalJWTAuthMiddleware, this never lets an anonymous request reach
// a protected handler.
func (as *AuthService) EnforceAuth(groupPrefix ...string) gin.HandlerFunc {
	prefix := APIPrefix
	if len(groupPrefix) > 0 && cleanPath(groupPrefix[0]) != "" {
		prefix = cleanPath(groupPrefix[0])
	}
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))

		if token != "" {
			claims, err := as.tokenManager.ValidateToken(token)
			if err != nil {
				unauthorized(c, "invalid_token", "The access token is invalid or expired.")
				return
			}
			bindClaims(c, claims)
			c.Next()
			return
		}

		if IsPublicRouteUnder(c.Request.Method, c.Request.URL.Path, prefix) {
			// Public routes still run with any context a prior middleware set,
			// but with no tenant claim they resolve to the public workspace.
			c.Next()
			return
		}

		unauthorized(c, "authentication_required", "This endpoint requires a valid access token.")
	}
}

// relativeToPrefix strips prefix from path, or returns path unchanged when it is
// not mounted under that prefix.
func relativeToPrefix(path, prefix string) string {
	p := cleanPath(path)
	if p == prefix {
		return "/"
	}
	if strings.HasPrefix(p, prefix+"/") {
		return p[len(prefix):]
	}
	return p
}

func unauthorized(c *gin.Context, code, message string) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error":      code,
		"message":    message,
		"request_id": c.GetString("request_id"),
	})
}

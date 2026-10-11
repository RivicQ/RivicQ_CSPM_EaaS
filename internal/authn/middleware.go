package authn

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Gin context keys. These match the keys the authorization layer
// (route permissions, RBAC) already reads, so swapping middleware is transparent.
const (
	ctxUserID      = "user_id"
	ctxTenantID    = "tenant_id"
	ctxEmail       = "email"
	ctxRole        = "role"
	ctxEdition     = "edition"
	ctxPermissions = "permissions"
)

// Authenticate extracts and verifies the access token, populating the request
// context. It aborts with 401 when the token is missing or invalid.
func (s *Service) AuthenticateMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := bearerToken(c.GetHeader("Authorization"))
		if raw == "" {
			raw = strings.TrimSpace(c.Query("access_token"))
		}
		if raw == "" {
			s.abortUnauthorized(c, "authentication required")
			return
		}
		claims, err := s.issuer.verify(raw, s.now())
		if err != nil {
			s.abortUnauthorized(c, "invalid or expired token")
			return
		}
		c.Set(ctxUserID, claims.UserID)
		c.Set(ctxTenantID, claims.TenantID)
		c.Set(ctxEmail, normalizeEmail(claims.Email))
		c.Set(ctxRole, string(normalizeRole(claims.Role)))
		c.Set(ctxEdition, claims.Edition)
		c.Set(ctxPermissions, claims.Permissions)
		c.Next()
	}
}

// RequireRole guards a route by role for callers that do not use the route
// permission table.
func (s *Service) RequireRole(roles ...Role) gin.HandlerFunc {
	allowed := make(map[Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		role := normalizeRole(c.GetString(ctxRole))
		if !allowed[role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":              "insufficient_role",
				"message":            "Your role does not grant this operation.",
				"authenticated_role": string(role),
				"request_id":         c.GetString("request_id"),
			})
			return
		}
		c.Next()
	}
}

// DemoOnly aborts unless demo mode is enabled. Used to fence demo endpoints in
// production deployments.
func (s *Service) DemoOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.cfg.DemoMode {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "demo_disabled",
				"message": "Demo access is disabled (set DEMO_MODE=true to enable).",
			})
			return
		}
		c.Next()
	}
}

func (s *Service) abortUnauthorized(c *gin.Context, message string) {
	c.Header("WWW-Authenticate", `Bearer realm="rivicq"`)
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error":      "unauthorized",
		"message":    message,
		"request_id": c.GetString("request_id"),
	})
}

// CurrentUserID returns the authenticated user id from the request context.
func CurrentUserID(c *gin.Context) string { return c.GetString(ctxUserID) }

// CurrentTenantID returns the tenant id from the request context.
func CurrentTenantID(c *gin.Context) string { return c.GetString(ctxTenantID) }

// CurrentEmail returns the email from the request context.
func CurrentEmail(c *gin.Context) string { return c.GetString(ctxEmail) }

// CurrentRole returns the normalized role from the request context.
func CurrentRole(c *gin.Context) Role { return normalizeRole(c.GetString(ctxRole)) }

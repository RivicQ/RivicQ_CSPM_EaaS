package authn

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

// EnforceAuth is the deny-by-default gate for the API group. Requests on the
// public allow-list (auth.PublicRoutes) continue; requests carrying a valid
// bearer token have their claims bound from current user state; everything else
// is rejected with 401.
func (s *Service) EnforceAuth(groupPrefix ...string) gin.HandlerFunc {
	prefix := auth.APIPrefix
	if len(groupPrefix) > 0 && groupPrefix[0] != "" {
		prefix = groupPrefix[0]
	}
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if token == "" {
			token = strings.TrimSpace(c.Query("access_token"))
		}
		if token != "" {
			claims, err := s.issuer.verify(token, s.now())
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":      "invalid_token",
					"message":    "The access token is invalid or expired.",
					"request_id": c.GetString("request_id"),
				})
				return
			}
			u, err := s.store.GetUserByID(c.Request.Context(), claims.UserID)
			if err != nil || u == nil || u.Disabled {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error":      "invalid_token",
					"message":    "The access token is invalid or expired.",
					"request_id": c.GetString("request_id"),
				})
				return
			}
			role := normalizeRole(string(u.Role))
			c.Set(ctxUserID, u.ID)
			c.Set(ctxTenantID, u.TenantID)
			c.Set(ctxEmail, normalizeEmail(u.Email))
			c.Set(ctxRole, string(role))
			c.Set(ctxEdition, string(entitledEdition()))
			c.Set(ctxPermissions, auth.PermissionsForRole(string(role)))
			c.Next()
			return
		}
		if auth.IsPublicRouteUnder(c.Request.Method, c.Request.URL.Path, prefix) {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error":      "authentication_required",
			"message":    "This endpoint requires a valid access token.",
			"request_id": c.GetString("request_id"),
		})
	}
}

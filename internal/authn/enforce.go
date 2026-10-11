package authn

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

// EnforceAuth is the deny-by-default gate for the API group. Requests on the
// public allow-list (auth.PublicRoutes) continue; requests carrying a valid
// bearer token have their claims bound; everything else is rejected with 401.
func (s *Service) EnforceAuth(groupPrefix ...string) gin.HandlerFunc {
	prefix := auth.APIPrefix
	if len(groupPrefix) > 0 && groupPrefix[0] != "" {
		prefix = groupPrefix[0]
	}
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
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
			c.Set(ctxUserID, claims.UserID)
			c.Set(ctxTenantID, claims.TenantID)
			c.Set(ctxEmail, normalizeEmail(claims.Email))
			c.Set(ctxRole, string(normalizeRole(claims.Role)))
			c.Set(ctxEdition, claims.Edition)
			c.Set(ctxPermissions, claims.Permissions)
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

package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Role hierarchy used by Enterprise RBAC. Viewer < Analyst < Operator < Admin.
var roleRank = map[string]int{
	"viewer":   1,
	"analyst":  2,
	"operator": 3,
	"admin":    4,
}

func NormalizeRole(role string) string {
	r := strings.ToLower(strings.TrimSpace(role))
	if _, ok := roleRank[r]; ok {
		return r
	}
	return "viewer"
}

func RoleAtLeast(have, need string) bool {
	return roleRank[NormalizeRole(have)] >= roleRank[NormalizeRole(need)]
}

// RequireRole rejects authenticated callers below the given role.
// Must run after JWTAuthMiddleware so `role` is on the context.
func RequireRole(minimum string) gin.HandlerFunc {
	need := NormalizeRole(minimum)
	return func(c *gin.Context) {
		have := c.GetString("role")
		if have == "" || !RoleAtLeast(have, need) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":    "insufficient role",
				"required": need,
				"role":     NormalizeRole(have),
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

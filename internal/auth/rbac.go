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

// roleAliases map product titles onto the four persisted JWT roles.
// JWT still stores viewer|analyst|operator|admin. Frontend labels are not authorization.
var roleAliases = map[string]string{
	"owner":            "admin",
	"administrator":    "admin",
	"security manager": "admin",
	"security-manager": "admin",
	"security_manager": "admin",
	"security analyst": "analyst",
	"security-analyst": "analyst",
	"security_analyst": "analyst",
	"developer":        "operator",
}

func NormalizeRole(role string) string {
	r := strings.ToLower(strings.TrimSpace(role))
	if alias, ok := roleAliases[r]; ok {
		r = alias
	}
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

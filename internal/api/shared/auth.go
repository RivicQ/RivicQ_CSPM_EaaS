package shared

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/sirupsen/logrus"
)

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Edition  string `json:"edition"`
}

type authUserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role,omitempty"`
}

// SetupAuthRoutes configures shared JWT auth routes.
func SetupAuthRoutes(router *gin.RouterGroup, logger *logrus.Logger, service *auth.AuthService, allowedDomains []string) {
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", loginHandler(logger, service, allowedDomains))
		authGroup.POST("/register", registerDisabledHandler())
		authGroup.GET("/me", service.JWTAuthMiddleware(nil), meHandler())
		authGroup.GET("/editions", editionsHandler(allowedDomains))
	}
}

func loginHandler(logger *logrus.Logger, service *auth.AuthService, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req authRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			return
		}
		if !workEmailAllowed(req.Email, allowedDomains) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Work email domain not allowed"})
			return
		}
		token, err := service.LoginWithEdition(req.Email, req.Password, req.Edition)
		if err != nil {
			logger.WithError(err).WithField("email", req.Email).Warn("authentication failed")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		user, err := service.GetUserByEmail(req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to load user"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user": authUserResponse{
				ID:    user.ID,
				Name:  user.Name,
				Email: user.Email,
				Role:  user.Role,
			},
			"edition": editionForRole(user.Role, req.Edition),
		})
	}
}

func registerDisabledHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{"error": "Self-service registration is disabled. Contact your workspace administrator."})
	}
}

func meHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id":     c.GetString("user_id"),
			"tenant_id":   c.GetString("tenant_id"),
			"email":       c.GetString("email"),
			"role":        c.GetString("role"),
			"edition":     c.GetString("edition"),
			"permissions": c.GetStringSlice("permissions"),
		})
	}
}

func editionsHandler(allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"editions":     []string{"oss", "enterprise"},
			"work_domains": allowedDomains,
		})
	}
}

func workEmailAllowed(email string, allowedDomains []string) bool {
	if len(allowedDomains) == 0 {
		return true
	}
	parts := strings.Split(strings.ToLower(strings.TrimSpace(email)), "@")
	if len(parts) != 2 {
		return false
	}
	for _, domain := range allowedDomains {
		if parts[1] == strings.ToLower(strings.TrimSpace(domain)) {
			return true
		}
	}
	return false
}

func editionForRole(role, requested string) string {
	requested = strings.ToLower(strings.TrimSpace(requested))
	if requested == "oss" || requested == "enterprise" {
		return requested
	}
	if role == "admin" || role == "operator" {
		return "enterprise"
	}
	return "oss"
}
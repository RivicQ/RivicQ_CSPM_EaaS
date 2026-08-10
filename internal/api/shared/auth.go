package shared

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/sirupsen/logrus"
)

type authRequest struct {
	Name     string `json:"name"`
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
		authGroup.POST("/register", registerHandler(logger, service, allowedDomains))
		authGroup.POST("/refresh", refreshTokenHandler(service, logger))
		authGroup.POST("/logout", service.JWTAuthMiddleware(nil), logoutHandler(service, logger))
		authGroup.POST("/mfa/verify", mfaVerifyHandler(service, logger))
		authGroup.POST("/mfa/setup", service.JWTAuthMiddleware(nil), mfaSetupHandler(service, logger))
		authGroup.POST("/mfa/confirm", service.JWTAuthMiddleware(nil), mfaConfirmHandler(service, logger))
		authGroup.POST("/mfa/disable", service.JWTAuthMiddleware(nil), mfaDisableHandler(service, logger))
		authGroup.GET("/me", service.JWTAuthMiddleware(nil), meHandler())
		authGroup.GET("/editions", editionsHandler(allowedDomains))

		// Google OAuth
		authGroup.GET("/google/login", GoogleLoginHandler(logger))
		authGroup.Any("/google/callback", GoogleCallbackHandler(logger, service, allowedDomains))
		authGroup.GET("/google/status", GoogleOAuthStatusHandler(logger))

		// GitHub OAuth
		authGroup.GET("/github/login", GitHubLoginHandler(logger))
		authGroup.Any("/github/callback", GitHubCallbackHandler(logger, service, allowedDomains))
		authGroup.GET("/github/status", GitHubOAuthStatusHandler(logger))

		// Demo access
		authGroup.GET("/demo", DemoAccessHandler(logger, service))
	}
}

func DemoAccessHandler(logger *logrus.Logger, service *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		edition := c.DefaultQuery("edition", "oss")
		if edition != "oss" && edition != "professional" && edition != "enterprise" {
			edition = "oss"
		}

		demoUser := &auth.User{
			ID:       "demo-user",
			TenantID: "tenant-1",
			Email:    "demo@cryptobom.io",
			Name:     "Demo User",
			Role:     "admin",
		}

		accessToken, err := service.TokenManager().GenerateToken(demoUser, edition)
		if err != nil {
			logger.WithError(err).Error("Failed to generate demo access token")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate demo access"})
			return
		}

		refreshToken, err := service.TokenManager().GenerateRefreshToken(demoUser)
		if err != nil {
			logger.WithError(err).Error("Failed to generate demo refresh token")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate demo access"})
			return
		}

		type authUserDisplay struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
			Role  string `json:"role"`
		}

		c.JSON(http.StatusOK, gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": authUserDisplay{
				ID:    "demo-user",
				Name:  "Demo User",
				Email: "demo@cryptobom.io",
				Role:  "admin",
			},
			"edition":   edition,
			"demo_mode": true,
		})
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
		resp, err := service.LoginWithEdition(req.Email, req.Password, req.Edition)
		if err != nil {
			logger.WithError(err).WithField("email", req.Email).Warn("authentication failed")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// MFA required
		if resp.MFARequired {
			c.JSON(http.StatusOK, gin.H{
				"mfa_required": true,
				"mfa_session":  resp.MFASession,
				"message":      "MFA verification required",
			})
			return
		}

		user, err := service.GetUserByEmail(req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to load user"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"access_token":  resp.AccessToken,
			"refresh_token": resp.RefreshToken,
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

func registerHandler(logger *logrus.Logger, service *auth.AuthService, allowedDomains []string) gin.HandlerFunc {
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
		if strings.TrimSpace(req.Name) == "" {
			req.Name = strings.Split(strings.TrimSpace(req.Email), "@")[0]
		}

		user := &auth.User{
			Email:    strings.ToLower(strings.TrimSpace(req.Email)),
			Name:     strings.TrimSpace(req.Name),
			Password: req.Password,
			Role:     "viewer",
		}

		if err := service.Register(user); err != nil {
			logger.WithError(err).WithField("email", req.Email).Warn("registration failed")
			msg := err.Error()
			if strings.Contains(strings.ToLower(msg), "duplicate key") {
				msg = "An account with this email already exists. Please log in instead."
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": msg})
			return
		}

		resp, err := service.LoginWithEdition(req.Email, req.Password, req.Edition)
		if err != nil {
			logger.WithError(err).WithField("email", req.Email).Warn("registration login failed")
			c.JSON(http.StatusCreated, gin.H{
				"message": "Registration completed. Please log in with your new account.",
				"user": authUserResponse{Email: user.Email, Name: user.Name, Role: user.Role},
			})
			return
		}

		createdUser, err := service.GetUserByEmail(req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to load user"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"access_token":  resp.AccessToken,
			"refresh_token": resp.RefreshToken,
			"user": authUserResponse{
				ID:    createdUser.ID,
				Name:  createdUser.Name,
				Email: createdUser.Email,
				Role:  createdUser.Role,
			},
			"edition": editionForRole(createdUser.Role, req.Edition),
		})
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
			"editions":     []string{"community", "professional", "enterprise"},
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

func refreshTokenHandler(service *auth.AuthService, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "refresh_token required"})
			return
		}
		newAccess, newRefresh, err := service.TokenManager().RefreshAccessToken(req.RefreshToken)
		if err != nil {
			logger.WithError(err).Warn("refresh token failed")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or revoked refresh token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"access_token":  newAccess,
			"refresh_token": newRefresh,
		})
	}
}

func logoutHandler(service *auth.AuthService, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString := authHeader[7:]
			if err := service.TokenManager().RevokeToken(tokenString); err != nil {
				logger.WithError(err).Warn("logout revocation failed")
			}
		}
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

func mfaVerifyHandler(service *auth.AuthService, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			MFASession string `json:"mfa_session" binding:"required"`
			MFACode    string `json:"mfa_code" binding:"required"`
			Email      string `json:"email" binding:"required"`
			Edition    string `json:"edition"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		user, err := service.GetUserByEmail(req.Email)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		if !user.MFAEnabled {
			c.JSON(http.StatusBadRequest, gin.H{"error": "MFA not enabled for this user"})
			return
		}

		// Validate the server-issued login challenge before trusting the code.
		if !service.ValidateMFASession(req.MFASession, req.Email) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired MFA session"})
			return
		}

		// Real TOTP verification against the user's stored secret.
		if !service.ValidateTOTP(user, req.MFACode) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid MFA code"})
			return
		}

		edition := req.Edition
		if edition == "" {
			edition = editionForRole(user.Role, req.Edition)
		}

		accessToken, err := service.TokenManager().GenerateToken(user, edition)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}
		refreshToken, err := service.TokenManager().GenerateRefreshToken(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"mfa_verified":  true,
		})
	}
}

func mfaSetupHandler(service *auth.AuthService, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetString("email")
		secret, provisioningURI, err := service.GenerateMFASecret(email)
		if err != nil {
			logger.WithError(err).Error("MFA setup failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate MFA secret"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"secret":            secret,
			"provisioning_uri":  provisioningURI,
			"issuer":            "RivicQ CryptoBOM",
			"account":           email,
		})
	}
}

func mfaConfirmHandler(service *auth.AuthService, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Secret string `json:"secret" binding:"required"`
			Code   string `json:"code" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		email := c.GetString("email")
		user, err := service.GetUserByEmail(email)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		// Verify the presented code against the secret the user just scanned.
		if !totp.Validate(strings.TrimSpace(req.Code), req.Secret) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
			return
		}

		user.MFASecret = req.Secret
		user.MFAEnabled = true
		if err := service.UpdateUser(user); err != nil {
			logger.WithError(err).Error("MFA confirm failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable MFA"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"mfa_enabled": true, "message": "MFA enabled successfully"})
	}
}

func mfaDisableHandler(service *auth.AuthService, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Code string `json:"code" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		email := c.GetString("email")
		user, err := service.GetUserByEmail(email)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		if !service.ValidateTOTP(user, req.Code) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid MFA code"})
			return
		}

		user.MFASecret = ""
		user.MFAEnabled = false
		if err := service.UpdateUser(user); err != nil {
			logger.WithError(err).Error("MFA disable failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable MFA"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"mfa_enabled": false, "message": "MFA disabled successfully"})
	}
}

func editionForRole(role, requested string) string {
	requested = strings.ToLower(strings.TrimSpace(requested))
	if requested == "oss" || requested == "professional" || requested == "enterprise" {
		return requested
	}
	if role == "admin" {
		return "enterprise"
	}
	if role == "operator" || role == "analyst" {
		return "professional"
	}
	return "oss"
}
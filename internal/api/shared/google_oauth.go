package shared

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleUser struct {
	Sub           string `json:"sub"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	HD            string `json:"hd"`
}

var (
	googleOAuthConfig *oauth2.Config
	oauthStateMap     = make(map[string]string)
)

func initGoogleOAuthConfig() *oauth2.Config {
	if googleOAuthConfig != nil {
		return googleOAuthConfig
	}
	clientID := os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		return nil
	}
	redirectURL := os.Getenv("GOOGLE_OAUTH_REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:8080/api/v1/auth/google/callback"
	}
	googleOAuthConfig = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
	return googleOAuthConfig
}

func generateOAuthState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GoogleLoginHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{
				"error":   "Google OAuth not configured",
				"message": "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET",
			})
			return
		}

		state := generateOAuthState()
		oauthStateMap[state] = time.Now().UTC().Format(time.RFC3339)

		redirectURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		c.JSON(http.StatusOK, gin.H{
			"auth_url": redirectURL,
			"state":    state,
		})
	}
}

func GoogleCallbackHandler(logger *logrus.Logger, service *auth.AuthService, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Google OAuth not configured"})
			return
		}

		state := c.Query("state")
		code := c.Query("code")

		if state == "" || code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state or code"})
			return
		}

		if _, exists := oauthStateMap[state]; !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid state parameter"})
			return
		}
		delete(oauthStateMap, state)

		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			logger.WithError(err).Error("Google OAuth token exchange failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Token exchange failed"})
			return
		}

		client := config.Client(context.Background(), token)
		resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
		if err != nil {
			logger.WithError(err).Error("Google userinfo request failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
			return
		}
		defer func() { _ = resp.Body.Close() }()

		var googleUser GoogleUser
		if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
			logger.WithError(err).Error("Failed to decode Google user info")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info"})
			return
		}

		if !googleUser.EmailVerified {
			c.JSON(http.StatusForbidden, gin.H{"error": "Google email not verified"})
			return
		}

		if len(allowedDomains) > 0 && !workEmailAllowed(googleUser.Email, allowedDomains) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Email domain not allowed"})
			return
		}

		existingUser, err := service.GetUserByEmail(googleUser.Email)
		if err != nil {
			newUser := &auth.User{
				Email:    strings.ToLower(strings.TrimSpace(googleUser.Email)),
				Name:     googleUser.Name,
				Password: fmt.Sprintf("google-oauth-%s", googleUser.Sub),
				Role:     "viewer",
			}
			if err := service.Register(newUser); err != nil {
				logger.WithError(err).Error("Failed to create user from Google OAuth")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
				return
			}
			existingUser = newUser
		}

		edition := "oss"

		accessToken, err := service.TokenManager().GenerateToken(existingUser, edition)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		refreshToken, err := service.TokenManager().GenerateRefreshToken(existingUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
			return
		}

		// If a frontend redirect URL is configured, redirect the browser instead of returning JSON
		frontendURL := os.Getenv("FRONTEND_REDIRECT_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000"
		}
		if frontendURL != "" {
			redirectURL := fmt.Sprintf("%s?access_token=%s&refresh_token=%s&edition=%s&user_id=%s&user_name=%s&user_email=%s&user_role=%s",
				strings.TrimRight(frontendURL, "/")+"/oauth/callback",
				accessToken,
				refreshToken,
				edition,
				existingUser.ID,
				url.QueryEscape(existingUser.Name),
				url.QueryEscape(existingUser.Email),
				existingUser.Role,
			)
			c.Redirect(http.StatusTemporaryRedirect, redirectURL)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": authUserResponse{
				ID:    existingUser.ID,
				Name:  existingUser.Name,
				Email: existingUser.Email,
				Role:  existingUser.Role,
			},
			"edition": edition,
		})
	}
}

func GoogleOAuthStatusHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		enabled := config != nil
		c.JSON(http.StatusOK, gin.H{
			"google_oauth_enabled": enabled,
		})
	}
}

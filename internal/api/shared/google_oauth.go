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
	oauthStateMap     = make(map[string]string) // state -> edition
)

func resolveGoogleOAuthRedirectURL() string {
	if redirectURL := strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_REDIRECT_URL")); redirectURL != "" {
		return redirectURL
	}
	port := strings.TrimSpace(os.Getenv("CRYPTOBOM_PORT"))
	if port == "" {
		port = "8080"
	}
	return fmt.Sprintf("http://localhost:%s/api/v1/auth/google/callback", port)
}

func initGoogleOAuthConfig() *oauth2.Config {
	clientID := os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		googleOAuthConfig = nil
		return nil
	}
	redirectURL := resolveGoogleOAuthRedirectURL()
	if googleOAuthConfig != nil &&
		googleOAuthConfig.ClientID == clientID &&
		googleOAuthConfig.ClientSecret == clientSecret &&
		googleOAuthConfig.RedirectURL == redirectURL {
		return googleOAuthConfig
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

func generateOAuthState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
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

		state, err := generateOAuthState()
		if err != nil {
			logger.WithError(err).Error("Failed to generate OAuth state")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start Google login"})
			return
		}
		edition := normalizeAuthEdition(c.DefaultQuery("edition", "oss"))
		oauthStateMap[state] = edition

		redirectURL := config.AuthCodeURL(
			state,
			oauth2.AccessTypeOffline,
			oauth2.SetAuthURLParam("prompt", "select_account"),
		)
		c.JSON(http.StatusOK, gin.H{
			"auth_url":     redirectURL,
			"state":        state,
			"redirect_uri": config.RedirectURL,
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

		if oauthErr := c.Query("error"); oauthErr != "" {
			params := url.Values{}
			params.Set("error", oauthErr)
			if desc := c.Query("error_description"); desc != "" {
				params.Set("error_description", desc)
			}
			c.Redirect(http.StatusTemporaryRedirect, buildOAuthFrontendRedirect(params))
			return
		}

		state := c.Query("state")
		code := c.Query("code")

		if state == "" || code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state or code"})
			return
		}

		result, err := completeGoogleOAuth(logger, service, allowedDomains, config, code, state)
		if err != nil {
			status := http.StatusInternalServerError
			switch err.Error() {
			case "invalid state parameter":
				status = http.StatusForbidden
			case "Google email not verified", "Email domain not allowed":
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}

		params := url.Values{}
		params.Set("access_token", result.AccessToken)
		params.Set("refresh_token", result.RefreshToken)
		params.Set("edition", result.Edition)
		params.Set("user_id", result.User.ID)
		params.Set("user_name", result.User.Name)
		params.Set("user_email", result.User.Email)
		params.Set("user_role", result.User.Role)
		c.Redirect(http.StatusTemporaryRedirect, buildOAuthFrontendRedirect(params))
	}
}

type googleOAuthCompletion struct {
	AccessToken  string
	RefreshToken string
	Edition      string
	User         *auth.User
}

func completeGoogleOAuth(
	logger *logrus.Logger,
	service *auth.AuthService,
	allowedDomains []string,
	config *oauth2.Config,
	code string,
	state string,
) (*googleOAuthCompletion, error) {
	requestedEdition, exists := oauthStateMap[state]
	if !exists {
		return nil, fmt.Errorf("invalid state parameter")
	}
	delete(oauthStateMap, state)

	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		logger.WithError(err).Error("Google OAuth token exchange failed")
		return nil, fmt.Errorf("token exchange failed")
	}

	client := config.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		logger.WithError(err).Error("Google userinfo request failed")
		return nil, fmt.Errorf("failed to get user info")
	}
	defer func() { _ = resp.Body.Close() }()

	var googleUser GoogleUser
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		logger.WithError(err).Error("Failed to decode Google user info")
		return nil, fmt.Errorf("failed to parse user info")
	}

	if !googleUser.EmailVerified {
		return nil, fmt.Errorf("google email not verified")
	}

	if len(allowedDomains) > 0 && !workEmailAllowed(googleUser.Email, allowedDomains) {
		return nil, fmt.Errorf("email domain not allowed")
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
			return nil, fmt.Errorf("failed to create user")
		}
		existingUser = newUser
	}

	edition := normalizeAuthEdition(requestedEdition)
	if edition == "" {
		edition = editionForRole(existingUser.Role, "")
	}

	accessToken, err := service.TokenManager().GenerateToken(existingUser, edition)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token")
	}

	refreshToken, err := service.TokenManager().GenerateRefreshToken(existingUser)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token")
	}

	return &googleOAuthCompletion{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Edition:      edition,
		User:         existingUser,
	}, nil
}

func GoogleExchangeHandler(logger *logrus.Logger, service *auth.AuthService, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Google OAuth not configured"})
			return
		}

		var req struct {
			Code  string `json:"code"`
			State string `json:"state"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" || req.State == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code or state"})
			return
		}

		result, err := completeGoogleOAuth(logger, service, allowedDomains, config, req.Code, req.State)
		if err != nil {
			status := http.StatusInternalServerError
			switch err.Error() {
			case "invalid state parameter":
				status = http.StatusForbidden
			case "Google email not verified", "Email domain not allowed":
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"access_token":  result.AccessToken,
			"refresh_token": result.RefreshToken,
			"user": authUserResponse{
				ID:    result.User.ID,
				Name:  result.User.Name,
				Email: result.User.Email,
				Role:  result.User.Role,
			},
			"edition": result.Edition,
		})
	}
}

func GoogleOAuthStatusHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		enabled := config != nil
		payload := gin.H{"google_oauth_enabled": enabled}
		if enabled {
			payload["redirect_uri"] = config.RedirectURL
		}
		c.JSON(http.StatusOK, payload)
	}
}

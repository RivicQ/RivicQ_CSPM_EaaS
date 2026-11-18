package shared

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/authn"
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

var googleOAuthConfig *oauth2.Config

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
		state, err := defaultOAuthStore.createState(time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize OAuth state"})
			return
		}
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

func GoogleCallbackHandler(logger *logrus.Logger, service *authn.Service, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Google OAuth not configured"})
			return
		}
		if c.Request.Method == http.MethodPost {
			googleExchangeResponse(c, c.Request.Context(), logger, service, allowedDomains)
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

		state := strings.TrimSpace(c.Query("state"))
		code := strings.TrimSpace(c.Query("code"))
		if state == "" || code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state or code"})
			return
		}
		if err := defaultOAuthStore.consumeState(state, time.Now().UTC()); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid state parameter"})
			return
		}

		result, err := completeGoogleOAuth(c.Request.Context(), logger, service, allowedDomains, config, code)
		if err != nil {
			status := http.StatusInternalServerError
			msg := "OAuth completion failed"
			switch err.Error() {
			case "google email not verified", "email domain not allowed":
				status = http.StatusForbidden
				msg = err.Error()
			case "token exchange failed", "failed to get user info", "failed to parse user info", "failed to create user", "failed to generate token":
				msg = err.Error()
			}
			c.JSON(status, gin.H{"error": msg})
			return
		}

		exchangeCode, err := defaultOAuthStore.createExchange(state, result, time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete OAuth"})
			return
		}
		params := url.Values{}
		params.Set("exchange_code", exchangeCode)
		params.Set("state", state)
		params.Set("provider", "google")
		c.Redirect(http.StatusTemporaryRedirect, buildOAuthFrontendRedirect(params))
	}
}

func completeGoogleOAuth(
	ctx context.Context,
	logger *logrus.Logger,
	service *authn.Service,
	allowedDomains []string,
	config *oauth2.Config,
	code string,
) (*oauthCompletion, error) {
	token, err := config.Exchange(ctx, code)
	if err != nil {
		logger.WithError(err).Error("Google OAuth token exchange failed")
		return nil, fmt.Errorf("token exchange failed")
	}

	client := config.Client(ctx, token)
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

	user, err := service.EnsureExternalUser(ctx, googleUser.Email, googleUser.Name, "")
	if err != nil {
		logger.WithError(err).Error("Failed to resolve user from Google OAuth")
		return nil, fmt.Errorf("failed to create user")
	}
	pair, err := service.IssueTokens(ctx, user, "", "", "")
	if err != nil {
		return nil, fmt.Errorf("failed to generate token")
	}

	return &oauthCompletion{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		Edition:      serverAuthEdition(),
		User: authUserResponse{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  string(user.Role),
		},
	}, nil
}

func googleExchangeResponse(c *gin.Context, ctx context.Context, logger *logrus.Logger, service *authn.Service, allowedDomains []string) {
	_ = ctx
	_ = logger
	_ = service
	_ = allowedDomains
	var req struct {
		ExchangeCode string `json:"exchange_code"`
		State        string `json:"state"`
		Code         string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	exchangeCode := strings.TrimSpace(req.ExchangeCode)
	state := strings.TrimSpace(req.State)
	if exchangeCode == "" {
		exchangeCode = strings.TrimSpace(req.Code)
	}
	if exchangeCode == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing exchange code or state"})
		return
	}
	entry, err := defaultOAuthStore.consumeExchange(exchangeCode, state, time.Now().UTC())
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid or expired exchange code"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token":  entry.accessToken,
		"refresh_token": entry.refreshToken,
		"user":          entry.user,
		"edition":       entry.edition,
	})
}

func GoogleExchangeHandler(logger *logrus.Logger, service *authn.Service, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGoogleOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Google OAuth not configured"})
			return
		}
		googleExchangeResponse(c, c.Request.Context(), logger, service, allowedDomains)
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

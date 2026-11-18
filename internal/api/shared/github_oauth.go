package shared

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/authn"
	"github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
)

type GitHubUser struct {
	Login     string `json:"login"`
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

type GitHubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

var githubOAuthConfig *oauth2.Config

func initGitHubOAuthConfig() *oauth2.Config {
	if githubOAuthConfig != nil {
		return githubOAuthConfig
	}
	clientID := os.Getenv("GITHUB_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_OAUTH_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		return nil
	}
	redirectURL := os.Getenv("GITHUB_OAUTH_REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:8080/api/v1/auth/github/callback"
	}
	githubOAuthConfig = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"read:user", "user:email"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://github.com/login/oauth/authorize",
			TokenURL: "https://github.com/login/oauth/access_token",
		},
	}
	return githubOAuthConfig
}

func GitHubLoginHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGitHubOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{
				"error":   "GitHub OAuth not configured",
				"message": "Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET",
			})
			return
		}
		state, err := defaultOAuthStore.createState(time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize OAuth state"})
			return
		}
		redirectURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		c.JSON(http.StatusOK, gin.H{
			"auth_url": redirectURL,
			"state":    state,
		})
	}
}

func GitHubCallbackHandler(logger *logrus.Logger, service *authn.Service, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGitHubOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "GitHub OAuth not configured"})
			return
		}
		if c.Request.Method == http.MethodPost {
			githubExchangeResponse(c)
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

		result, err := completeGitHubOAuth(c.Request.Context(), logger, service, allowedDomains, config, code)
		if err != nil {
			status := http.StatusInternalServerError
			msg := "OAuth completion failed"
			switch err.Error() {
			case "no verified email found on GitHub account", "email domain not allowed":
				status = http.StatusForbidden
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
		params.Set("provider", "github")
		c.Redirect(http.StatusTemporaryRedirect, buildOAuthFrontendRedirect(params))
	}
}

func completeGitHubOAuth(
	ctx context.Context,
	logger *logrus.Logger,
	service *authn.Service,
	allowedDomains []string,
	config *oauth2.Config,
	code string,
) (*oauthCompletion, error) {
	token, err := config.Exchange(ctx, code)
	if err != nil {
		logger.WithError(err).Error("GitHub OAuth token exchange failed")
		return nil, err
	}
	client := config.Client(ctx, token)
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		logger.WithError(err).Error("GitHub user request failed")
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var ghUser GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
		logger.WithError(err).Error("Failed to decode GitHub user info")
		return nil, err
	}
	if ghUser.Email == "" {
		emailResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer func() { _ = emailResp.Body.Close() }()
			var emails []GitHubEmail
			if err := json.NewDecoder(emailResp.Body).Decode(&emails); err == nil {
				for _, e := range emails {
					if e.Primary && e.Verified {
						ghUser.Email = e.Email
						break
					}
				}
			}
		}
	}
	if ghUser.Email == "" {
		return nil, &oauthUserError{"no verified email found on GitHub account"}
	}
	if len(allowedDomains) > 0 && !workEmailAllowed(ghUser.Email, allowedDomains) {
		return nil, &oauthUserError{"email domain not allowed"}
	}
	name := ghUser.Name
	if name == "" {
		name = ghUser.Login
	}
	user, err := service.EnsureExternalUser(ctx, ghUser.Email, name, "")
	if err != nil {
		logger.WithError(err).Error("Failed to resolve user from GitHub OAuth")
		return nil, err
	}
	pair, err := service.IssueTokens(ctx, user, "", "", "")
	if err != nil {
		return nil, err
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

type oauthUserError struct{ msg string }

func (e *oauthUserError) Error() string { return e.msg }

func githubExchangeResponse(c *gin.Context) {
	var req struct {
		ExchangeCode string `json:"exchange_code"`
		State        string `json:"state"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	entry, err := defaultOAuthStore.consumeExchange(req.ExchangeCode, req.State, time.Now().UTC())
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

func GitHubOAuthStatusHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGitHubOAuthConfig()
		enabled := config != nil
		c.JSON(http.StatusOK, gin.H{
			"github_oauth_enabled": enabled,
		})
	}
}

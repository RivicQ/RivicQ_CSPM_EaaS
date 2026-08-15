package shared

import (
	"context"
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

var (
	githubOAuthConfig *oauth2.Config
	githubStateMap    = make(map[string]string) // state -> edition
)

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
		Scopes:       []string{"read:user", "user:email", "repo"},
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

		state := generateOAuthState()
		edition := normalizeAuthEdition(c.DefaultQuery("edition", "oss"))
		githubStateMap[state] = edition

		redirectURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		c.JSON(http.StatusOK, gin.H{
			"auth_url": redirectURL,
			"state":    state,
		})
	}
}

func GitHubCallbackHandler(logger *logrus.Logger, service *auth.AuthService, allowedDomains []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config := initGitHubOAuthConfig()
		if config == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "GitHub OAuth not configured"})
			return
		}

		state := c.Query("state")
		code := c.Query("code")

		if state == "" || code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state or code"})
			return
		}

		requestedEdition, exists := githubStateMap[state]
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid state parameter"})
			return
		}
		delete(githubStateMap, state)

		token, err := config.Exchange(context.Background(), code)
		if err != nil {
			logger.WithError(err).Error("GitHub OAuth token exchange failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Token exchange failed"})
			return
		}

		client := config.Client(context.Background(), token)
		resp, err := client.Get("https://api.github.com/user")
		if err != nil {
			logger.WithError(err).Error("GitHub user request failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
			return
		}
		defer func() { _ = resp.Body.Close() }()

		var ghUser GitHubUser
		if err := json.NewDecoder(resp.Body).Decode(&ghUser); err != nil {
			logger.WithError(err).Error("Failed to decode GitHub user info")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info"})
			return
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
			c.JSON(http.StatusForbidden, gin.H{"error": "No verified email found on GitHub account"})
			return
		}

		if len(allowedDomains) > 0 && !workEmailAllowed(ghUser.Email, allowedDomains) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Email domain not allowed"})
			return
		}

		ghUserName := ghUser.Name
		if ghUserName == "" {
			ghUserName = ghUser.Login
		}

		existingUser, err := service.GetUserByEmail(ghUser.Email)
		if err != nil {
			newUser := &auth.User{
				Email:    strings.ToLower(strings.TrimSpace(ghUser.Email)),
				Name:     ghUserName,
				Password: fmt.Sprintf("github-oauth-%d", ghUser.ID),
				Role:     "viewer",
			}
			if err := service.Register(newUser); err != nil {
				logger.WithError(err).Error("Failed to create user from GitHub OAuth")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
				return
			}
			existingUser = newUser
		}

		edition := normalizeAuthEdition(requestedEdition)
		if edition == "" {
			edition = editionForRole(existingUser.Role, "")
		}

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

		params := url.Values{}
		params.Set("access_token", accessToken)
		params.Set("refresh_token", refreshToken)
		params.Set("edition", edition)
		params.Set("user_id", existingUser.ID)
		params.Set("user_name", existingUser.Name)
		params.Set("user_email", existingUser.Email)
		params.Set("user_role", existingUser.Role)
		if token.AccessToken != "" {
			params.Set("github_token", token.AccessToken)
		}
		c.Redirect(http.StatusTemporaryRedirect, buildOAuthFrontendRedirect(params))
	}
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

package shared

import (
	"net/url"
	"os"
	"strings"
)

// frontendOAuthCallbackURL returns the browser URL that completes OAuth (includes router basename).
func frontendOAuthCallbackURL() string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_REDIRECT_URL"))
	if base == "" {
		base = "http://localhost:3000"
	}
	base = strings.TrimRight(base, "/")

	// When FRONTEND_REDIRECT_URL is just the origin, append the SPA basename.
	if !strings.Contains(strings.TrimPrefix(base, "http://"), "/") &&
		!strings.Contains(strings.TrimPrefix(base, "https://"), "/") {
		path := strings.TrimSpace(os.Getenv("FRONTEND_BASE_PATH"))
		if path == "" {
			path = "/platform"
		}
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		base += strings.TrimRight(path, "/")
	}

	return base + "/oauth/callback"
}

func buildOAuthFrontendRedirect(params url.Values) string {
	return frontendOAuthCallbackURL() + "?" + params.Encode()
}

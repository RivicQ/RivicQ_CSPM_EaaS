package auth

import (
	"net/http"
	"sort"
	"strings"
)

// PublicRoute identifies a route that is reachable without authentication.
// Everything not listed here requires a valid access token.
type PublicRoute struct {
	Method string
	Path   string
}

// APIPrefix is the mount point of the versioned API group the authentication
// gate guards. PublicRoutes are written relative to it.
const APIPrefix = "/api/v1"

// PublicRoutes is the explicit allow-list of unauthenticated /api/v1 endpoints.
//
// Paths are relative to APIPrefix: "/auth/login" means "/api/v1/auth/login".
//
// It exists so the default is deny: a new route is authenticated unless an
// operator deliberately adds it here. Reviewing this list is the security
// review; there is no "optional auth" mode.
var PublicRoutes = []PublicRoute{
	// Self-service authentication. Each handler is responsible for its own
	// brute-force, enumeration and validation controls.
	{Method: http.MethodPost, Path: "/auth/login"},
	{Method: http.MethodPost, Path: "/auth/register"},
	{Method: http.MethodPost, Path: "/auth/refresh"},
	{Method: http.MethodPost, Path: "/auth/mfa/verify"},
	{Method: http.MethodPost, Path: "/auth/forgot-password"},
	{Method: http.MethodPost, Path: "/auth/reset-password"},
	{Method: http.MethodGet, Path: "/auth/verify-email"},
	{Method: http.MethodPost, Path: "/auth/verify-email"},
	{Method: http.MethodGet, Path: "/auth/editions"},
	{Method: http.MethodGet, Path: "/auth/providers"},
	{Method: http.MethodGet, Path: "/auth/demo"},

	// OAuth entry and callback. The callback is authenticated by the `state`
	// parameter; the browser cannot carry a bearer token.
	{Method: http.MethodGet, Path: "/auth/google/login"},
	{Method: http.MethodPost, Path: "/auth/google/exchange"},
	{Method: http.MethodGet, Path: "/auth/google/callback"},
	{Method: http.MethodPost, Path: "/auth/google/callback"},
	{Method: http.MethodGet, Path: "/auth/github/login"},
	{Method: http.MethodGet, Path: "/auth/github/callback"},
	{Method: http.MethodPost, Path: "/auth/github/callback"},

	// Public product surface.
	{Method: http.MethodGet, Path: "/platform/status"},
	{Method: http.MethodGet, Path: "/platform/plans"},
	{Method: http.MethodGet, Path: "/platform/funnel"},
	{Method: http.MethodGet, Path: "/platform/contacts"},
	{Method: http.MethodGet, Path: "/ibm"},
	{Method: http.MethodGet, Path: "/billing/status"},
	{Method: http.MethodPost, Path: "/leads"},

	// Webhooks authenticate with a provider signature, not a session token.
	{Method: http.MethodPost, Path: "/billing/webhooks"},
	{Method: http.MethodPost, Path: "/github/webhook"},
}

var publicRouteSet = buildPublicRouteSet()

func buildPublicRouteSet() map[string]bool {
	set := make(map[string]bool, len(PublicRoutes))
	for _, r := range PublicRoutes {
		set[normalizeRoute(r.Method, r.Path)] = true
	}
	return set
}

func normalizeRoute(method, path string) string {
	return strings.ToUpper(strings.TrimSpace(method)) + " " + cleanPath(path)
}

// cleanPath strips a trailing slash so /auth/login/ matches /auth/login.
func cleanPath(p string) string {
	p = strings.TrimSpace(p)
	if len(p) > 1 {
		p = strings.TrimRight(p, "/")
	}
	return p
}

// IsPublicRoute reports whether a request is on the unauthenticated allow-list.
func IsPublicRoute(method, path string) bool {
	return IsPublicRouteUnder(method, path, APIPrefix)
}

// IsPublicRouteUnder reports whether a request is public for a group mounted at
// the given prefix.
func IsPublicRouteUnder(method, path, prefix string) bool {
	if prefix == "" {
		prefix = APIPrefix
	}
	return publicRouteSet[normalizeRoute(method, relativeToPrefix(path, prefix))]
}

// PublicRouteList returns the allow-list sorted for documentation and tests.
func PublicRouteList() []string {
	out := make([]string, 0, len(PublicRoutes))
	for _, r := range PublicRoutes {
		out = append(out, normalizeRoute(r.Method, r.Path))
	}
	sort.Strings(out)
	return out
}

// relativeToPrefix strips prefix from path, or returns path unchanged when it is
// not mounted under that prefix.
func relativeToPrefix(path, prefix string) string {
	p := cleanPath(path)
	if p == prefix {
		return "/"
	}
	if strings.HasPrefix(p, prefix+"/") {
		return p[len(prefix):]
	}
	return p
}

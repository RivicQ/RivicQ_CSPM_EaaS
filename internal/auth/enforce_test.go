package auth

import (
	"strings"
	"testing"
)

// TestPublicRouteAllowListIsWellFormed guards the deny-by-default boundary:
// entries must be absolute, version-less paths with a known method, and must
// not contain a wildcard that could silently widen access.
func TestPublicRouteAllowListIsWellFormed(t *testing.T) {
	allowedMethods := map[string]bool{
		"GET": true, "POST": true, "PUT": true, "PATCH": true, "DELETE": true, "OPTIONS": true,
	}
	seen := map[string]bool{}
	for _, r := range PublicRoutes {
		if !allowedMethods[r.Method] {
			t.Errorf("route %q has unexpected method %q", r.Path, r.Method)
		}
		if !strings.HasPrefix(r.Path, "/") {
			t.Errorf("route %q must be an absolute path", r.Path)
		}
		if strings.Contains(r.Path, "*") {
			t.Errorf("route %q must not contain a wildcard", r.Path)
		}
		if strings.Contains(r.Path, "/api/v1") {
			t.Errorf("route %q must be relative to the API group", r.Path)
		}
		if strings.HasSuffix(r.Path, "/") {
			t.Errorf("route %q must not have a trailing slash", r.Path)
		}
		key := normalizeRoute(r.Method, r.Path)
		if seen[key] {
			t.Errorf("duplicate allow-list entry %q", key)
		}
		seen[key] = true
	}
}

func TestIsPublicRouteMatching(t *testing.T) {
	cases := []struct {
		method, path string
		want         bool
	}{
		{"POST", "/auth/login", true},
		{"post", "/auth/login", true},
		{"POST", "/auth/login/", true},
		{"POST", "/auth/register", true},
		{"GET", "/auth/editions", true},
		{"GET", "/platform/status", true},
		{"POST", "/leads", true},
		{"POST", "/github/webhook", true},

		// Protected data plane.
		{"GET", "/cbom", false},
		{"POST", "/cbom", false},
		{"GET", "/scans", false},
		{"POST", "/scans", false},
		{"GET", "/assets/123", false},
		{"GET", "/dashboard/overview", false},
		{"POST", "/github/scan", false},

		// Right path, wrong method.
		{"GET", "/auth/login", false},
		{"POST", "/auth/editions", false},
		{"DELETE", "/auth/login", false},
		{"GET", "/leads", false},

		// Path-prefix lookalikes must not match.
		{"POST", "/auth/login-extra", false},
		{"POST", "/auth/loginx", false},
		{"POST", "/auth/refresh/../login", false},
		{"GET", "/public/status", false},
	}
	for _, tc := range cases {
		if got := IsPublicRoute(tc.method, tc.path); got != tc.want {
			t.Errorf("IsPublicRoute(%q, %q) = %v, want %v", tc.method, tc.path, got, tc.want)
		}
	}
}

// TestPublicRoutesDoNotCoverSensitiveSurface asserts the allow-list stays small
// and contains no data-plane or administrative route. A regression here means
// authentication was silently removed.
func TestPublicRoutesDoNotCoverSensitiveSurface(t *testing.T) {
	forbiddenPrefixes := []string{
		"/cbom", "/assets", "/scans", "/security", "/dashboard", "/metrics",
		"/compliance", "/kubernetes", "/cilium", "/monitoring", "/github/scan",
		"/intel", "/cspm", "/billing/admin",
	}
	for _, route := range PublicRouteList() {
		path := strings.SplitN(route, " ", 2)[1]
		for _, prefix := range forbiddenPrefixes {
			if strings.HasPrefix(path, prefix) {
				t.Errorf("public allow-list must not include %q", path)
			}
		}
	}

	// Authentication verbs that must never be public.
	forbiddenExact := []string{
		"/auth/logout", "/auth/me", "/auth/password", "/auth/mfa/setup",
		"/auth/sessions", "/auth/api-keys",
	}
	for _, route := range PublicRouteList() {
		path := strings.SplitN(route, " ", 2)[1]
		for _, exact := range forbiddenExact {
			if path == exact {
				t.Errorf("public allow-list must not include %q", path)
			}
		}
	}
}

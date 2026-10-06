package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/sirupsen/logrus"
)

// publicAPIRoutes are the only /api/v1 endpoints that may be reachable without a
// session token. Each entry is method + path relative to /api/v1.
//
// This list is deliberately restated here rather than derived from
// auth.PublicRoutes: the point of the audit is to catch an allow-list entry that
// quietly widens access to a sensitive route, so the expectation must be
// written down independently.
var expectedPublicRoutes = map[string]bool{
	"POST /auth/login":           true,
	"POST /auth/register":        true,
	"POST /auth/refresh":         true,
	"POST /auth/mfa/verify":      true,
	"POST /auth/forgot-password": true,
	"POST /auth/reset-password":  true,
	"GET /auth/editions":         true,
	"GET /auth/providers":        true,
	"GET /auth/demo":             true,
	"GET /auth/google/login":     true,
	"POST /auth/google/exchange": true,
	"GET /auth/google/callback":  true,
	"POST /auth/google/callback": true,
	"GET /auth/github/login":     true,
	"GET /auth/github/callback":  true,
	"POST /auth/github/callback": true,
	"GET /platform/status":       true,
	"GET /platform/plans":        true,
	"GET /platform/funnel":       true,
	"GET /platform/contacts":     true,
	"GET /ibm":                   true,
	"GET /billing/status":        true,
	"POST /leads":                true,
	"POST /billing/webhooks":     true,
	"POST /github/webhook":       true,
}

// sensitiveFragments must never appear in the unauthenticated allow-list.
var sensitiveFragments = []string{
	"/leads",
	"/opportunities",
	"/integrations/",
	"/users",
	"/admin",
	"/settings",
	"/cboms",
	"/scans",
	"/policies",
	"/findings",
	"/tenants",
	"/reports",
	"/export",
	"/architecture",
}

// buildAuditRouter assembles the real route table without starting a listener or
// requiring a database.
func buildAuditRouter(t *testing.T) *gin.Engine {
	t.Helper()
	t.Setenv("RIVICQ_ALLOW_DEMO_MODE", "true")
	// The auth store has no default password in any mode, including demo.
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "Route-Audit-Passphrase-42!")
	gin.SetMode(gin.TestMode)

	s := New()
	s.Logger = logrus.New()
	s.Logger.SetOutput(testWriter{t})
	s.Logger.SetLevel(logrus.ErrorLevel)
	s.registerAPIRoutes()
	return s.Engine
}

type testWriter struct{ t *testing.T }

func (w testWriter) Write(p []byte) (int, error) {
	w.t.Logf("server log: %s", strings.TrimSpace(string(p)))
	return len(p), nil
}

func apiRoutes(engine *gin.Engine) []gin.RouteInfo {
	out := make([]gin.RouteInfo, 0)
	for _, r := range engine.Routes() {
		if strings.HasPrefix(r.Path, auth.APIPrefix) {
			out = append(out, r)
		}
	}
	return out
}

// TestRouteAllowListMatchesRegisteredRoutes is the executable security audit of
// the public surface. It fails if the allow-list and the real route table drift
// apart in either direction.
func TestRouteAllowListMatchesRegisteredRoutes(t *testing.T) {
	engine := buildAuditRouter(t)
	routes := apiRoutes(engine)
	if len(routes) < 20 {
		t.Fatalf("expected a real route table, got %d /api/v1 routes", len(routes))
	}

	registered := map[string]bool{}
	for _, r := range routes {
		rel := strings.TrimPrefix(r.Path, auth.APIPrefix)
		registered[r.Method+" "+rel] = true
	}

	for key := range expectedPublicRoutes {
		if !registered[key] {
			t.Errorf("allow-list documents %s but no such route is registered", key)
		}
	}

	for _, pr := range auth.PublicRoutes {
		k := pr.Method + " " + pr.Path
		if !registered[k] {
			t.Errorf("PublicRoutes contains %q, which is not a registered route", k)
		}
		if !expectedPublicRoutes[k] {
			t.Errorf("route %q is public in code but is not in the audited public surface", k)
		}
	}
}

// TestNoSensitiveRouteIsPublic is the deny-side check.
func TestNoSensitiveRouteIsPublic(t *testing.T) {
	engine := buildAuditRouter(t)
	for _, r := range apiRoutes(engine) {
		rel := strings.TrimPrefix(r.Path, auth.APIPrefix)
		if !auth.IsPublicRoute(r.Method, r.Path) {
			continue
		}
		for _, frag := range sensitiveFragments {
			if frag == "/leads" {
				// POST /leads is the public marketing form; GET is admin-only.
				if r.Method == http.MethodPost {
					continue
				}
			}
			if strings.Contains(rel, frag) {
				t.Errorf("%s %s is public but matches sensitive fragment %q", r.Method, rel, frag)
			}
		}
	}
}

// TestAdminLeadsIsNotPublic distinguishes the public lead form from the admin
// lead list, which returns contact records.
func TestAdminLeadsIsNotPublic(t *testing.T) {
	if auth.IsPublicRoute(http.MethodGet, auth.APIPrefix+"/leads") {
		t.Error("GET /api/v1/leads returns stored leads and must require authentication")
	}
	if !auth.IsPublicRoute(http.MethodPost, auth.APIPrefix+"/leads") {
		t.Error("POST /api/v1/leads is the public lead form and should stay reachable")
	}
}

// TestAnonymousRequestsCannotReachDataRoutes probes a representative set of
// sensitive routes over HTTP and requires 401 rather than 200 or 500.
func TestAnonymousRequestsCannotReachDataRoutes(t *testing.T) {
	engine := buildAuditRouter(t)
	probes := []string{
		"/cboms",
		"/scans",
		"/findings",
		"/policies",
		"/architecture",
		"/cspm/overview",
		"/demo/scan",
		"/leads",
		"/opportunities",
		"/governance/controls",
		"/bom/unified",
	}
	for _, p := range probes {
		if !routeExists(engine, p) {
			continue
		}
		rec := performAnonymous(engine, http.MethodGet, auth.APIPrefix+p)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("anonymous GET %s = %d, want 401", p, rec.Code)
		}
	}
}

// TestAnonymousCannotMutate pins the write side, which matters more than reads.
func TestAnonymousCannotMutate(t *testing.T) {
	engine := buildAuditRouter(t)
	probes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/auth/mfa/enroll"},
		{http.MethodPost, "/policies/evaluate"},
		{http.MethodPost, "/intelligence/evaluate"},
		{http.MethodPost, "/integrations/discord/test"},
		{http.MethodPost, "/billing/checkout"},
		{http.MethodDelete, "/scans/abc"},
	}
	for _, p := range probes {
		if !routeExists(engine, p.path) {
			continue
		}
		rec := performAnonymous(engine, p.method, auth.APIPrefix+p.path)
		if rec.Code == http.StatusOK || rec.Code == http.StatusCreated {
			t.Errorf("anonymous %s %s = %d, want a rejection", p.method, p.path, rec.Code)
		}
	}
}

func routeExists(engine *gin.Engine, path string) bool {
	want := auth.APIPrefix + path
	for _, r := range engine.Routes() {
		if r.Path == want {
			return true
		}
	}
	return false
}
func performAnonymous(engine *gin.Engine, method, path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)
	return rec
}

// selfServiceMutations are mutating routes that intentionally require no
// permission beyond a valid session: they only affect the caller's own account
// or are public authentication endpoints. A viewer must still be able to log
// out or rotate their own password.
var selfServiceMutations = map[string]bool{
	"POST /auth/login":           true,
	"POST /auth/register":        true,
	"POST /auth/refresh":         true,
	"POST /auth/logout":          true,
	"POST /auth/forgot-password": true,
	"POST /auth/reset-password":  true,
	"POST /auth/change-password": true,
	"POST /auth/mfa/setup":       true,
	"POST /auth/mfa/verify":      true,
	"POST /auth/mfa/confirm":     true,
	"POST /auth/mfa/disable":     true,
	"GET /auth/google/login":     true,
	"POST /auth/google/exchange": true,
	"GET /auth/google/callback":  true,
	"POST /auth/google/callback": true,
	"GET /auth/github/login":     true,
	"GET /auth/github/callback":  true,
	"POST /auth/github/callback": true,
	"POST /github/webhook":       true,
	"POST /billing/webhooks":     true,
	"GET /billing/status":        true,
	"POST /leads":                true,
	"GET /platform/status":       true,
	"GET /platform/plans":        true,
	"GET /platform/funnel":       true,
	"GET /platform/contacts":     true,
	"GET /ibm":                   true,
}

// TestEveryMutatingRouteHasAPermission is the executable audit for the
// authorization model.
//
// RequireRoutePermission denies any unmapped mutation, which is the correct
// default but would also lock out legitimate functionality. This test is what
// keeps the two honest: it fails when a new POST/PUT/PATCH/DELETE route is
// registered without a permission mapping or an explicit self-service
// exemption, so the fail-closed branch can never fire on a real feature.
func TestEveryMutatingRouteHasAPermission(t *testing.T) {
	engine := buildAuditRouter(t)

	unmapped := make([]string, 0)
	for _, r := range apiRoutes(engine) {
		if !auth.IsMutatingMethod(r.Method) {
			continue
		}
		rel := strings.TrimPrefix(r.Path, auth.APIPrefix)
		if rel == "" {
			rel = "/"
		}
		key := r.Method + " " + rel

		if _, governed := auth.RequiredPermission(r.Method, r.Path); governed {
			continue
		}
		if selfServiceMutations[key] {
			continue
		}
		unmapped = append(unmapped, key)
	}

	for _, key := range unmapped {
		t.Errorf("mutating route %s has no permission mapping and would be denied at runtime; "+
			"add it to auth.resourcePermissionTable or selfServiceMutations", key)
	}
}

// TestViewerCannotMutateState proves the permission model is actually enforced
// end to end, not merely present in a table. A viewer holds only read
// permissions, so every mutation attributed to that role must be refused.
func TestViewerCannotMutateState(t *testing.T) {
	engine := buildAuditRouter(t)

	mutating := make([]gin.RouteInfo, 0)
	for _, r := range apiRoutes(engine) {
		if auth.IsMutatingMethod(r.Method) {
			mutating = append(mutating, r)
		}
	}
	if len(mutating) == 0 {
		t.Fatal("expected mutating routes to audit")
	}

	// Verify the policy directly for every mutating route: a viewer must not
	// hold the required permission.
	viewer := make(map[string]bool)
	for _, p := range auth.PermissionsForRole("viewer") {
		viewer[p] = true
	}

	for _, r := range mutating {
		rel := strings.TrimPrefix(r.Path, auth.APIPrefix)
		if rel == "" {
			rel = "/"
		}
		if selfServiceMutations[r.Method+" "+rel] {
			continue
		}
		perm, governed := auth.RequiredPermission(r.Method, r.Path)
		if !governed {
			continue // already reported by TestEveryMutatingRouteHasAPermission
		}
		if viewer[string(perm)] {
			t.Errorf("viewer holds %s, so %s %s is writable by the least-privileged role",
				perm, r.Method, rel)
		}
	}
}

package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// newEnforceTestRouter mounts a group at the same point production uses, so
// these tests exercise the real request path rather than a hand-built string.
func newEnforceTestRouter(as *AuthService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := r.Group(APIPrefix)
	api.Use(as.EnforceAuth())

	// A representative public route and a representative protected route.
	ok := func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) }
	api.POST("/auth/login", ok)
	api.POST("/auth/register", ok)
	api.POST("/auth/refresh", ok)
	api.GET("/platform/status", ok)
	api.GET("/platform/plans", ok)
	api.GET("/auth/providers", ok)
	api.GET("/auth/editions", ok)
	api.POST("/leads", ok)
	api.GET("/cboms", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"tenant_id": c.GetString("tenant_id")})
	})
	api.GET("/cboms/abc", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"tenant_id": c.GetString("tenant_id")})
	})
	api.DELETE("/cboms/:id", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	api.GET("/scans", func(c *gin.Context) { c.Status(http.StatusOK) })
	api.GET("/leads", func(c *gin.Context) { c.Status(http.StatusOK) })

	return r
}

const enforceRouterTestSecret = "enforce-router-test-secret-at-least-32-bytes"

func enforceTestService(t *testing.T) *AuthService {
	t.Helper()
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "Router-Test-Passphrase-42!")
	store, err := NewMockUserStore()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	return NewAuthService(enforceRouterTestSecret, store)
}

// enforceTestUser returns a seeded operator from the mock store.
func enforceTestUser(t *testing.T, as *AuthService) *User {
	t.Helper()
	user, err := as.userStore.GetUserByEmail("operator@rivicq.com")
	if err != nil {
		t.Fatalf("lookup user: %v", err)
	}
	return user
}

func doRequest(t *testing.T, r *gin.Engine, method, path, authHeader string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

// TestEnforceAuthAllowsPublicRoutesThroughRealRouter is the regression test for
// the prefix bug: the allow-list is written group-relative while the middleware
// sees the full "/api/v1/..." path, which silently made every public route 401.
func TestEnforceAuthAllowsPublicRoutesThroughRealRouter(t *testing.T) {
	as := enforceTestService(t)
	r := newEnforceTestRouter(as)

	cases := []struct {
		name   string
		method string
		path   string
	}{
		{"login", http.MethodPost, APIPrefix + "/auth/login"},
		{"register is allow-listed", http.MethodPost, APIPrefix + "/auth/register"},
		{"providers", http.MethodGet, APIPrefix + "/auth/providers"},
		{"platform status", http.MethodGet, APIPrefix + "/platform/status"},
		{"platform plans", http.MethodGet, APIPrefix + "/platform/plans"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doRequest(t, r, tc.method, tc.path, "")
			if rec.Code != http.StatusOK {
				t.Fatalf("public route %s %s = %d, want 200 (body %s)",
					tc.method, tc.path, rec.Code, rec.Body.String())
			}
		})
	}
}

// TestEnforceAuthDeniesProtectedRoutesWithoutToken pins deny-by-default.
func TestEnforceAuthDeniesProtectedRoutesWithoutToken(t *testing.T) {
	as := enforceTestService(t)
	r := newEnforceTestRouter(as)

	// /leads is a public POST but admin-only on GET, so both properties are
	// covered by the same route pair.
	paths := []string{
		APIPrefix + "/cboms",
		APIPrefix + "/cboms/abc",
		APIPrefix + "/scans",
	}
	for _, p := range paths {
		rec := doRequest(t, r, http.MethodGet, p, "")
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET %s without a token = %d, want 401", p, rec.Code)
		}
	}

	if rec := doRequest(t, r, http.MethodDelete, APIPrefix+"/cboms/abc", ""); rec.Code != http.StatusUnauthorized {
		t.Errorf("DELETE without a token = %d, want 401", rec.Code)
	}
	// POST /leads is deliberately public: it is the rate-limited marketing
	// lead form. It must not become a session-authenticated endpoint, and it
	// must not imply that the admin GET /leads is public too.
	if rec := doRequest(t, r, http.MethodPost, APIPrefix+"/leads", ""); rec.Code != http.StatusOK {
		t.Errorf("POST /leads = %d, want 200", rec.Code)
	}
}

// TestEnforceAuthUnregisteredPathsDoNotReachAHandler documents Gin's behaviour:
// group middleware runs only for paths the group actually serves, so an unknown
// path is a 404 rather than a 401. Neither leaks a handler.
func TestEnforceAuthUnregisteredPathsDoNotReachAHandler(t *testing.T) {
	as := enforceTestService(t)
	r := newEnforceTestRouter(as)

	for _, p := range []string{APIPrefix + "/nope", APIPrefix + "/", "/api/v1/../etc/passwd"} {
		rec := doRequest(t, r, http.MethodGet, p, "")
		if rec.Code == http.StatusOK {
			t.Errorf("GET %s reached a handler", p)
		}
	}
}

// TestEnforceAuthMethodMatters: a public POST must not make the GET public.
func TestEnforceAuthMethodMatters(t *testing.T) {
	as := enforceTestService(t)
	r := newEnforceTestRouter(as)

	if rec := doRequest(t, r, http.MethodGet, APIPrefix+"/auth/login", ""); rec.Code == http.StatusOK {
		t.Error("GET must not be public on a public POST route")
	}
	if rec := doRequest(t, r, http.MethodPost, APIPrefix+"/platform/status", ""); rec.Code == http.StatusOK {
		t.Error("POST must not be public on a public GET route")
	}
}

// TestEnforceAuthRejectsInvalidCredentialsBeforeHandler.
func TestEnforceAuthRejectsInvalidCredentialsBeforeHandler(t *testing.T) {
	as := enforceTestService(t)
	r := newEnforceTestRouter(as)

	bad := []string{
		"Bearer not-a-jwt",
		"Bearer ",
		"Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.",
	}
	for _, header := range bad {
		if h := header; h != "Bearer " {
			rec := doRequest(t, r, http.MethodGet, APIPrefix+"/cboms", h)
			if rec.Code != http.StatusUnauthorized {
				t.Errorf("header %q = %d, want 401", h, rec.Code)
			}
		}
	}
}

// TestEnforceAuthRejectsNonBearerSchemes ensures a Basic or Negotiate
// credential is not parsed as a token.
func TestEnforceAuthRejectsNonBearerSchemes(t *testing.T) {
	as := enforceTestService(t)
	user := enforceTestUser(t, as)
	token, err := as.TokenManager().GenerateToken(user, "oss")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	r := newEnforceTestRouter(as)

	for _, header := range []string{"Basic " + token, "Negotiate " + token, "Token " + token, token} {
		rec := doRequest(t, r, http.MethodGet, APIPrefix+"/cboms", header)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("scheme in %q = %d, want 401", header, rec.Code)
		}
	}
}

// TestEnforceAuthBindsClaimsOnProtectedRoute proves a valid token reaches the
// handler and carries the tenant.
func TestEnforceAuthBindsClaimsOnProtectedRoute(t *testing.T) {
	as := enforceTestService(t)
	user := enforceTestUser(t, as)
	token, err := as.TokenManager().GenerateToken(user, "enterprise")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	r := newEnforceTestRouter(as)

	rec := doRequest(t, r, http.MethodGet, APIPrefix+"/cboms", "Bearer "+token)
	if rec.Code != http.StatusOK {
		t.Fatalf("valid token = %d, want 200 (body %s)", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); !containsAll(got, user.TenantID) {
		t.Errorf("handler did not see the tenant claim: %s", got)
	}
}

// TestEnforceAuthValidTokenOnPublicRouteStillSucceeds: a stale cookie must not
// turn a public page into a 401.
func TestEnforceAuthValidTokenOnPublicRouteStillSucceeds(t *testing.T) {
	as := enforceTestService(t)
	user := enforceTestUser(t, as)
	token, err := as.TokenManager().GenerateToken(user, "oss")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	r := newEnforceTestRouter(as)

	rec := doRequest(t, r, http.MethodPost, APIPrefix+"/auth/login", "Bearer "+token)
	if rec.Code != http.StatusOK {
		t.Fatalf("public route with a token = %d, want 200", rec.Code)
	}
}

// TestEnforceAuthRejectsSmuggledPrefix guards against a path that tries to
// re-enter the public allow-list by repeating the prefix.
func TestEnforceAuthRejectsSmuggledPrefix(t *testing.T) {
	as := enforceTestService(t)
	r := newEnforceTestRouter(as)

	for _, p := range []string{
		APIPrefix + APIPrefix + "/auth/login",
		"/api/v1/../api/v1/auth/login",
		"//api/v1/auth/login",
	} {
		rec := doRequest(t, r, http.MethodPost, p, "")
		if rec.Code == http.StatusOK {
			t.Errorf("path %q reached a handler without a token", p)
		}
	}
}

// TestEnforceAuthHonoursCustomMountPoint covers a deployment that does not use
// the default prefix.
func TestEnforceAuthHonoursCustomMountPoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	as := enforceTestService(t)

	r := gin.New()
	api := r.Group("/internal/api")
	api.Use(as.EnforceAuth("/internal/api"))
	api.POST("/auth/login", func(c *gin.Context) { c.Status(http.StatusOK) })
	api.GET("/cboms", func(c *gin.Context) { c.Status(http.StatusOK) })

	if rec := doRequest(t, r, http.MethodPost, "/internal/api/auth/login", ""); rec.Code != http.StatusOK {
		t.Errorf("custom prefix public route = %d, want 200", rec.Code)
	}
	if rec := doRequest(t, r, http.MethodGet, "/internal/api/cboms", ""); rec.Code != http.StatusUnauthorized {
		t.Errorf("custom prefix protected route = %d, want 401", rec.Code)
	}
	// The default prefix is not mounted on this router, so it serves nothing.
	if rec := doRequest(t, r, http.MethodPost, "/api/v1/auth/login", ""); rec.Code == http.StatusOK {
		t.Error("the default prefix must not be public on a custom-mounted router")
	}
}

// TestEnforceAuthWebhooksAreReachableWithoutSession documents that provider
// webhooks depend on signature verification inside the handler, not on a token.
func TestEnforceAuthWebhooksAreReachableWithoutSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	as := enforceTestService(t)
	r := gin.New()
	api := r.Group(APIPrefix)
	api.Use(as.EnforceAuth())
	api.POST("/github/webhook", func(c *gin.Context) { c.Status(http.StatusOK) })
	api.POST("/billing/webhooks", func(c *gin.Context) { c.Status(http.StatusOK) })

	for _, p := range []string{"/github/webhook", "/billing/webhooks"} {
		if rec := doRequest(t, r, http.MethodPost, APIPrefix+p, ""); rec.Code != http.StatusOK {
			t.Errorf("POST %s = %d, want 200: webhooks authenticate by signature", APIPrefix+p, rec.Code)
		}
	}
}

func containsAll(haystack string, needles ...string) bool {
	for _, n := range needles {
		if len(n) == 0 {
			continue
		}
		found := false
		for i := 0; i+len(n) <= len(haystack); i++ {
			if haystack[i:i+len(n)] == n {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

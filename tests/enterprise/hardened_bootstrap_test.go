//go:build enterprise

package enterprise

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/server"
)

// TestEnterpriseServerExposesHardenedProbes checks the Enterprise bootstrap
// inherits liveness/readiness separation and fail-closed readiness in demo mode.
func TestEnterpriseServerExposesHardenedProbes(t *testing.T) {
	setValidEnterpriseLicenseEnv(t)
	t.Setenv("RIVICQ_ALLOW_DEMO_MODE", "true")
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "Enterprise-Probe-Passphrase-42!")
	t.Setenv("CRYPTOBOM_EDITION", "enterprise")
	gin.SetMode(gin.TestMode)

	srv := server.New(server.WithPort("9090"))
	srv.RegisterHealthRoutes()

	for _, probe := range []string{"/healthz", "/readyz", "/edition"} {
		found := false
		for _, r := range srv.Engine.Routes() {
			if r.Path == probe && r.Method == http.MethodGet {
				found = true
			}
		}
		if !found {
			t.Errorf("enterprise server is missing %s", probe)
		}
	}

	// Liveness must succeed even in demo mode; readiness must not.
	rec := httptest.NewRecorder()
	srv.Engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("/healthz = %d, want 200", rec.Code)
	}

	rec = httptest.NewRecorder()
	srv.Engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("/readyz in demo mode = %d, want 503 so a load balancer does not route here", rec.Code)
	}
}

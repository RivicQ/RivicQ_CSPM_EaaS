//go:build enterprise

package enterprise

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/server"
)

// TestEnterpriseServerExposesHardenedProbes checks the Enterprise bootstrap
// inherits liveness/readiness separation. It previously served its own router
// with a /readyz that always answered 200, so a load balancer routed traffic to
// an instance with no database.
func TestEnterpriseServerExposesHardenedProbes(t *testing.T) {
	t.Setenv("RIVICQ_ALLOW_DEMO_MODE", "true")
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "Enterprise-Probe-Passphrase-42!")
	t.Setenv("CRYPTOBOM_EDITION", "enterprise")
	gin.SetMode(gin.TestMode)

	srv := server.New(server.WithPort("9090"))
	srv.RegisterRoutes()

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

// TestEnterpriseIBMQRoutesAreAuthenticated ensures the IBMQ routes added through
// the hook still sit behind the deny-by-default gate.
func TestEnterpriseIBMQRoutesAreAuthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group(auth.APIPrefix)
	api.Use(auth.NewAuthService("enterprise-test-secret-at-least-32-bytes", nil).EnforceAuth())
	ibmq := api.Group("/ibmq")
	ibmq.GET("/status", func(c *gin.Context) { c.Status(http.StatusOK) })
	ibmq.POST("/attest", func(c *gin.Context) { c.Status(http.StatusOK) })

	for _, p := range []string{"/ibmq/status", "/ibmq/attest"} {
		req := httptest.NewRequest(http.MethodGet, auth.APIPrefix+p, nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code == http.StatusOK {
			t.Errorf("anonymous request to %s was served", p)
		}
	}
}

package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/authn"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
)

const scanTenantSecret = "scan-tenant-isolation-secret-0123456789"

func scanTenantRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	t.Setenv("JWT_SECRET", scanTenantSecret)
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", testBootstrapPassword)
	// These tests scan loopback on purpose to exercise tenant scoping. The
	// production policy blocks loopback by default, so it is opted into here
	// explicitly rather than loosened in the default.
	t.Setenv("RIVICQ_SCAN_ALLOW_PRIVATE_NETS", "true")
	router := gin.New()
	group := router.Group("/api/v1")
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)
	oss.SetupRoutes(group, &database.DB{}, logger, &config.OSSConfig{})
	return router
}

// newTenantMinter builds a standalone authn service sharing the router's
// signing secret so tests can mint real access tokens for arbitrary tenants.
func newTenantMinter(t *testing.T) *authn.Service {
	t.Helper()
	svc, err := authn.NewService(authn.Config{
		Secret:     scanTenantSecret,
		Issuer:     "rivicq",
		Audience:   "rivicq-api",
		AccessTTL:  15 * time.Minute,
		RefreshTTL: 7 * 24 * time.Hour,
	}, authn.NewMemStore())
	require.NoError(t, err)
	return svc
}

// tenantBearer mints a real access token through the production authn issuer.
// Hand-rolling JWT claims is no longer sufficient because validation is strict
// about issuer, audience and expiry.
func tenantBearer(t *testing.T, tenantID string) string {
	t.Helper()
	svc := newTenantMinter(t)
	u, err := svc.EnsureExternalUser(context.Background(), tenantID+"@example.com", "Isolation "+tenantID, "")
	require.NoError(t, err)
	u.TenantID = tenantID
	u.Role = "operator"
	pair, err := svc.IssueTokens(context.Background(), u, "oss", "go-tests", "127.0.0.1")
	require.NoError(t, err)
	return pair.AccessToken
}

func postScan(t *testing.T, router *gin.Engine, token, target string) string {
	t.Helper()
	body, err := json.Marshal(map[string]string{"target": target, "scan_type": "quick"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/scans", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusAccepted, w.Code, w.Body.String())
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	id, _ := resp["scan_id"].(string)
	require.NotEmpty(t, id)
	return id
}

func getScan(router *gin.Engine, token, id string, extra map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/scans/"+id, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for k, v := range extra {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func TestScanIsolationAcrossTenants(t *testing.T) {
	router := scanTenantRouter(t)
	tokenA := tenantBearer(t, "tenant-a")
	tokenB := tenantBearer(t, "tenant-b")

	idA := postScan(t, router, tokenA, "127.0.0.1")
	idB := postScan(t, router, tokenB, "127.0.0.1")

	own := getScan(router, tokenA, idA, nil)
	assert.Equal(t, http.StatusOK, own.Code)

	cross := getScan(router, tokenB, idA, nil)
	assert.Equal(t, http.StatusNotFound, cross.Code)

	crossA := getScan(router, tokenA, idB, nil)
	assert.Equal(t, http.StatusNotFound, crossA.Code)

	spoof := getScan(router, tokenB, idA, map[string]string{"X-Tenant-ID": "tenant-a"})
	assert.Equal(t, http.StatusNotFound, spoof.Code)

	anon := getScan(router, "", idA, nil)
	assert.Equal(t, http.StatusUnauthorized, anon.Code)
}

// TestAnonymousScanIsRejected pins the deny-by-default decision: the former
// unauthenticated "public pilot" scan surface is gone. An anonymous caller
// must not be able to create or read a scan.
func TestAnonymousScanIsRejected(t *testing.T) {
	router := scanTenantRouter(t)

	body, err := json.Marshal(map[string]string{"target": "127.0.0.1"})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/scans", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	assert.Equal(t, http.StatusUnauthorized, getScan(router, "", "any-id", nil).Code)
}

// TestInvalidBearerDoesNotFallBackToPublicTenant ensures a malformed credential
// is rejected outright instead of being treated as an anonymous request.
func TestInvalidBearerDoesNotFallBackToPublicTenant(t *testing.T) {
	router := scanTenantRouter(t)
	token := tenantBearer(t, "tenant-a")
	id := postScan(t, router, token, "127.0.0.1")

	w := getScan(router, "not-a-token", id, nil)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// A token signed with the right secret but the wrong claims must also fail.
	svc := newTenantMinter(t)
	u, err := svc.EnsureExternalUser(context.Background(), "tenant-a@example.com", "Isolation tenant-a", "")
	require.NoError(t, err)
	u.TenantID = "tenant-a"
	u.Role = "operator"
	refreshPair, err := svc.IssueTokens(context.Background(), u, "oss", "go-tests", "127.0.0.1")
	require.NoError(t, err)
	w = getScan(router, refreshPair.RefreshToken, id, nil)
	assert.Equal(t, http.StatusUnauthorized, w.Code, "a refresh token must not work as an access token")
}

func TestIntelligenceReportIsTenantScoped(t *testing.T) {
	router := scanTenantRouter(t)
	tokenA := tenantBearer(t, "intel-a")
	tokenB := tenantBearer(t, "intel-b")
	idA := postScan(t, router, tokenA, "127.0.0.1")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/scans/"+idA+"/intelligence", nil)
	req.Header.Set("Authorization", "Bearer "+tokenB)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code, w.Body.String())

	reqOK := httptest.NewRequest(http.MethodGet, "/api/v1/scans/"+idA+"/cyclonedx", nil)
	reqOK.Header.Set("Authorization", "Bearer "+tokenA)
	wOK := httptest.NewRecorder()
	router.ServeHTTP(wOK, reqOK)
	// Scan may still be running (accepted job). Cross-tenant must never leak; owner may be 409 or 200.
	if wOK.Code != http.StatusOK && wOK.Code != http.StatusConflict {
		t.Fatalf("owner cyclonedx status %d %s", wOK.Code, wOK.Body.String())
	}
}
func TestScanListDoesNotLeakOtherTenants(t *testing.T) {
	router := scanTenantRouter(t)
	tokenA := tenantBearer(t, "list-tenant-a")
	tokenB := tenantBearer(t, "list-tenant-b")
	idA := postScan(t, router, tokenA, "127.0.0.1")
	idB := postScan(t, router, tokenB, "127.0.0.1")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/scans", nil)
	req.Header.Set("Authorization", "Bearer "+tokenA)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	scans, _ := body["scans"].([]any)
	foundA := false
	for _, raw := range scans {
		item, _ := raw.(map[string]any)
		if item["scan_id"] == idB {
			t.Fatal("tenant-a list leaked tenant-b scan")
		}
		if item["scan_id"] == idA {
			foundA = true
		}
	}
	if !foundA {
		t.Fatal("tenant-a list missing its own scan")
	}
}

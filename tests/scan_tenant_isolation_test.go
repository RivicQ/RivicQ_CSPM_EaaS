package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
)

const scanTenantSecret = "scan-tenant-isolation-secret"

func scanTenantRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	t.Setenv("JWT_SECRET", scanTenantSecret)
	router := gin.New()
	group := router.Group("/api/v1")
	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel)
	oss.SetupRoutes(group, &database.DB{}, logger, &config.OSSConfig{})
	return router
}

func tenantBearer(tenantID string) string {
	claims := jwt.MapClaims{
		"user_id":   uuid.New().String(),
		"tenant_id": tenantID,
		"email":     tenantID + "@example.com",
		"role":      "operator",
		"exp":       time.Now().Add(time.Hour).Unix(),
		"iat":       time.Now().Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := tok.SignedString([]byte(scanTenantSecret))
	return s
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
	tokenA := tenantBearer("tenant-a")
	tokenB := tenantBearer("tenant-b")

	idA := postScan(t, router, tokenA, "127.0.0.1")
	idB := postScan(t, router, tokenB, "127.0.0.1")

	own := getScan(router, tokenA, idA, nil)
	assert.Equal(t, http.StatusOK, own.Code)

	cross := getScan(router, tokenB, idA, nil)
	assert.Equal(t, http.StatusNotFound, cross.Code)

	crossA := getScan(router, tokenA, idB, nil)
	assert.Equal(t, http.StatusNotFound, crossA.Code)

	spoof := getScan(router, "", idA, map[string]string{"X-Tenant-ID": "tenant-a"})
	assert.Equal(t, http.StatusNotFound, spoof.Code)

	anon := getScan(router, "", idA, nil)
	assert.Equal(t, http.StatusNotFound, anon.Code)
}

func TestPublicScanPilotStillWorksWithoutAuth(t *testing.T) {
	router := scanTenantRouter(t)
	id := postScan(t, router, "", "127.0.0.1")
	got := getScan(router, "", id, nil)
	assert.Equal(t, http.StatusOK, got.Code)
}

func TestInvalidBearerDoesNotFallBackToPublicTenant(t *testing.T) {
	router := scanTenantRouter(t)
	id := postScan(t, router, "", "127.0.0.1")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/scans/"+id, nil)
	req.Header.Set("Authorization", "Bearer not-a-token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestIntelligenceReportIsTenantScoped(t *testing.T) {
	router := scanTenantRouter(t)
	tokenA := tenantBearer("intel-a")
	tokenB := tenantBearer("intel-b")
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
	tokenA := tenantBearer("list-tenant-a")
	tokenB := tenantBearer("list-tenant-b")
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

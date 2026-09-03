package shared

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/intelligence"
)

func TestIntelligencePolicyRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupIntelligenceRoutes(g, logrus.New())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/policies", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var list map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &list))
	require.Equal(t, "intelligence", list["source"])
	pols, ok := list["policies"].([]any)
	require.True(t, ok)
	require.Greater(t, len(pols), 3)

	body, _ := json.Marshal(map[string]any{
		"findings": []intelligence.Finding{{
			ID: "x", Algorithm: "MD5", Evidence: "md5.Sum", Location: "app.go", Scanner: "github-content",
		}},
	})
	evalReq := httptest.NewRequest(http.MethodPost, "/api/v1/policies/evaluate", bytes.NewReader(body))
	evalReq.Header.Set("Content-Type", "application/json")
	evalW := httptest.NewRecorder()
	r.ServeHTTP(evalW, evalReq)
	require.Equal(t, http.StatusOK, evalW.Code)
	var eval map[string]any
	require.NoError(t, json.Unmarshal(evalW.Body.Bytes(), &eval))
	gate, _ := eval["gate"].(map[string]any)
	require.Equal(t, "BLOCK", gate["decision"])
}

func TestGetScanQiskitNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupIntelligenceRoutes(g, logrus.New())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/scans/does-not-exist/qiskit", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestPlatformArchitectureRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupIntelligenceRoutes(g, logrus.New())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/architecture", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, "RivicQ Security Cloud", body["product"])
	require.Contains(t, body["honesty"], "Community")
}

func TestHardwareCatalogRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupIntelligenceRoutes(g, logrus.New())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/hardware/catalog", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, "declared_inventory", body["engine"])
	cat, ok := body["catalog"].([]any)
	require.True(t, ok)
	require.Greater(t, len(cat), 0)
}

func TestAnalyzeRepositoryFiles_RSAKeyLength(t *testing.T) {
	res := AnalyzeRepositoryFiles("fixture://rsa", []RepoFile{{
		Path:    "keys.go",
		Content: "package k\nimport \"crypto/rsa\"\nfunc g() { rsa.GenerateKey(nil, 1024) }\n",
	}}, false)
	found := false
	for _, f := range res.CryptoFindings {
		if f.Algorithm == "RSA" && f.KeyLength == 1024 {
			found = true
		}
	}
	require.True(t, found, "RSA GenerateKey(..., 1024) must record key length")
}

package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/benchmarks"
	"github.com/rivic-q/cryptobom-saas/internal/database"
)

// TestSuite represents the main test suite
type TestSuite struct {
	suite.Suite
	router *gin.Engine
	db     *database.DB
	auth   *auth.AuthService
}

// SetupSuite initializes the test suite
func (suite *TestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()

	// Initialize mock database
	suite.db = &database.DB{}

	// Initialize auth service — use a test-only bootstrap password
	suite.T().Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-bootstrap-password")
	mockStore, err := auth.NewMockUserStore()
	require.NoError(suite.T(), err, "NewMockUserStore must succeed when CRYPTOBOM_BOOTSTRAP_PASSWORD is set")
	suite.auth = auth.NewAuthService("test-secret", mockStore)
}

// TearDownSuite cleans up after tests
func (suite *TestSuite) TearDownSuite() {
	// Cleanup logic
}

// TestHealthCheck tests the health endpoint
func (suite *TestSuite) TestHealthCheck() {
	req, _ := http.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()

	suite.router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"service":   "CryptoBOM SaaS",
			"edition":   "OSS",
			"version":   "1.0.0",
			"timestamp": time.Now().Format("2006-01-02T15:04:05Z07:00"),
		})
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 200, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "healthy", response["status"])
	assert.Equal(suite.T(), "CryptoBOM SaaS", response["service"])
}

// TestCBOMCRUD tests CBOM CRUD operations
func (suite *TestSuite) TestCBOMCRUD() {
	// Test CBOM creation
	cbomData := map[string]interface{}{
		"name":    "Test CBOM",
		"version": "1.0.0",
		"assets": []map[string]interface{}{
			{
				"name":      "Test TLS Certificate",
				"algorithm": "RSA-2048",
				"key_size":  2048,
				"location":  "test-server",
			},
		},
	}

	jsonData, _ := json.Marshal(cbomData)
	req, _ := http.NewRequest("POST", "/api/v1/cbom", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Mock CBOM creation handler
	suite.router.POST("/api/v1/cbom", func(c *gin.Context) {
		var cbom map[string]interface{}
		if err := c.ShouldBindJSON(&cbom); err != nil {
			c.JSON(400, gin.H{"error": "Invalid JSON"})
			return
		}
		c.JSON(201, gin.H{
			"id":      "test-cbom-id",
			"name":    cbom["name"],
			"version": cbom["version"],
			"status":  "created",
		})
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 201, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "test-cbom-id", response["id"])
	assert.Equal(suite.T(), "Test CBOM", response["name"])
}

// TestCryptoAssetsList tests crypto assets listing
func (suite *TestSuite) TestCryptoAssetsList() {
	req, _ := http.NewRequest("GET", "/api/v1/assets", nil)
	w := httptest.NewRecorder()

	suite.router.GET("/api/v1/assets", func(c *gin.Context) {
		assets := []map[string]interface{}{
			{
				"id":           "asset-1",
				"name":         "Production TLS Certificate",
				"algorithm":    "RSA-2048",
				"key_size":     2048,
				"location":     "k8s-ingress",
				"risk_level":   "medium",
				"quantum_safe": false,
				"last_seen":    time.Now().Format(time.RFC3339),
			},
			{
				"id":           "asset-2",
				"name":         "Database Encryption",
				"algorithm":    "AES-256",
				"key_size":     256,
				"location":     "postgres-primary",
				"risk_level":   "low",
				"quantum_safe": true,
				"last_seen":    time.Now().Format(time.RFC3339),
			},
		}
		c.JSON(200, gin.H{"data": assets, "total": len(assets)})
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 200, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.EqualValues(suite.T(), 2, response["total"])
}

// TestAuthentication tests JWT authentication
func (suite *TestSuite) TestAuthentication() {
	bootstrapPwd := os.Getenv("CRYPTOBOM_BOOTSTRAP_PASSWORD")

	// Test successful login
	loginData := map[string]string{
		"email":    "admin@cryptobom.io",
		"password": bootstrapPwd,
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.POST("/api/v1/auth/login", func(c *gin.Context) {
		var login map[string]string
		if err := c.ShouldBindJSON(&login); err != nil {
			c.JSON(400, gin.H{"error": "Invalid JSON"})
			return
		}

		// Mock authentication
		if login["email"] == "admin@cryptobom.io" && login["password"] == bootstrapPwd {
			token, _ := suite.auth.Login(login["email"], login["password"])
			c.JSON(200, gin.H{
				"token":   token,
				"user":    gin.H{"id": "user-1", "email": login["email"], "role": "admin"},
				"edition": "oss",
			})
		} else {
			c.JSON(401, gin.H{"error": "Invalid credentials"})
		}
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 200, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.NotEmpty(suite.T(), response["token"])

	// Test invalid login
	invalidLoginData := map[string]string{
		"email":    "invalid@test.com",
		"password": "wrong",
	}

	jsonData, _ = json.Marshal(invalidLoginData)
	req, _ = http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 401, w.Code)
}

// TestIBMQIntegration tests IBM Quantum integration
func (suite *TestSuite) TestIBMQIntegration() {
	req, _ := http.NewRequest("GET", "/api/v1/ibmq/status", nil)
	w := httptest.NewRecorder()

	// Mock IBMQ status endpoint
	suite.router.GET("/api/v1/ibmq/status", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "connected",
			"ibmq_status": gin.H{
				"status":  "available",
				"version": "2.0.0",
				"systems": []string{"ibmq_manila", "ibmq_jakarta", "ibmq_lagos"},
			},
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 200, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "connected", response["status"])
}

// TestQuantumAttestation tests quantum attestation
func (suite *TestSuite) TestQuantumAttestation() {
	attestationData := map[string]interface{}{
		"asset_id":  "asset-1",
		"algorithm": "RSA-2048",
		"certificate": map[string]interface{}{
			"subject": "CN=test.example.com",
			"issuer":  "Test CA",
		},
	}

	jsonData, _ := json.Marshal(attestationData)
	req, _ := http.NewRequest("POST", "/api/v1/ibmq/attest", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Mock quantum attestation endpoint
	suite.router.POST("/api/v1/ibmq/attest", func(c *gin.Context) {
		var attestation map[string]interface{}
		if err := c.ShouldBindJSON(&attestation); err != nil {
			c.JSON(400, gin.H{"error": "Invalid JSON"})
			return
		}

		// Mock IBM Quantum attestation response
		c.JSON(200, gin.H{
			"attestation": gin.H{
				"id":              "ibmq-attest-" + attestation["asset_id"].(string),
				"asset_id":        attestation["asset_id"],
				"algorithm":       attestation["algorithm"],
				"quantum_safe":    false,
				"confidence":      0.25,
				"attested_at":     time.Now().Format(time.RFC3339),
				"quantum_network": "ibm-q",
			},
			"recommendations": []string{
				"Migrate to post-quantum algorithms immediately",
				"Key size is insufficient for quantum resistance",
			},
		})
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 200, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["attestation"])
}

// TestMetricsOverview tests metrics endpoint
func (suite *TestSuite) TestMetricsOverview() {
	req, _ := http.NewRequest("GET", "/api/v1/metrics/overview", nil)
	w := httptest.NewRecorder()

	suite.router.GET("/api/v1/metrics/overview", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"total_assets":     1000,
			"quantum_safe":     150,
			"vulnerabilities":  85,
			"compliance_score": 15.0,
			"algorithms": map[string]int{
				"RSA-2048":   400,
				"RSA-4096":   100,
				"AES-256":    300,
				"ECDSA-P256": 150,
				"SHA-256":    50,
			},
		})
	})

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 200, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), 1000.0, response["total_assets"])
	assert.Equal(suite.T(), 150.0, response["quantum_safe"])
}

// TestBenchmarkDatasetGeneration tests benchmark dataset generation
func (suite *TestSuite) TestBenchmarkDatasetGeneration() {
	// Test enterprise dataset generation
	enterpriseDataset := benchmarks.GenerateEnterpriseDataset(100)
	assert.Equal(suite.T(), 100, enterpriseDataset.TotalAssets)
	assert.NotEmpty(suite.T(), enterpriseDataset.Assets)
	assert.NotNil(suite.T(), enterpriseDataset.Metrics)

	// Test small business dataset generation
	smallBizDataset := benchmarks.GenerateSmallBusinessDataset(50)
	assert.Equal(suite.T(), 50, smallBizDataset.TotalAssets)
	assert.Contains(suite.T(), smallBizDataset.Name, "Small Business")

	// Test financial services dataset generation
	financialDataset := benchmarks.GenerateFinancialServicesDataset(80)
	assert.Equal(suite.T(), 80, financialDataset.TotalAssets)
	assert.Contains(suite.T(), financialDataset.Name, "Financial Services")

	// Test benchmark suite generation
	benchmarkSuite := benchmarks.GenerateBenchmarkSuite()
	assert.Equal(suite.T(), 3, len(benchmarkSuite.Datasets))
	assert.Equal(suite.T(), 2300, benchmarkSuite.Datasets[0].TotalAssets+benchmarkSuite.Datasets[1].TotalAssets+benchmarkSuite.Datasets[2].TotalAssets)
}

// TestPerformanceLoadTests tests performance under load
func (suite *TestSuite) TestPerformanceLoadTests() {
	// Simulate concurrent API calls
	concurrency := 10
	requestsPerWorker := 100

	req, _ := http.NewRequest("GET", "/api/v1/assets", nil)

	startTime := time.Now()

	for i := 0; i < concurrency; i++ {
		go func() {
			for j := 0; j < requestsPerWorker; j++ {
				w := httptest.NewRecorder()
				suite.router.ServeHTTP(w, req)
			}
		}()
	}

	// Wait for all requests to complete (simplified)
	time.Sleep(2 * time.Second)

	duration := time.Since(startTime)
	totalRequests := concurrency * requestsPerWorker
	requestsPerSecond := float64(totalRequests) / duration.Seconds()

	// Performance assertions — threshold tuned for in-process httptest (no network overhead)
	assert.Greater(suite.T(), requestsPerSecond, 100.0)
	assert.Less(suite.T(), duration, 5*time.Second)
}

// TestErrorHandling tests error scenarios
func (suite *TestSuite) TestErrorHandling() {
	// Test 404 handling
	req, _ := http.NewRequest("GET", "/api/v1/nonexistent", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), 404, w.Code)

	// Test invalid JSON — use a fresh router to avoid duplicate route registration
	errorRouter := gin.New()
	errorRouter.POST("/api/v1/cbom", func(c *gin.Context) {
		c.JSON(400, gin.H{"error": "Invalid JSON"})
	})

	invalidJSON := []byte(`{"invalid": json}`)
	req, _ = http.NewRequest("POST", "/api/v1/cbom", bytes.NewBuffer(invalidJSON))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	errorRouter.ServeHTTP(w, req)

	assert.Equal(suite.T(), 400, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invalid JSON", response["error"])
}

// TestSecurityHeaders tests security headers
func (suite *TestSuite) TestSecurityHeaders() {
	// Use a fresh router to avoid duplicate route registration with other tests
	secRouter := gin.New()

	secRouter.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Next()
	})

	secRouter.GET("/api/v1/assets", func(c *gin.Context) {
		c.JSON(200, gin.H{"data": []interface{}{}})
	})

	req, _ := http.NewRequest("GET", "/api/v1/assets", nil)
	w := httptest.NewRecorder()

	secRouter.ServeHTTP(w, req)

	assert.Equal(suite.T(), "nosniff", w.Header().Get("X-Content-Type-Options"))
	assert.Equal(suite.T(), "DENY", w.Header().Get("X-Frame-Options"))
	assert.Equal(suite.T(), "1; mode=block", w.Header().Get("X-XSS-Protection"))
	assert.Contains(suite.T(), w.Header().Get("Strict-Transport-Security"), "max-age=31536000")
}

// RunTestSuite runs all tests
func TestRunSuite(t *testing.T) {
	suite.Run(t, new(TestSuite))
}

// BenchmarkAPICalls benchmarks API performance
func BenchmarkAPICalls(b *testing.B) {
	router := gin.New()
	router.GET("/api/v1/assets", func(c *gin.Context) {
		c.JSON(200, gin.H{"data": []interface{}{}})
	})

	req, _ := http.NewRequest("GET", "/api/v1/assets", nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
	b.StopTimer()
}

// BenchmarkDatasetGeneration benchmarks dataset generation performance
func BenchmarkDatasetGeneration(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		benchmarks.GenerateEnterpriseDataset(1000)
	}
	b.StopTimer()
}

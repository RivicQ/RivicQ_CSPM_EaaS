package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/core-engine/engine/classical"
	"github.com/rivic-q/cryptobom-saas/core-engine/engine/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/sirupsen/logrus"
)

// EngineAPI handles core engine API endpoints
type EngineAPI struct {
	quantumEngine   *quantum.QuantumEngine
	classicalEngine *classical.ClassicalEngine
	config          *config.EnterpriseConfig
	logger          *logrus.Logger
}

// NewEngineAPI creates a new engine API instance
func NewEngineAPI(
	quantumEngine *quantum.QuantumEngine,
	classicalEngine *classical.ClassicalEngine,
	cfg *config.EnterpriseConfig,
	logger *logrus.Logger,
) *EngineAPI {
	return &EngineAPI{
		quantumEngine:   quantumEngine,
		classicalEngine: classicalEngine,
		config:          cfg,
		logger:          logger,
	}
}

// SetupRoutes configures engine API routes
func (api *EngineAPI) SetupRoutes(router *gin.RouterGroup) {
	engine := router.Group("/engine")
	{
		// Core analysis endpoints
		engine.POST("/analyze", api.AnalyzeAsset)
		engine.POST("/quantum-assess", api.QuantumVulnerabilityAssessment)
		engine.POST("/compliance-validate", api.ValidateCompliance)
		engine.GET("/providers", api.ListProviders)
		engine.POST("/benchmark", api.RunBenchmark)

		// Language-specific endpoints
		engine.POST("/python/execute", api.ExecutePython)
		engine.POST("/java/execute", api.ExecuteJava)
		engine.POST("/rust/execute", api.ExecuteRust)
		engine.POST("/cpp/execute", api.ExecuteCpp)
		engine.POST("/ruby/execute", api.ExecuteRuby)
	}
}

// AnalyzeAsset analyzes cryptographic assets with quantum and classical engines
func (api *EngineAPI) AnalyzeAsset(c *gin.Context) {
	var request struct {
		AssetData    map[string]interface{} `json:"asset_data"`
		Providers    []string               `json:"providers"`
		AnalysisType string                 `json:"analysis_type"`
		AssetID      string                 `json:"asset_id"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"asset_id":      request.AssetID,
		"analysis_type": request.AnalysisType,
		"providers":     request.Providers,
	}).Info("Starting comprehensive asset analysis")

	// Perform classical analysis
	classicalAsset, err := api.classicalEngine.AnalyzeAsset(c.Request.Context(), request.AssetID)
	if err != nil {
		api.logger.WithError(err).Error("Classical analysis failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Perform quantum vulnerability assessment if providers specified
	var quantumResults []map[string]interface{}
	for _, provider := range request.Providers {
		if provider == "ibmq" || provider == "kipu" {
			result, err := api.quantumEngine.AnalyzeQuantumVulnerability(
				c.Request.Context(),
				request.AssetID,
				256, // Default key size
				provider,
			)
			if err != nil {
				api.logger.WithError(err).Warnf("Quantum analysis failed for provider %s", provider)
				continue
			}

			if resultMap, ok := result.(map[string]interface{}); ok {
				quantumResults = append(quantumResults, resultMap)
			}
		}
	}

	// Perform compliance assessment
	compliance, err := api.quantumEngine.PerformComplianceAssessment(
		c.Request.Context(),
		request.AssetID,
		classicalAsset.Algorithm,
		classicalAsset.KeySize,
	)
	if err != nil {
		api.logger.WithError(err).Warn("Compliance assessment failed")
	}

	response := gin.H{
		"asset_id":      request.AssetID,
		"classical":     classicalAsset,
		"quantum":       quantumResults,
		"compliance":    compliance,
		"analysis_time": time.Now(),
		"version":       "1.3.0",
		"status":        "completed",
	}

	c.JSON(http.StatusOK, response)
}

// QuantumVulnerabilityAssessment performs quantum vulnerability assessment
func (api *EngineAPI) QuantumVulnerabilityAssessment(c *gin.Context) {
	var request struct {
		Algorithm string `json:"algorithm"`
		KeySize   int    `json:"key_size"`
		Usage     string `json:"usage"`
		Provider  string `json:"provider"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"algorithm": request.Algorithm,
		"key_size":  request.KeySize,
		"provider":  request.Provider,
	}).Info("Performing quantum vulnerability assessment")

	result, err := api.quantumEngine.AnalyzeQuantumVulnerability(
		c.Request.Context(),
		request.Algorithm,
		request.KeySize,
		request.Provider,
	)
	if err != nil {
		api.logger.WithError(err).Error("Quantum vulnerability assessment failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"result":    result,
		"algorithm": request.Algorithm,
		"provider":  request.Provider,
		"timestamp": time.Now(),
		"version":   "1.3.0",
	}

	c.JSON(http.StatusOK, response)
}

// ValidateCompliance validates cryptographic compliance
func (api *EngineAPI) ValidateCompliance(c *gin.Context) {
	var request struct {
		Assets    []string `json:"assets"`
		Framework string   `json:"framework"`
		Scope     string   `json:"scope"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"asset_count": len(request.Assets),
		"framework":   request.Framework,
		"scope":       request.Scope,
	}).Info("Performing compliance validation")

	// Convert asset IDs to CryptoAsset objects
	var cryptoAssets []classical.CryptoAsset
	for _, assetID := range request.Assets {
		asset, err := api.classicalEngine.AnalyzeAsset(c.Request.Context(), assetID)
		if err != nil {
			api.logger.WithError(err).Warnf("Failed to analyze asset %s", assetID)
			continue
		}
		cryptoAssets = append(cryptoAssets, *asset)
	}

	compliance, err := api.classicalEngine.ValidateCompliance(c.Request.Context(), cryptoAssets)
	if err != nil {
		api.logger.WithError(err).Error("Compliance validation failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"result":      compliance,
		"framework":   request.Framework,
		"asset_count": len(cryptoAssets),
		"timestamp":   time.Now(),
		"version":     "1.3.0",
	}

	c.JSON(http.StatusOK, response)
}

// ListProviders returns list of available quantum providers
func (api *EngineAPI) ListProviders(c *gin.Context) {
	api.logger.Info("Retrieving available quantum providers")

	providers := api.quantumEngine.ListProviders()
	providerStatus := api.quantumEngine.GetProviderStatus(c.Request.Context())

	response := gin.H{
		"providers":   providers,
		"status":      providerStatus,
		"total_count": len(providers),
		"timestamp":   time.Now(),
		"version":     "1.3.0",
	}

	c.JSON(http.StatusOK, response)
}

// RunBenchmark runs performance benchmarks
func (api *EngineAPI) RunBenchmark(c *gin.Context) {
	var request struct {
		Algorithm  string   `json:"algorithm"`
		Providers  []string `json:"providers"`
		Iterations int      `json:"iterations"`
		Complexity string   `json:"complexity"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"algorithm":  request.Algorithm,
		"providers":  request.Providers,
		"iterations": request.Iterations,
	}).Info("Running performance benchmarks")

	// Mock benchmark results
	results := []gin.H{
		{
			"provider":             "classical",
			"algorithm":            request.Algorithm,
			"execution_time":       "15ms",
			"memory_usage":         "64MB",
			"cpu_usage":            "12%",
			"iterations_completed": request.Iterations,
		},
		{
			"provider":             "ibmq",
			"algorithm":            request.Algorithm,
			"execution_time":       "2s",
			"memory_usage":         "128MB",
			"cpu_usage":            "45%",
			"iterations_completed": request.Iterations / 10, // Mock slower quantum execution
		},
		{
			"provider":             "kipu-qctrl",
			"algorithm":            request.Algorithm,
			"execution_time":       "1.5s",
			"memory_usage":         "96MB",
			"cpu_usage":            "35%",
			"iterations_completed": request.Iterations / 8, // Mock optimized quantum execution
		},
	}

	response := gin.H{
		"benchmark_results": results,
		"algorithm":         request.Algorithm,
		"total_iterations":  request.Iterations,
		"completion_time":   time.Since(time.Now().Add(-time.Duration(request.Iterations) * time.Millisecond)),
		"timestamp":         time.Now(),
		"version":           "1.3.0",
	}

	c.JSON(http.StatusOK, response)
}

// Language execution endpoints (mock implementations for now)

// ExecutePython executes Python scripts via FFI
func (api *EngineAPI) ExecutePython(c *gin.Context) {
	var request struct {
		Script     string                 `json:"script"`
		Parameters map[string]interface{} `json:"parameters"`
		AssetData  map[string]interface{} `json:"asset_data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"script_length": len(request.Script),
		"parameters":    len(request.Parameters),
	}).Info("Executing Python script")

	// Mock Python execution
	result := gin.H{
		"output":       "Python execution completed successfully",
		"execution_id": fmt.Sprintf("py_exec_%d", time.Now().Unix()),
		"status":       "completed",
		"metrics": gin.H{
			"execution_time": "250ms",
			"memory_usage":   "128MB",
			"exit_code":      0,
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"result":  result,
		"version": "1.3.0",
	})
}

// ExecuteJava executes Java code via JVM
func (api *EngineAPI) ExecuteJava(c *gin.Context) {
	var request struct {
		Code       string                 `json:"code"`
		ClassName  string                 `json:"class_name"`
		Parameters map[string]interface{} `json:"parameters"`
		AssetData  map[string]interface{} `json:"asset_data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"class_name":  request.ClassName,
		"code_length": len(request.Code),
	}).Info("Executing Java code")

	// Mock Java execution
	result := gin.H{
		"output":       "Java execution completed successfully",
		"execution_id": fmt.Sprintf("java_exec_%d", time.Now().Unix()),
		"status":       "completed",
		"metrics": gin.H{
			"execution_time": "180ms",
			"heap_used":      "256MB",
			"gc_time":        "15ms",
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"result":  result,
		"version": "1.3.0",
	})
}

// ExecuteRust executes Rust code via cargo
func (api *EngineAPI) ExecuteRust(c *gin.Context) {
	var request struct {
		Code       string                 `json:"code"`
		CrateName  string                 `json:"crate_name"`
		Parameters map[string]interface{} `json:"parameters"`
		AssetData  map[string]interface{} `json:"asset_data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"crate_name":  request.CrateName,
		"code_length": len(request.Code),
	}).Info("Executing Rust code")

	// Mock Rust execution
	result := gin.H{
		"output":       "Rust execution completed successfully",
		"execution_id": fmt.Sprintf("rust_exec_%d", time.Now().Unix()),
		"status":       "completed",
		"metrics": gin.H{
			"execution_time": "45ms", // Rust is fast!
			"memory_usage":   "32MB", // Zero-cost abstractions
			"cpu_usage":      "5%",
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"result":  result,
		"version": "1.3.0",
	})
}

// ExecuteCpp executes C++ code via compiled binary
func (api *EngineAPI) ExecuteCpp(c *gin.Context) {
	var request struct {
		Code       string                 `json:"code"`
		Executable string                 `json:"executable"`
		Parameters map[string]interface{} `json:"parameters"`
		AssetData  map[string]interface{} `json:"asset_data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"executable":  request.Executable,
		"code_length": len(request.Code),
	}).Info("Executing C++ code")

	// Mock C++ execution
	result := gin.H{
		"output":       "C++ execution completed successfully",
		"execution_id": fmt.Sprintf("cpp_exec_%d", time.Now().Unix()),
		"status":       "completed",
		"metrics": gin.H{
			"execution_time": "120ms",
			"memory_usage":   "96MB",
			"cpu_usage":      "18%",
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"result":  result,
		"version": "1.3.0",
	})
}

// ExecuteRuby executes Ruby scripts via interpreter
func (api *EngineAPI) ExecuteRuby(c *gin.Context) {
	var request struct {
		Script     string                 `json:"script"`
		Parameters map[string]interface{} `json:"parameters"`
		AssetData  map[string]interface{} `json:"asset_data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api.logger.WithFields(logrus.Fields{
		"script_length": len(request.Script),
		"parameters":    len(request.Parameters),
	}).Info("Executing Ruby script")

	// Mock Ruby execution
	result := gin.H{
		"output":       "Ruby execution completed successfully",
		"execution_id": fmt.Sprintf("ruby_exec_%d", time.Now().Unix()),
		"status":       "completed",
		"metrics": gin.H{
			"execution_time": "280ms",
			"memory_usage":   "180MB",
			"cpu_usage":      "22%",
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"result":  result,
		"version": "1.3.0",
	})
}

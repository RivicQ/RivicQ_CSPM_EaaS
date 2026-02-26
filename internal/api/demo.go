package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/sirupsen/logrus"
)

// RegisterDemoRoutes registers the infrastructure discovery demo routes
func RegisterDemoRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	demoGroup := router.Group("/demo")
	{
		demoGroup.GET("/scan", runDemoScan(logger))
		demoGroup.GET("/findings", getDemoFindings(logger))
		demoGroup.GET("/targets", getDemoTargets(logger))
	}
}

// runDemoScan handles GET /api/v1/demo/scan
func runDemoScan(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
		defer cancel()

		scanner := discovery.NewScanner()
		result, err := scanner.ScanAll(ctx, discovery.DemoTargets)
		if err != nil {
			logger.WithError(err).Error("Demo scan failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		logger.WithFields(logrus.Fields{
			"scan_id":  result.ScanID,
			"findings": result.Summary.TotalFindings,
			"critical": result.Summary.Critical,
		}).Info("Demo scan completed")

		c.JSON(http.StatusOK, result)
	}
}

// getDemoFindings handles GET /api/v1/demo/findings — returns seeded findings from fixtures
func getDemoFindings(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to load fixtures file relative to project root
		fixturesPath := findFixturesPath()

		data, err := os.ReadFile(fixturesPath)
		if err != nil {
			logger.WithError(err).Warn("Could not load fixtures file, returning empty findings")
			c.JSON(http.StatusOK, gin.H{"findings": []interface{}{}})
			return
		}

		var result discovery.ScanResult
		if err := json.Unmarshal(data, &result); err != nil {
			logger.WithError(err).Error("Failed to parse fixtures file")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse fixtures"})
			return
		}

		logger.WithField("findings", len(result.Findings)).Info("Returning seeded demo findings")
		c.JSON(http.StatusOK, result)
	}
}

// getDemoTargets handles GET /api/v1/demo/targets — returns the list of demo targets
func getDemoTargets(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Returning demo targets")
		c.JSON(http.StatusOK, gin.H{
			"targets": discovery.DemoTargets,
			"total":   len(discovery.DemoTargets),
		})
	}
}

// findFixturesPath returns the path to the fixtures file
func findFixturesPath() string {
	// Try relative to binary location
	candidates := []string{
		"demo/fixtures/findings.json",
		"../demo/fixtures/findings.json",
		"../../demo/fixtures/findings.json",
	}

	// Also try relative to source file location
	_, filename, _, ok := runtime.Caller(0)
	if ok {
		base := filepath.Dir(filepath.Dir(filepath.Dir(filename)))
		candidates = append(candidates, filepath.Join(base, "demo/fixtures/findings.json"))
	}

	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}

	return "demo/fixtures/findings.json"
}

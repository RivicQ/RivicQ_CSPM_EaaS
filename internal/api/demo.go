package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/sirupsen/logrus"
)

// RegisterDemoRoutes registers the infrastructure discovery demo routes
func RegisterDemoRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	// Demo routes are deprecated and intentionally disabled in live builds.
	demoGroup := router.Group("/demo")
	{
		demoGroup.GET("/scan", func(c *gin.Context) { c.JSON(404, gin.H{"error": "demo endpoints disabled"}) })
		demoGroup.GET("/findings", func(c *gin.Context) { c.JSON(404, gin.H{"error": "demo endpoints disabled"}) })
		demoGroup.GET("/targets", func(c *gin.Context) { c.JSON(404, gin.H{"error": "demo endpoints disabled"}) })
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
		// Demo fixtures were archived; return empty findings to avoid accidental usage
		c.JSON(http.StatusOK, gin.H{"findings": []interface{}{}})
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



package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

func main() {
	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Initialize configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize database (mock for demo)
	db := &database.DB{}

	// Initialize Gin router
	router := gin.Default()

	// Simple health check
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"service":   "CryptoBOM SaaS",
			"version":   "1.0.0",
			"timestamp": time.Now().Format("2006-01-02T15:04:05Z07:00"),
		})
	})

	// Setup API routes
	apiGroup := router.Group("/api/v1")
	api.SetupRoutes(apiGroup, db, logger, cfg)

	// Demo dashboard endpoint (for LinkedIn demo)
	apiGroup.GET("/dashboard/demo", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"cbom": []gin.H{
				{
					"id":         "1",
					"name":       "Demo Production CBOM",
					"version":    "1.0.0",
					"status":     "ready",
					"created_at": "2025-01-30T10:00Z",
					"assets": []gin.H{
						{
							"id":           "1",
							"name":         "Production TLS Certificate",
							"algorithm":    "RSA-2048",
							"key_size":     2048,
							"risk_level":   "medium",
							"quantum_safe": false,
							"last_seen":    "2025-01-30T12:00Z",
						},
						{
							"id":           "2",
							"name":         "Database Encryption",
							"algorithm":    "AES-256",
							"key_size":     256,
							"risk_level":   "low",
							"quantum_safe": true,
							"last_seen":    "2025-01-30T13:00Z",
						},
					},
					"total_assets": 2,
				},
			},
			"assets": []gin.H{
				{
					"id":           "1",
					"name":         "Production TLS Certificate",
					"algorithm":    "RSA-2048",
					"key_size":     2048,
					"location":     "k8s-ingress",
					"risk_level":   "medium",
					"quantum_safe": false,
					"last_seen":    "2025-01-30T12:00Z",
				},
				{
					"id":           "2",
					"name":         "Database Encryption",
					"algorithm":    "AES-256",
					"key_size":     256,
					"location":     "postgres-primary",
					"risk_level":   "low",
					"quantum_safe": true,
					"last_seen":    "2025-01-30T13:00Z",
				},
				{
					"id":           "3",
					"name":         "API Keys",
					"algorithm":    "RSA-3072",
					"key_size":     3072,
					"location":     "api-gateway",
					"risk_level":   "high",
					"quantum_safe": false,
					"last_seen":    "2025-01-30T13:00Z",
				},
			},
			"metrics": gin.H{
				"total_assets":     42,
				"quantum_safe":     15,
				"vulnerabilities":  8,
				"compliance_score": 85.5,
				"last_scan":        "2025-01-30T00Z",
			},
		})
	})

	// Start server
	port := ":8080"
	fmt.Printf("🚀 CryptoBOM SaaS v%s\n", "1.0.0")
	fmt.Printf("📊 Server running on port %s\n", port)
	fmt.Printf("🎯 Health check: http://localhost:%s/healthz\n", port)
	fmt.Printf("🌐 Try: curl http://localhost:%s/api/v1/cbom\n", port)
	fmt.Printf("🔍 Quantum-ready demo: http://localhost:%s/api/v1/cilium/metrics\n", port)
	fmt.Printf("🎬 LinkedIn demo ready! 🎯\n")

	// Graceful shutdown setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// Handle shutdown in goroutine
	go func() {
		<-quit
		fmt.Printf("\n🔹 Shutting down CryptoBOM SaaS...\n")
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}()

	// Start server
	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}

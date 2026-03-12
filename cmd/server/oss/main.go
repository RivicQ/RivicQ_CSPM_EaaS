//go:build oss

package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

func main() {
	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Initialize OSS configuration
	cfg, err := config.LoadOSS()
	if err != nil {
		log.Fatal("Failed to load OSS configuration:", err)
	}

	// Initialize database (mock for demo)
	db := &database.DB{}

	// Initialize Gin router
	router := gin.Default()

	// Simple health check
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"service":   "CryptoBOM OSS",
			"edition":   "Open Source",
			"version":   "1.0.0",
			"timestamp": time.Now().Format("2006-01-02T15:04:05Z07:00"),
		})
	})

	// Setup OSS API routes
	apiGroup := router.Group("/api/v1")
	oss.SetupRoutes(apiGroup, db, logger, cfg)

	// OSS Demo endpoint
	apiGroup.GET("/dashboard/demo", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "CryptoBOM OSS Demo - Open Source Edition",
			"cbom": []gin.H{
				{
					"id":         "1",
					"name":       "OSS Demo CBOM",
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
					},
					"total_assets": 1,
				},
			},
		})
	})

	// Start server
	port := ":8080"
	fmt.Printf("🚀 CryptoBOM OSS v%s\n", "1.0.0")
	fmt.Printf("📊 OSS Server running on port %s\n", port)
	fmt.Printf("🎯 Health check: http://localhost:%s/healthz\n", port)
	fmt.Printf("🌐 OSS API: http://localhost:%s/api/v1\n", port)
	fmt.Printf("📈 OSS Demo: http://localhost:%s/api/v1/dashboard/demo\n", port)
	fmt.Printf("🔓 Open Source Edition Features:\n")
	fmt.Printf("   • eBPF cryptographic asset discovery\n")
	fmt.Printf("   • Basic CBOM management\n")
	fmt.Printf("   • Vulnerability detection\n")
	fmt.Printf("   • Kubernetes integration\n")
	fmt.Printf("   • Real-time monitoring dashboard\n")

	// Graceful shutdown setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// Handle shutdown in goroutine
	go func() {
		<-quit
		fmt.Printf("\n🔹 Shutting down CryptoBOM OSS...\n")
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}()

	// Start server
	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}

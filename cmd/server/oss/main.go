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
	"github.com/rivic-q/cryptobom-saas/internal/middleware"
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

	// Initialize database
	db := database.New(logger)
	if db != nil {
		logger.Info("Database connected — running in production mode with PostgreSQL")
		if err := database.RunMigrations(db); err != nil {
			logger.WithError(err).Fatal("Database migration failed")
		}
	} else {
		logger.Warn("No database available — running in demo mode with in-memory auth")
	}

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware — required for frontend dev server (different port)
	router.Use(middleware.CORS(middleware.DefaultCORSConfig()))

	// Edition detection for frontend auto-config
	router.GET("/edition", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"edition": "oss",
			"features": gin.H{
				"dashboard":           true,
				"assetInventory":      true,
				"scanner":             true,
				"analytics":           true,
				"authentication":      true,
				"github_oauth":        os.Getenv("GITHUB_OAUTH_CLIENT_ID") != "",
				"google_oauth":        os.Getenv("GOOGLE_OAUTH_CLIENT_ID") != "",
				"ecosystem":           true,
				"compliance":          true,
				"benchmarks":          true,
				"monitoring":          true,
				"kubernetes":          true,
				"agentic_security":    os.Getenv("AGENTIC_SECURITY_ENDPOINT") != "",
				"protocol":            os.Getenv("RIVICQ_PROTOCOL_ENDPOINT") != "",
			},
		})
	})

	// Simple health check
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"service":   "RivicQ - Encryption as a Service (OSS)",
			"edition":   "Open Source",
			"version":   "1.0.0",
			"timestamp": time.Now().Format("2006-01-02T15:04:05Z07:00"),
		})
	})

	router.GET("/readyz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ready",
			"service": "RivicQ - Encryption as a Service (OSS)",
		})
	})

	// Setup OSS API routes
	apiGroup := router.Group("/api/v1")
	oss.SetupRoutes(apiGroup, db, logger, cfg)

	// Start server
	port := ":" + cfg.Server.Port
	fmt.Printf("🚀 RivicQ — Encryption as a Service (OSS) v%s\n", "1.0.0")
	fmt.Printf("📊 OSS Server running on port %s\n", port)
	fmt.Printf("🎯 Health check: http://localhost:%s/healthz\n", cfg.Server.Port)
	fmt.Printf("🌐 OSS API: http://localhost:%s/api/v1\n", cfg.Server.Port)
	fmt.Printf("🔓 Open Source Edition Features:\n")
	fmt.Printf("   • eBPF cryptographic asset discovery\n")
	fmt.Printf("   • Basic CBOM management\n")
	fmt.Printf("   • Vulnerability detection\n")
	fmt.Printf("   • Kubernetes integration\n")
	fmt.Printf("   • Real-time monitoring dashboard\n")

	// Show connected services
	if ep := os.Getenv("AGENTIC_SECURITY_ENDPOINT"); ep != "" {
		fmt.Printf("   • Agentic Security AI: %s\n", ep)
	}
	if ep := os.Getenv("RIVICQ_PROTOCOL_ENDPOINT"); ep != "" {
		fmt.Printf("   • RivicQ Protocol: %s\n", ep)
	}
	if os.Getenv("GITHUB_TOKEN") != "" {
		fmt.Printf("   • GitHub Scanning: enabled\n")
	}
	if os.Getenv("GITHUB_OAUTH_CLIENT_ID") != "" {
		fmt.Printf("   • GitHub OAuth: enabled\n")
	}
	if os.Getenv("GOOGLE_OAUTH_CLIENT_ID") != "" {
		fmt.Printf("   • Google OAuth: enabled\n")
	}

	// Graceful shutdown setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// Handle shutdown in goroutine
	go func() {
		<-quit
		fmt.Printf("\n🔹 Shutting down RivicQ — Encryption as a Service (OSS)...\n")
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}()

	// Start server
	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}

//go:build enterprise

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/enterprise"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/middleware"
	"github.com/rivic-q/cryptobom-saas/internal/observability"
	"github.com/sirupsen/logrus"
)

func main() {
	config.LoadDotEnv()

	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Initialize Enterprise configuration
	cfg, err := config.LoadEnterprise()
	if err != nil {
		log.Fatal("Failed to load Enterprise configuration:", err)
	}

	// Initialize database with enterprise features
	db := database.New(logger)
	if db != nil {
		logger.Info("Database connected — running in production mode with PostgreSQL")
		if err := database.RunMigrations(db); err != nil {
			logger.WithError(err).Fatal("Database migration failed")
		}
	} else {
		logger.Warn("No database available — running in demo mode with in-memory auth")
	}

	// Initialize OpenTelemetry tracing
	otelShutdown, err := observability.InitOTEL("cryptobom-enterprise", "2.0.0")
	if err != nil {
		logger.Warn("OpenTelemetry initialization failed (tracing disabled): ", err)
	} else {
		defer func() {
			if err := otelShutdown(context.Background()); err != nil {
				logger.Error("OpenTelemetry shutdown error: ", err)
			}
		}()
		logger.Info("OpenTelemetry tracing enabled")
	}

	// Initialize Gin router
	router := gin.Default()

	// Apply enterprise middleware stack (request ID, security headers, audit, rate limit, CORS)
	router.Use(middleware.RequestID())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.Audit(logger, db))
	router.Use(middleware.RateLimit(edition.Detect().Features.APIRateLimit))
	router.Use(middleware.CORS(middleware.DefaultCORSConfig()))
	router.Use(middleware.TracingMiddleware("cryptobom-enterprise"))
	router.Use(func(c *gin.Context) {
		c.Header("X-CryptoBOM-Edition", "enterprise")
		c.Next()
	})

	// Enterprise health check with IBMQ status
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":         "healthy",
			"service":        "RivicQ - Encryption as a Service (Enterprise)",
			"edition":        "Enterprise",
			"version":        "2.0.0",
			"timestamp":      time.Now().Format("2006-01-02T15:04:05Z07:00"),
			"ibmq_connected": cfg.IBMQ.Enabled,
		})
	})

	router.GET("/readyz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ready",
			"service": "RivicQ - Encryption as a Service (Enterprise)",
		})
	})

	router.GET("/edition", func(c *gin.Context) {
		editionCfg := edition.Detect()
		c.JSON(200, gin.H{
			"edition":  editionCfg.Edition,
			"features": editionCfg.Features,
		})
	})

	// Setup Enterprise API routes
	apiGroup := router.Group("/api/v1")
	enterprise.SetupRoutes(apiGroup, db, logger, cfg)

	// IBMQ-specific routes
	ibmqGroup := apiGroup.Group("/ibmq")
	{
		ibmqGroup.GET("/status", enterprise.GetIBMQStatus(cfg))
		ibmqGroup.GET("/systems", enterprise.ListIBMQuantumSystems(cfg))
		ibmqGroup.POST("/attest", enterprise.CreateIBMQuantumAttestation(cfg, logger))
		ibmqGroup.GET("/networks", enterprise.ListQuantumNetworks(cfg, logger))
		ibmqGroup.POST("/emergency", enterprise.TriggerEmergencyQuantumResponse(cfg, logger))
	}

	// Start server on different port for Enterprise
	port := ":" + cfg.Server.Port
	fmt.Printf("🚀 RivicQ — Encryption as a Service (Enterprise) v%s\n", "2.0.0")
	fmt.Printf("📊 Enterprise Server running on port %s\n", port)
	fmt.Printf("🎯 Health check: http://localhost:%s/healthz\n", cfg.Server.Port)
	fmt.Printf("🌐 Enterprise API: http://localhost:%s/api/v1\n", cfg.Server.Port)
	fmt.Printf("⚛️  IBM Quantum Integration: http://localhost:%s/api/v1/ibmq\n", cfg.Server.Port)
	fmt.Printf("🔒 Enterprise Edition Features:\n")
	fmt.Printf("   • IBM Quantum attestation & verification\n")
	fmt.Printf("   • Advanced threat detection with ML\n")
	fmt.Printf("   • Multi-cloud deployment support\n")
	fmt.Printf("   • Enterprise SSO (SAML/LDAP)\n")
	fmt.Printf("   • Quantum vulnerability assessment\n")
	fmt.Printf("   • Real-time quantum-safe monitoring\n")
	fmt.Printf("   • Advanced analytics & reporting\n")
	fmt.Printf("   • 24/7 enterprise support\n")

	// Graceful shutdown setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// Handle shutdown in goroutine
	go func() {
		<-quit
		fmt.Printf("\n🔹 Shutting down RivicQ — Encryption as a Service (Enterprise)...\n")
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}()

	// Start server
	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}

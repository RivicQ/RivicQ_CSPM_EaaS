//go:build enterprise

package main

import (
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
	"github.com/sirupsen/logrus"
)

func main() {
	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Initialize Enterprise configuration
	cfg, err := config.LoadEnterprise()
	if err != nil {
		log.Fatal("Failed to load Enterprise configuration:", err)
	}

	// Initialize database with enterprise features
	db := &database.DB{}

	// Initialize Gin router
	router := gin.Default()

	// Enterprise health check with IBMQ status
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":         "healthy",
			"service":        "CryptoBOM Enterprise",
			"edition":        "Enterprise",
			"version":        "2.0.0",
			"timestamp":      time.Now().Format("2006-01-02T15:04:05Z07:00"),
			"ibmq_connected": cfg.IBMQ.Enabled,
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

	// Enterprise Demo endpoint
	apiGroup.GET("/dashboard/demo", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "CryptoBOM Enterprise Demo - IBM Quantum Integration",
			"cbom": []gin.H{
				{
					"id":            "1",
					"name":          "Enterprise CBOM with IBMQ Attestation",
					"version":       "2.0.0",
					"status":        "attested",
					"quantum_safe":  true,
					"ibmq_attested": true,
					"created_at":    "2025-01-30T10:00Z",
					"assets": []gin.H{
						{
							"id":             "1",
							"name":           "Production TLS Certificate",
							"algorithm":      "RSA-4096",
							"key_size":       4096,
							"risk_level":     "low",
							"quantum_safe":   false,
							"ibmq_verified":  false,
							"migration_path": "post_quantum_ready",
							"last_seen":      "2025-01-30T12:00Z",
						},
						{
							"id":             "2",
							"name":           "Post-Quantum Encryption",
							"algorithm":      "CRYSTALS-Kyber",
							"key_size":       2048,
							"risk_level":     "none",
							"quantum_safe":   true,
							"ibmq_attested":  true,
							"attestation_id": "ibmq-attest-xyz123",
							"last_seen":      "2025-01-30T13:00Z",
						},
					},
					"total_assets":     2,
					"compliance_score": 98.5,
				},
			},
		})
	})

	// Start server on different port for Enterprise
	port := ":9090"
	fmt.Printf("🚀 CryptoBOM Enterprise v%s\n", "2.0.0")
	fmt.Printf("📊 Enterprise Server running on port %s\n", port)
	fmt.Printf("🎯 Health check: http://localhost:%s/healthz\n", port)
	fmt.Printf("🌐 Enterprise API: http://localhost:%s/api/v1\n", port)
	fmt.Printf("⚛️  IBM Quantum Integration: http://localhost:%s/api/v1/ibmq\n", port)
	fmt.Printf("📈 Enterprise Demo: http://localhost:%s/api/v1/dashboard/demo\n", port)
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
		fmt.Printf("\n🔹 Shutting down CryptoBOM Enterprise...\n")
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}()

	// Start server
	if err := router.Run(port); err != nil {
		log.Fatal(err)
	}
}

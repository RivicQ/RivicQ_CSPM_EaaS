package server

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/enterprise"
	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/middleware"
	"github.com/sirupsen/logrus"
)

type Server struct {
	Engine  *gin.Engine
	Edition edition.Edition
	Logger  *logrus.Logger
	DB      *database.DB
	Port    string
}

func New() *Server {
	config.LoadDotEnv()

	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	editionCfg := edition.Detect()

	ginMode := gin.DebugMode
	if editionCfg.Edition == edition.Enterprise {
		ginMode = gin.ReleaseMode
	}
	gin.SetMode(ginMode)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	db := database.New(logger)

	middleware.Setup(router, editionCfg, logger, db)
	if db != nil {
		if err := database.RunMigrations(db); err != nil {
			logger.WithError(err).Warn("Database migrations failed — running with existing schema")
		}
	} else {
		logger.Warn("No database — demo mode: all data is in-memory and ephemeral")
	}

	return &Server{
		Engine:  router,
		Edition: editionCfg.Edition,
		Logger:  logger,
		DB:      db,
		Port:    os.Getenv("CRYPTOBOM_PORT"),
	}
}

func (s *Server) Start() {
	if s.Port == "" {
		if s.Edition == edition.Enterprise {
			s.Port = "9090"
		} else {
			s.Port = "8080"
		}
	}

	s.registerHealthRoutes()
	s.registerAPIRoutes()

	serviceName := fmt.Sprintf("RivicQ — Encryption as a Service (%s)", s.Edition)
	if s.Edition == edition.OSS {
		s.printOSSInfo(serviceName)
	} else {
		s.printEnterpriseInfo(serviceName)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-quit
		fmt.Printf("\nShutting down %s...\n", serviceName)
		time.Sleep(2 * time.Second)
		os.Exit(0)
	}()

	addr := fmt.Sprintf(":%s", s.Port)
	if err := s.Engine.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func (s *Server) registerHealthRoutes() {
	s.Engine.GET("/healthz", func(c *gin.Context) {
		dbStatus := "disconnected"
		if s.DB != nil && s.DB.DB != nil {
			if err := s.DB.Ping(); err == nil {
				dbStatus = "connected"
			}
		}
		resp := gin.H{
			"status":      "healthy",
			"service":     fmt.Sprintf("RivicQ - %s", s.Edition),
			"edition":     s.Edition,
			"database":    dbStatus,
			"demo_mode":   s.DB == nil,
			"timestamp":   time.Now().Format(time.RFC3339),
		}
		if s.Edition == edition.Enterprise {
			resp["ibmq_connected"] = os.Getenv("IBMQ_ENABLED") == "true"
		}
		c.JSON(200, resp)
	})

	s.Engine.GET("/readyz", func(c *gin.Context) {
		dbReady := true
		if s.DB != nil && s.DB.DB != nil {
			dbReady = s.DB.Ping() == nil
		}
		status := "ready"
		if !dbReady {
			status = "degraded"
		}
		c.JSON(200, gin.H{
			"status":   status,
			"database": dbReady,
			"service":  fmt.Sprintf("RivicQ - %s", s.Edition),
		})
	})

	s.Engine.GET("/edition", func(c *gin.Context) {
		c.JSON(200, edition.Detect().Public())
	})

	s.registerOpenAPISpec()
}

func (s *Server) registerAPIRoutes() {
	apiGroup := s.Engine.Group("/api/v1")

	if s.Edition == edition.Enterprise {
		cfg, err := config.LoadEnterprise()
		if err != nil {
			s.Logger.Fatal("Failed to load Enterprise configuration:", err)
		}
		enterprise.SetupRoutes(apiGroup, s.DB, s.Logger, cfg)
	} else {
		cfg, err := config.LoadOSS()
		if err != nil {
			s.Logger.Fatal("Failed to load OSS configuration:", err)
		}
		oss.SetupRoutes(apiGroup, s.DB, s.Logger, cfg)
	}

	apiGroup.GET("/scans/:id/stream", shared.StreamScanProgress(s.DB, s.Logger))
}

func (s *Server) printOSSInfo(serviceName string) {
	fmt.Printf("  %s v%s\n", serviceName, "1.0.0")
	fmt.Printf("  Server running on port %s\n", s.Port)
	fmt.Printf("  Health: http://localhost:%s/healthz\n", s.Port)
	fmt.Printf("  API:    http://localhost:%s/api/v1\n", s.Port)
	fmt.Print("\n  Open Source Edition Features (limited):\n")
	fmt.Printf("     Website, host/IP, server, and declared pod scans\n")
	fmt.Printf("     CBOM + CycloneDX 1.6 + Qiskit-aligned scores\n")
	fmt.Printf("     Discover → mitigate → report (JSON, not a DORA pack)\n")
	fmt.Printf("     QSIC/HSM catalog is declared inventory only\n")
	fmt.Print("\n  To enable Enterprise features:\n")
	fmt.Printf("     export CRYPTOBOM_LICENSE_KEY=ENT-<your-key>\n\n")
}

func (s *Server) registerOpenAPISpec() {
	s.Engine.GET("/openapi.json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"openapi": "3.0.3",
			"info": gin.H{
				"title":       "CryptoBOM SaaS API",
				"version":     "1.0.0",
				"description": "REST API for cryptographic asset inventory, CBOM management, quantum risk assessment, and compliance reporting.",
			},
			"servers": []gin.H{
				{"url": "http://localhost:8080", "description": "OSS"},
				{"url": "http://localhost:9090", "description": "Enterprise"},
			},
			"paths": gin.H{
				"/healthz": gin.H{
					"get": gin.H{
						"summary": "Health check",
						"responses": gin.H{"200": gin.H{"description": "Service health status"}},
					},
				},
				"/readyz": gin.H{
					"get": gin.H{
						"summary": "Readiness check",
						"responses": gin.H{"200": gin.H{"description": "Service readiness including DB status"}},
					},
				},
				"/edition": gin.H{
					"get": gin.H{
						"summary": "Edition info",
						"responses": gin.H{"200": gin.H{"description": "Edition type and feature flags"}},
					},
				},
				"/api/v1/cbom": gin.H{
					"get": gin.H{
						"summary": "List CBOM reports",
						"responses": gin.H{"200": gin.H{"description": "Array of CBOM reports"}},
					},
					"post": gin.H{
						"summary": "Create CBOM report",
						"responses": gin.H{"201": gin.H{"description": "Created CBOM report"}},
					},
				},
				"/api/v1/scans": gin.H{
					"post": gin.H{
						"summary": "Trigger CBOM scan",
						"responses": gin.H{"202": gin.H{"description": "Scan accepted"}},
					},
				},
				"/api/v1/scans/{id}": gin.H{
					"get": gin.H{
						"summary": "Get scan status",
						"parameters": []gin.H{{"name": "id", "in": "path", "required": true}},
						"responses": gin.H{"200": gin.H{"description": "Scan status and results"}},
					},
				},
				"/api/v1/scans/{id}/stream": gin.H{
					"get": gin.H{
						"summary": "SSE scan progress stream",
						"parameters": []gin.H{{"name": "id", "in": "path", "required": true}},
						"responses": gin.H{"200": gin.H{"description": "Server-Sent Events stream"}},
					},
				},
				"/api/v1/dashboard/overview": gin.H{
					"get": gin.H{
						"summary": "Dashboard overview",
						"responses": gin.H{"200": gin.H{"description": "Dashboard metrics"}},
					},
				},
			"/api/v1/cspm/overview": gin.H{
				"get": gin.H{
					"summary": "CSPM overview (Enterprise)",
					"responses": gin.H{"200": gin.H{"description": "CSPM posture data"}},
				},
			},
			},
		})
	})
}

func (s *Server) printEnterpriseInfo(serviceName string) {
	fmt.Printf("  %s v%s\n", serviceName, "2.0.0")
	fmt.Printf("  Server running on port %s\n", s.Port)
	fmt.Printf("  Health: http://localhost:%s/healthz\n", s.Port)
	fmt.Printf("  API:    http://localhost:%s/api/v1\n", s.Port)
	fmt.Print("\n  Enterprise Edition Features:\n")
	fmt.Printf("     Community engine plus control plane (SSO config, audit, API keys)\n")
	fmt.Printf("     Multi-cloud / HSM / quantum connectors when credentials exist\n")
	fmt.Printf("     DORA pack mappings (not a certification)\n")
	fmt.Printf("     Declared HSM/TPM/QSIC inventory (QSIC is research silicon)\n")
	fmt.Printf("     Live Kubernetes attach when a cluster credential is configured\n\n")
}

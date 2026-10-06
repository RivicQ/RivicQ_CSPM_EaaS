package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
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
	Engine   *gin.Engine
	Edition  edition.Edition
	Logger   *logrus.Logger
	DB       *database.DB
	Port     string
	DemoMode bool
	// routeHooks run at the end of API route registration so an edition-specific
	// binary can add routes without duplicating the whole bootstrap. Keeping one
	// bootstrap is what prevents a second server from shipping weaker timeouts
	// or an always-ready probe.
	routeHooks []func(*gin.RouterGroup, *Server)
}

// Option customises the server at construction time.
type Option func(*Server)

// WithPort overrides the listen port.
func WithPort(port string) Option {
	return func(s *Server) {
		if port != "" {
			s.Port = port
		}
	}
}

// WithLogger replaces the default logger.
func WithLogger(logger *logrus.Logger) Option {
	return func(s *Server) {
		if logger != nil {
			s.Logger = logger
		}
	}
}

// WithAPIRouteHook registers extra routes on the /api/v1 group.
func WithAPIRouteHook(hook func(*gin.RouterGroup, *Server)) Option {
	return func(s *Server) {
		if hook != nil {
			s.routeHooks = append(s.routeHooks, hook)
		}
	}
}

func New(opts ...Option) *Server {
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

	db, dbOK := database.NewOptional(logger)

	middleware.Setup(router, editionCfg, logger, db)
	if dbOK {
		if err := database.RunMigrations(db); err != nil {
			logger.WithError(err).Fatal("Database migrations failed — refusing to serve against an unknown schema")
		}
	} else {
		logger.Warn("Demo mode: all data is in-memory, fabricated and ephemeral — not for production")
	}

	s := &Server{
		Engine:   router,
		Edition:  editionCfg.Edition,
		Logger:   logger,
		DB:       db,
		Port:     os.Getenv("CRYPTOBOM_PORT"),
		DemoMode: !dbOK,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

func (s *Server) Start() {
	if s.Port == "" {
		if s.Edition == edition.Enterprise {
			s.Port = "9090"
		} else {
			s.Port = "8080"
		}
	}

	s.RegisterRoutes()

	serviceName := fmt.Sprintf("RivicQ — Encryption as a Service (%s)", s.Edition)
	if s.Edition == edition.OSS {
		s.printOSSInfo(serviceName)
	} else {
		s.printEnterpriseInfo(serviceName)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	addr := fmt.Sprintf(":%s", s.Port)
	httpServer := &http.Server{
		Addr:    addr,
		Handler: s.Engine,
		// Explicit timeouts. Without them a slow client can hold a connection
		// open indefinitely, which is the usual shape of a slowloris outage.
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      300 * time.Second, // scans stream over SSE
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	serverErrors := make(chan error, 1)
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
		close(serverErrors)
	}()

	select {
	case err := <-serverErrors:
		if err != nil {
			s.Logger.WithError(err).Fatal("HTTP server failed")
		}
	case sig := <-quit:
		s.Logger.WithField("signal", sig.String()).Info("Shutting down")
	}

	// Drain in-flight requests, then close the database. Returning immediately
	// on signal would abandon live scans mid-flight.
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		s.Logger.WithError(err).Error("Graceful shutdown failed; forcing close")
		_ = httpServer.Close()
	}
	if s.DB != nil && s.DB.DB != nil {
		if err := s.DB.Close(); err != nil {
			s.Logger.WithError(err).Error("Database close failed")
		}
	}
	s.Logger.Info("Shutdown complete")
}

// RegisterRoutes mounts the health, readiness, spec and API routes.
//
// It is separate from Start so an operator or a test can build the full route
// table without opening a listener.
func (s *Server) RegisterRoutes() {
	s.registerHealthRoutes()
	s.registerAPIRoutes()
}

// registerHealthRoutes exposes liveness and readiness separately.
//
// /healthz reports that the process is running and never fails on a dependency,
// so a database blip does not trigger a restart loop.
//
// /readyz reports whether the instance should receive traffic. It returns 503
// when the database is unreachable, and 503 in demo mode: fabricated in-memory
// data must never be routed to by a load balancer.
func (s *Server) registerHealthRoutes() {
	s.Engine.GET("/healthz", func(c *gin.Context) {
		dbStatus := "disconnected"
		if s.DB != nil && s.DB.DB != nil {
			if err := s.DB.Ping(); err == nil {
				dbStatus = "connected"
			}
		}
		resp := gin.H{
			"status":    "healthy",
			"service":   fmt.Sprintf("RivicQ - %s", s.Edition),
			"edition":   s.Edition,
			"database":  dbStatus,
			"demo_mode": s.DemoMode,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		}
		if s.Edition == edition.Enterprise {
			resp["ibmq_connected"] = os.Getenv("IBMQ_ENABLED") == "true"
		}
		c.JSON(http.StatusOK, resp)
	})

	s.Engine.GET("/readyz", func(c *gin.Context) {
		dbReady := s.DB != nil && s.DB.DB != nil && s.DB.Ping() == nil

		status := "ready"
		code := http.StatusOK
		if !dbReady {
			status = "not_ready"
			code = http.StatusServiceUnavailable
		}
		if s.DemoMode {
			status = "demo_mode"
			code = http.StatusServiceUnavailable
		}

		c.JSON(code, gin.H{
			"status":    status,
			"database":  dbReady,
			"demo_mode": s.DemoMode,
			"service":   fmt.Sprintf("RivicQ - %s", s.Edition),
			"edition":   s.Edition,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
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

	for _, hook := range s.routeHooks {
		hook(apiGroup, s)
	}
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
						"summary":   "Health check",
						"responses": gin.H{"200": gin.H{"description": "Service health status"}},
					},
				},
				"/readyz": gin.H{
					"get": gin.H{
						"summary":   "Readiness check",
						"responses": gin.H{"200": gin.H{"description": "Service readiness including DB status"}},
					},
				},
				"/edition": gin.H{
					"get": gin.H{
						"summary":   "Edition info",
						"responses": gin.H{"200": gin.H{"description": "Edition type and feature flags"}},
					},
				},
				"/api/v1/cbom": gin.H{
					"get": gin.H{
						"summary":   "List CBOM reports",
						"responses": gin.H{"200": gin.H{"description": "Array of CBOM reports"}},
					},
					"post": gin.H{
						"summary":   "Create CBOM report",
						"responses": gin.H{"201": gin.H{"description": "Created CBOM report"}},
					},
				},
				"/api/v1/scans": gin.H{
					"post": gin.H{
						"summary":   "Trigger CBOM scan",
						"responses": gin.H{"202": gin.H{"description": "Scan accepted"}},
					},
				},
				"/api/v1/scans/{id}": gin.H{
					"get": gin.H{
						"summary":    "Get scan status",
						"parameters": []gin.H{{"name": "id", "in": "path", "required": true}},
						"responses":  gin.H{"200": gin.H{"description": "Scan status and results"}},
					},
				},
				"/api/v1/scans/{id}/stream": gin.H{
					"get": gin.H{
						"summary":    "SSE scan progress stream",
						"parameters": []gin.H{{"name": "id", "in": "path", "required": true}},
						"responses":  gin.H{"200": gin.H{"description": "Server-Sent Events stream"}},
					},
				},
				"/api/v1/dashboard/overview": gin.H{
					"get": gin.H{
						"summary":   "Dashboard overview",
						"responses": gin.H{"200": gin.H{"description": "Dashboard metrics"}},
					},
				},
				"/api/v1/cspm/overview": gin.H{
					"get": gin.H{
						"summary":   "CSPM overview (Enterprise)",
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

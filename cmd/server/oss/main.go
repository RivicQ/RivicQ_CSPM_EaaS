package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/middleware"
	"github.com/sirupsen/logrus"
)

func main() {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.TextFormatter{FullTimestamp: true})

	// Must precede any read of JWT_SECRET / CRYPTOBOM_DB_* below. config.LoadOSS
	// does not load the file itself, so dropping this call left the OSS binary
	// silently ignoring .env.
	config.LoadDotEnv()

	cfg, err := config.LoadOSS()
	if err != nil {
		log.Fatal("Failed to load OSS configuration: ", err)
	}

	// No database means a degraded instance: /healthz still answers so a probe
	// can see it, /readyz reports 503, and demo stubs stay labelled.
	db, dbOK := database.NewOptional(logger)

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery(), gin.Logger())

	if dbOK {
		if err := database.RunMigrations(db); err != nil {
			logger.WithError(err).Fatal("Database migration failed")
		}
	}

	// middleware.Setup installs RequestID, SecurityHeaders, Audit, RateLimit and
	// CORS, none of which the previous bootstrap had.
	middleware.Setup(router, nil, logger, db)

	registerLivenessRoutes(router, db, dbOK, logger)

	// Root-level, not under /api/v1: the frontend builds this URL as
	// host:port/edition before it picks a console shell (config/editions.ts).
	router.GET("/edition", func(c *gin.Context) {
		c.JSON(http.StatusOK, edition.Detect().Public())
	})

	apiGroup := router.Group("/api/v1")
	oss.SetupRoutes(apiGroup, db, logger, cfg)

	printStartupBanner(cfg.Server.Port, dbOK)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	port := ":" + cfg.Server.Port
	httpServer := &http.Server{
		Addr:              port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      300 * time.Second, // SSE scan progress
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
			logger.WithError(err).Fatal("HTTP server failed")
		}
	case sig := <-quit:
		logger.WithField("signal", sig.String()).Info("Shutting down")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		logger.WithError(err).Error("Graceful shutdown failed; forcing close")
		_ = httpServer.Close()
	}
	if dbOK && db != nil {
		if err := db.Close(); err != nil {
			logger.WithError(err).Error("Database close failed")
		}
	}
	logger.Info("Shutdown complete")
}

// registerLivenessRoutes separates liveness from readiness.
//
// /readyz returns 503 when there is no database or demo mode is active, so a
// load balancer never routes traffic to an instance serving fabricated data.
func registerLivenessRoutes(router *gin.Engine, db *database.DB, dbOK bool, logger *logrus.Logger) {
	router.GET("/healthz", func(c *gin.Context) {
		dbStatus := "disconnected"
		if dbOK && db != nil && db.DB != nil && db.Ping() == nil {
			dbStatus = "connected"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"service":   "RivicQ - Encryption as a Service (OSS)",
			"edition":   "Open Source",
			"database":  dbStatus,
			"demo_mode": !dbOK,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	router.GET("/readyz", func(c *gin.Context) {
		dbReady := dbOK && db != nil && db.DB != nil && db.Ping() == nil

		status, code := "ready", http.StatusOK
		switch {
		case !dbReady:
			status, code = "not_ready", http.StatusServiceUnavailable
		case !dbOK:
			status, code = "demo_mode", http.StatusServiceUnavailable
		}
		c.JSON(code, gin.H{
			"status":    status,
			"database":  dbReady,
			"demo_mode": !dbOK,
			"service":   "RivicQ - Encryption as a Service (OSS)",
		})
	})
}

func printStartupBanner(port string, dbOK bool) {
	mode := "PostgreSQL"
	if !dbOK {
		mode = "DEMO (in-memory, fabricated data — not for production)"
	}
	fmt.Printf("RivicQ OSS v1.0.0 — storage: %s\n", mode)
	fmt.Printf("  Health: http://localhost:%s/healthz\n", port)
	fmt.Printf("  API:    http://localhost:%s/api/v1\n", port)

	if ep := os.Getenv("AGENTIC_SECURITY_ENDPOINT"); ep != "" {
		fmt.Printf("  Agentic Security AI: %s\n", ep)
	}
	if os.Getenv("GITHUB_TOKEN") != "" {
		fmt.Printf("  GitHub scanning: configured\n")
	}
	if os.Getenv("GITHUB_WEBHOOK_SECRET") != "" || os.Getenv("RIVICQ_GITHUB_WEBHOOK_SECRET") != "" {
		fmt.Printf("  GitHub webhook: signature verification enabled\n")
	}
}

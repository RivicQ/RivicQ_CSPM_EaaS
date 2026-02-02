package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/promhttp"
	"github.com/rivic-q/cryptobom-saas/internal/api"
	"github.com/rivic-q/cryptobom-saas/internal/cilium"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/observability"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	if cfg.Debug {
		logger.SetLevel(logrus.DebugLevel)
	}

	// Initialize observability
	otelShutdown, err := observability.InitOTEL(cfg.ServiceName, cfg.Version)
	if err != nil {
		logger.Fatalf("Failed to initialize OpenTelemetry: %v", err)
	}
	defer otelShutdown(context.Background())

	// Initialize database
	db, err := database.NewConnection(cfg.Database)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run database migrations
	if err := database.RunMigrations(db, "migrations"); err != nil {
		logger.Fatalf("Failed to run database migrations: %v", err)
	}

	// Initialize Gin router
	router := gin.Default()

	// Add middleware
	router.Use(gin.Recovery())
	router.Use(api.CORS())
	router.Use(api.Logging(logger))
	router.Use(api.RequestID())

	// Initialize Cilium scanner (background)
	go func() {
		ciliumScanner := cilium.NewCiliumCryptoScanner(logger)
		if err := ciliumScanner.Start(context.Background()); err != nil {
			logger.WithError(err).Error("Failed to start Cilium scanner")
		} else {
			logger.Info("Cilium crypto scanner started successfully")
		}
	}()

	// Health check endpoint
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   cfg.ServiceName,
			"version":   cfg.Version,
			"timestamp": time.Now().UTC(),
		})
	})

	// Metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	v1 := router.Group("/api/v1")
	api.SetupRoutes(v1, db, logger, cfg)

	// Start server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	logger.Infof("Starting CryptoBOM SaaS server on port %d", cfg.Port)

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Info("Server exited")
}

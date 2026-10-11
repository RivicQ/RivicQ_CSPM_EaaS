package shared

import (
	"context"
	"database/sql"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/authn"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/platform"
	"github.com/sirupsen/logrus"
)

// DemoModeEnabled reports whether the operator explicitly allowed serving the
// labeled demo identity and fabricated demo data.
func DemoModeEnabled() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("DEMO_MODE")))
	if v == "true" || v == "1" || v == "yes" {
		return true
	}
	v = strings.ToLower(strings.TrimSpace(os.Getenv("RIVICQ_ALLOW_DEMO_MODE")))
	return v == "true" || v == "1" || v == "yes"
}

func isProductionRuntime() bool {
	for _, key := range []string{"CRYPTOBOM_ENV", "RIVICQ_ENV", "ENV"} {
		switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
		case "production", "prod":
			return true
		}
	}
	return gin.Mode() == gin.ReleaseMode
}

// SetupStandardAuth builds the authn lifecycle backed by PostgreSQL (when a
// database is configured) or the in-memory store, seeds the bootstrap admin and
// (when DEMO_MODE is on) the demo identities, then wires the deny-by-default
// authentication gate, the authorization model, and every /auth route.
func SetupStandardAuth(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger) *authn.Service {
	cfg, err := authn.LoadConfig()
	if err != nil {
		logger.WithError(err).Fatal("refusing to start: configuration error")
	}
	production := isProductionRuntime()
	if production && cfg.DemoMode {
		logger.Warn("DEMO_MODE is enabled in a production runtime; the demo identity and demo data are reachable")
	}

	var store authn.Store
	if db != nil && db.DB != nil {
		if err := ensureDefaultTenant(db.DB, logger); err != nil {
			logger.WithError(err).Warn("default tenant not ensured; bootstrap seeding may fail")
		}
		store = authn.NewSQLStore(db.DB)
		logger.Info("Auth using PostgreSQL-backed store (authn lifecycle)")
	} else {
		store = authn.NewMemStore()
		logger.Warn("Auth using in-memory store (no database configured)")
	}

	authService, err := authn.NewService(cfg, store)
	if err != nil {
		logger.WithError(err).Fatal("refusing to start without a strong auth signing secret")
	}

	if err := authService.SeedBootstrap(context.Background()); err != nil {
		logger.WithError(err).Warn("bootstrap seeding skipped")
	}

	// Deny by default: every /api/v1 route requires a valid access token
	// unless it appears in auth.PublicRoutes.
	router.Use(authService.EnforceAuth())
	// Authentication is not authorization. Without this, every role that could
	// log in could also delete reports and mint API keys.
	router.Use(auth.RequireRoutePermission())

	handlers := authn.NewHandlers(authService, logger)
	authGroup := router.Group("/auth")
	handlers.RegisterRoutes(authGroup)
	SetupOAuthRoutes(authGroup, logger, authService, cfg.AllowedDomains, cfg.DemoMode)

	var sqlDB *sql.DB
	if db != nil {
		sqlDB = db.DB
	}
	platform.SetupRoutes(router, logger, authService, sqlDB)
	return authService
}

func ensureDefaultTenant(db *sql.DB, logger *logrus.Logger) error {
	var tenantCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM tenants").Scan(&tenantCount); err != nil {
		return err
	}
	if tenantCount == 0 {
		_, err := db.Exec(`INSERT INTO tenants (id, name, domain) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			"tenant-1", "Default Organization", "rivicq.local")
		if err != nil {
			return err
		}
		logger.Info("Default tenant created")
	}
	return nil
}

// SetupOAuthRoutes mounts the provider handshakes on the auth group.
func SetupOAuthRoutes(authGroup *gin.RouterGroup, logger *logrus.Logger, authService *authn.Service, allowedDomains []string, _ bool) {
	authGroup.GET("/google/login", GoogleLoginHandler(logger))
	authGroup.POST("/google/exchange", GoogleExchangeHandler(logger, authService, allowedDomains))
	authGroup.GET("/google/callback", GoogleCallbackHandler(logger, authService, allowedDomains))
	authGroup.POST("/google/callback", GoogleCallbackHandler(logger, authService, allowedDomains))
	authGroup.GET("/google/status", GoogleOAuthStatusHandler(logger))

	authGroup.GET("/github/login", GitHubLoginHandler(logger))
	authGroup.GET("/github/callback", GitHubCallbackHandler(logger, authService, allowedDomains))
	authGroup.POST("/github/callback", GitHubCallbackHandler(logger, authService, allowedDomains))
	authGroup.GET("/github/status", GitHubOAuthStatusHandler(logger))
}

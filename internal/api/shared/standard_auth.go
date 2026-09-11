package shared

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/platform"
	"github.com/sirupsen/logrus"
)

const (
	defaultJWTSecret         = "oss-default-secret-not-for-production"
	defaultBootstrapPassword = "DemoPass123!"
)

func isProductionRuntime() bool {
	for _, key := range []string{"CRYPTOBOM_ENV", "RIVICQ_ENV", "ENV"} {
		switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
		case "production", "prod":
			return true
		}
	}
	return gin.Mode() == gin.ReleaseMode
}

func resolveJWTSecret(raw string, production bool) (string, error) {
	secret := strings.TrimSpace(raw)
	if secret == "" || secret == defaultJWTSecret {
		if production {
			return "", fmt.Errorf("JWT_SECRET must be a unique value in production")
		}
		if secret == "" {
			secret = defaultJWTSecret
		}
	}
	return secret, nil
}

// SetupStandardAuth configures JWT auth with PostgreSQL or in-memory user store.
func SetupStandardAuth(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger) *auth.AuthService {
	production := isProductionRuntime()
	jwtSecret, err := resolveJWTSecret(os.Getenv("JWT_SECRET"), production)
	if err != nil {
		logger.WithError(err).Fatal("refusing to start with an unsafe JWT secret")
	}
	if jwtSecret == defaultJWTSecret {
		logger.Warn("JWT_SECRET not set — using default secret for development only")
	}

	allowedDomains := auth.AllowedDomainsFromEnv()
	var userStore auth.UserStore

	if db != nil && db.DB != nil {
		userStore = auth.NewDatabaseUserStore(db.DB)
		logger.Info("Auth using PostgreSQL database user store")

		bootstrapEmail := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_EMAIL"))
		if bootstrapEmail == "" {
			bootstrapEmail = "admin@rivicq.local"
		}
		bootstrapPassword := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_PASSWORD"))
		if bootstrapPassword == "" {
			bootstrapPassword = defaultBootstrapPassword
		}
		bootstrapName := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_NAME"))
		if bootstrapName == "" {
			bootstrapName = "Admin"
		}
		bootstrapRole := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_ROLE"))
		if bootstrapRole == "" {
			bootstrapRole = "admin"
		}

		var tenantCount int
		if err := db.DB.QueryRow("SELECT COUNT(*) FROM tenants").Scan(&tenantCount); err == nil && tenantCount == 0 {
			_, _ = db.Exec(`INSERT INTO tenants (id, name, domain) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
				"tenant-1", "Default Organization", "rivicq.local")
		}

		var userCount int
		if err := db.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount); err == nil && userCount == 0 {
			if production && bootstrapPassword == defaultBootstrapPassword {
				logger.Fatal("AUTH_BOOTSTRAP_PASSWORD must be set in production; DemoPass123! is not allowed")
			}
			if hashedPassword, hashErr := auth.HashPassword(bootstrapPassword); hashErr == nil {
				_, execErr := db.Exec(`
					INSERT INTO users (id, tenant_id, email, name, role, password)
					VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
					uuid.New().String(), "tenant-1", bootstrapEmail, bootstrapName, bootstrapRole, hashedPassword)
				if execErr == nil {
					logger.WithField("email", bootstrapEmail).Info("Bootstrap admin user created")
				}
				if !production {
					demoEmail := strings.TrimSpace(os.Getenv("AUTH_DEMO_EMAIL"))
					if demoEmail == "" {
						demoEmail = "demo@rivicq.local"
					}
					demoPass := strings.TrimSpace(os.Getenv("AUTH_DEMO_PASSWORD"))
					if demoPass == "" {
						demoPass = bootstrapPassword
					}
					if hashedDemo, demoErr := auth.HashPassword(demoPass); demoErr == nil {
						_, _ = db.Exec(`
							INSERT INTO users (id, tenant_id, email, name, role, password)
							VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
							uuid.New().String(), "tenant-1", demoEmail, "Community demo", "operator", hashedDemo)
						logger.WithField("email", demoEmail).Info("Bootstrap Community demo operator created")
					}
				}
			}
		}
	} else {
		store, err := auth.NewWorkDomainUserStore()
		if err != nil {
			logger.WithError(err).Fatal("Unable to initialize auth store")
		}
		userStore = store
		logger.Warn("Auth using in-memory user store (demo mode)")
	}

	authService := auth.NewAuthService(jwtSecret, userStore)
	router.Use(authService.OptionalJWTAuthMiddleware())
	SetupAuthRoutes(router, logger, authService, allowedDomains)
	var sqlDB *sql.DB
	if db != nil {
		sqlDB = db.DB
	}
	platform.SetupRoutes(router, logger, authService, sqlDB)
	return authService
}

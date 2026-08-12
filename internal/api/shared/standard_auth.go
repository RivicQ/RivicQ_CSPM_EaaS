package shared

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// SetupStandardAuth configures JWT auth with PostgreSQL or in-memory user store.
func SetupStandardAuth(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger) *auth.AuthService {
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if jwtSecret == "" {
		jwtSecret = "oss-default-secret-not-for-production"
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
			bootstrapPassword = "DemoPass123!"
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
			if hashedPassword, hashErr := auth.HashPassword(bootstrapPassword); hashErr == nil {
				_, execErr := db.Exec(`
					INSERT INTO users (id, tenant_id, email, name, role, password)
					VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
					uuid.New().String(), "tenant-1", bootstrapEmail, bootstrapName, bootstrapRole, hashedPassword)
				if execErr == nil {
					logger.WithField("email", bootstrapEmail).Info("Bootstrap admin user created")
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
	SetupAuthRoutes(router, logger, authService, allowedDomains)
	return authService
}

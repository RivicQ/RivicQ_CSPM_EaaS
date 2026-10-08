package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/sirupsen/logrus"
)

func Setup(router *gin.Engine, editionCfg *edition.Config, logger *logrus.Logger, db *database.DB) {
	if editionCfg == nil {
		editionCfg = edition.Detect()
	}
	if logger == nil {
		logger = logrus.New()
	}

	// Trust no proxies unless the operator opts in via TRUSTED_PROXIES. With
	// gin's default (trust all) the audit log and rate limiter can be bypassed
	// through spoofed X-Forwarded-For headers.
	if proxies := splitProxies(os.Getenv("TRUSTED_PROXIES")); len(proxies) == 0 {
		if err := router.SetTrustedProxies(nil); err != nil {
			logger.WithError(err).Error("SetTrustedProxies(nil) failed")
		}
	} else if err := router.SetTrustedProxies(proxies); err != nil {
		logger.WithError(err).Fatal("TRUSTED_PROXIES contains invalid values")
	}

	router.Use(RequestID())
	router.Use(SecurityHeaders())
	router.Use(Audit(logger, db))
	router.Use(RateLimit(editionCfg.Features.APIRateLimit))

	router.Use(CORS(DefaultCORSConfig()))

	router.Use(func(c *gin.Context) {
		c.Header("X-CryptoBOM-Edition", string(editionCfg.Edition))
		c.Next()
	})

	// Tracing middleware added per-service (the enterprise main.go wires it)
}

// splitProxies parses the comma-separated TRUSTED_PROXIES env value.
func splitProxies(raw string) []string {
	var out []string
	for _, p := range strings.Split(raw, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/sirupsen/logrus"
)

func Setup(router *gin.Engine, editionCfg *edition.Config, logger *logrus.Logger, db *database.DB) {
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

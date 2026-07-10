package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

func Audit(logger *logrus.Logger, db *database.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		if raw != "" {
			path = path + "?" + raw
		}

		rid := c.GetString("request_id")
		if rid == "" {
			rid = uuid.New().String()
		}

		c.Next()

		latencyMs := int(time.Since(start).Milliseconds())
		status := c.Writer.Status()
		ip := c.ClientIP()
		ua := c.Request.UserAgent()
		method := c.Request.Method

		entry := logger.WithFields(logrus.Fields{
			"request_id": rid,
			"method":     method,
			"path":       path,
			"status":     status,
			"latency_ms": latencyMs,
			"ip":         ip,
			"user_agent": ua,
			"body_bytes": c.Writer.Size(),
		})

		if status >= 500 {
			entry.Error("server error")
		} else if status >= 400 {
			entry.Warn("client error")
		} else {
			entry.Info("request")
		}

		if db != nil && db.Queries != nil {
			eventType := "request"
			if status >= 500 {
				eventType = "server_error"
			} else if status >= 400 {
				eventType = "client_error"
			}
			_ = db.Queries.InsertAuditEvent("", eventType, rid, method, path, status, latencyMs, ip, ua, "")
		}
	}
}

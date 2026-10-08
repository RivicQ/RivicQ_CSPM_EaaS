package middleware

import (
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	AllowLocalDev    bool
	MaxAge           time.Duration
}

func DefaultCORSConfig() CORSConfig {
	origins := []string{"https://rivicq.github.io"}
	if extra := strings.TrimSpace(os.Getenv("CORS_ORIGINS")); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}
	return CORSConfig{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch, http.MethodOptions},
		AllowedHeaders:   []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID", "Idempotency-Key"},
		ExposedHeaders:   []string{"X-Request-ID", "X-CryptoBOM-Edition", "Retry-After"},
		AllowCredentials: true,
		AllowLocalDev:    true,
		MaxAge:           12 * time.Hour,
	}
}

func CORS(cfg CORSConfig) gin.HandlerFunc {
	originMap := make(map[string]bool, len(cfg.AllowedOrigins))
	for _, o := range cfg.AllowedOrigins {
		originMap[strings.ToLower(o)] = true
	}
	allowAll := originMap["*"]

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		allowed := allowAll || originMap[strings.ToLower(origin)] || (cfg.AllowLocalDev && isLocalDevOrigin(origin))
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}

		c.Header("Access-Control-Allow-Methods", strings.Join(cfg.AllowedMethods, ", "))
		c.Header("Access-Control-Allow-Headers", strings.Join(cfg.AllowedHeaders, ", "))

		if len(cfg.ExposedHeaders) > 0 {
			c.Header("Access-Control-Expose-Headers", strings.Join(cfg.ExposedHeaders, ", "))
		}

		if cfg.AllowCredentials {
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		if cfg.MaxAge > 0 {
			c.Header("Access-Control-Max-Age", cfg.MaxAge.String())
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// isLocalDevOrigin reports whether the origin is a plain-http localhost /
// 127.0.0.1 request (react-scripts picks the first free port, e.g. 3000 or
// 3001). Local development origins are always allowed so credentials-bearing
// requests work no matter which port the dev server lands on.
func isLocalDevOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Scheme != "http" {
		return false
	}
	switch u.Hostname() {
	case "localhost", "127.0.0.1", "::1":
		return true
	}
	return false
}

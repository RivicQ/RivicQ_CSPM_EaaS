package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSReflectsGitHubPagesOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORS(DefaultCORSConfig()))
	r.GET("/api/v1/edition", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"edition": "oss"}) })

	req := httptest.NewRequest(http.MethodGet, "/api/v1/edition", nil)
	req.Header.Set("Origin", "https://rivicq.github.io")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Header().Get("Access-Control-Allow-Origin") != "https://rivicq.github.io" {
		t.Fatalf("allow origin = %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
	if w.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatal("expected credentials")
	}
}

func TestCORSAllowsExtraOriginsFromEnv(t *testing.T) {
	t.Setenv("CORS_ORIGINS", "https://rivicq.com")
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORS(DefaultCORSConfig()))
	r.GET("/api/v1/edition", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"edition": "oss"}) })

	req := httptest.NewRequest(http.MethodGet, "/api/v1/edition", nil)
	req.Header.Set("Origin", "https://rivicq.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Header().Get("Access-Control-Allow-Origin") != "https://rivicq.com" {
		t.Fatalf("allow origin = %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

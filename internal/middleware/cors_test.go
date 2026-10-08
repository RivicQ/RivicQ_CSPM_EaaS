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

func TestCORSAllowsLocalDevOriginsOnAnyPort(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORS(DefaultCORSConfig()))
	r.GET("/api/v1/edition", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"edition": "oss"}) })

	for _, origin := range []string{"http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:8081"} {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/edition", nil)
		req.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != origin {
			t.Errorf("origin %q: allow origin = %q, want %q", origin, got, origin)
		}
	}
}

func TestCORSRejectsUnknownCrossSiteOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORS(DefaultCORSConfig()))
	r.GET("/api/v1/edition", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"edition": "oss"}) })

	req := httptest.NewRequest(http.MethodGet, "/api/v1/edition", nil)
	req.Header.Set("Origin", "https://evil-attacker.example")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unexpected allow origin = %q", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("credentials header = %q, want true (present because it is config, but no origin is echoed)", got)
	}
}

func TestCORSBlocksPreflightFromUnknownOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORS(DefaultCORSConfig()))
	r.GET("/api/v1/edition", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"edition": "oss"}) })

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/edition", nil)
	req.Header.Set("Origin", "https://evil-attacker.example")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unexpected allow origin = %q", got)
	}
}

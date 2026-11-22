package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/eaas"
)

func main() {
	addr := flag.String("addr", envDefault("EAAS_ADDR", ":9091"), "listen address")
	dataFile := flag.String("data", envDefault("EAAS_DATA_FILE", "./data/eaas-store.json"), "sandbox state file")
	environment := flag.String("env", envDefault("EAAS_ENV", "development"), "development or production")
	staticDir := flag.String("static", envDefault("EAAS_STATIC_DIR", "./web/eaas"), "developer portal directory")
	adminToken := flag.String("admin-token", os.Getenv("EAAS_ADMIN_TOKEN"), "token for beta registration review endpoint")
	allowedOrigins := flag.String("allowed-origins", os.Getenv("EAAS_ALLOWED_ORIGINS"), "comma-separated CORS origins allowed to call the EaaS API")
	flag.Parse()

	service, err := eaas.NewService(eaas.Config{
		DataFile:       *dataFile,
		Environment:    *environment,
		AdminToken:     *adminToken,
		AllowedOrigins: splitOrigins(*allowedOrigins),
	})
	if err != nil {
		log.Fatalf("eaas: initialise service: %v", err)
	}

	router := eaas.Router(service)
	if *staticDir != "" {
		router.StaticFS("/portal", http.Dir(*staticDir))
		router.StaticFile("/", *staticDir+"/index.html")
	}

	server := &http.Server{
		Addr:              *addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	log.Printf("RivicQ EaaS %s listening on %s (state: %s)", *environment, *addr, *dataFile)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("eaas: server stopped: %v", err)
	}
}

func envDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitOrigins(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

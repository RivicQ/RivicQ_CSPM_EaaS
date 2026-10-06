//go:build enterprise

package main

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/enterprise"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/observability"
	"github.com/rivic-q/cryptobom-saas/internal/server"
	"github.com/sirupsen/logrus"
)

// This binary delegates to internal/server rather than assembling its own router.
//
// It used to call gin.Default().Run(), which meant no read/write/idle timeouts,
// no graceful drain, and a /readyz that always returned 200 even with no
// database. A second bootstrap like that is how a hardened build quietly stops
// being hardened, so there is now exactly one server construction path.
func main() {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Must precede LoadEnterprise: server.New also loads .env, but it runs after
	// this configuration read, so relying on it here would silently ignore .env.
	config.LoadDotEnv()

	cfg, err := config.LoadEnterprise()
	if err != nil {
		logger.WithError(err).Fatal("Failed to load Enterprise configuration")
	}

	// Initialize OpenTelemetry tracing.
	otelShutdown, err := observability.InitOTEL("cryptobom-enterprise", "2.0.0")
	if err != nil {
		logger.Warn("OpenTelemetry initialization failed (tracing disabled): ", err)
	} else {
		defer func() {
			if err := otelShutdown(context.Background()); err != nil {
				logger.Error("OpenTelemetry shutdown error: ", err)
			}
		}()
		logger.Info("OpenTelemetry tracing enabled")
	}

	// IBMQ-specific routes, registered through the shared bootstrap so the
	// hardened HTTP server, readiness probe, and auth gate still apply.
	ibmqRoutes := func(api *gin.RouterGroup, s *server.Server) {
		group := api.Group("/ibmq")
		group.GET("/status", enterprise.GetIBMQStatus(cfg))
		group.GET("/systems", enterprise.ListIBMQuantumSystems(cfg))
		group.POST("/attest", enterprise.CreateIBMQuantumAttestation(cfg, s.Logger))
		group.GET("/networks", enterprise.ListQuantumNetworks(cfg, s.Logger))
		group.POST("/emergency", enterprise.TriggerEmergencyQuantumResponse(cfg, s.Logger))
	}

	srv := server.New(
		server.WithLogger(logger),
		server.WithPort(cfg.Server.Port),
		server.WithAPIRouteHook(ibmqRoutes),
	)

	printBanner(srv.Port)

	srv.Start()
}

func printBanner(port string) {
	if port == "" {
		port = "9090"
	}
	fmt.Printf("RivicQ - Encryption as a Service (Enterprise) v%s\n", "2.0.0")
	fmt.Printf("  Server running on port %s\n", port)
	fmt.Printf("  Health: http://localhost:%s/healthz\n", port)
	fmt.Printf("  API:    http://localhost:%s/api/v1\n", port)
	fmt.Printf("  IBMQ:   http://localhost:%s/api/v1/ibmq\n", port)
	fmt.Print("\n  Enterprise Edition Features:\n")
	fmt.Print("     Community engine plus control plane (SSO config, audit, API keys)\n")
	fmt.Print("     Multi-cloud / HSM / quantum connectors when credentials exist\n")
	fmt.Print("     DORA pack mappings (not a certification)\n")
	fmt.Print("     Declared HSM/TPM/QSIC inventory (QSIC is research silicon)\n")
	fmt.Print("     Live Kubernetes attach when a cluster credential is configured\n\n")
}

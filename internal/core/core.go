package core

import (
	"fmt"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"
)

type CoreStatus struct {
	Version      string             `json:"version"`
	Uptime       string             `json:"uptime"`
	GoVersion    string             `json:"go_version"`
	OS           string             `json:"os"`
	Arch         string             `json:"arch"`
	Edition      string             `json:"edition"`
	Integrations IntegrationsStatus `json:"integrations"`
	Tools        ToolsStatus        `json:"tools"`
	Services     ServicesStatus     `json:"services"`
}

type IntegrationsStatus struct {
	Prometheus      bool `json:"prometheus"`
	Grafana         bool `json:"grafana"`
	Cilium          bool `json:"cilium"`
	Trivy           bool `json:"trivy"`
	Syft            bool `json:"syft"`
	CodeQL          bool `json:"codeql"`
	GoogleOAuth     bool `json:"google_oauth"`
	GitHubOAuth     bool `json:"github_oauth"`
	GitHubScanning  bool `json:"github_scanning"`
	GitHubActions   bool `json:"github_actions"`
	OutboundNetwork bool `json:"outbound_network"`
}

type ToolsStatus struct {
	CBOMScanning    bool `json:"cbom_scanning"`
	AssetDiscovery  bool `json:"asset_discovery"`
	DemoScanner     bool `json:"demo_scanner"`
	EcosystemPortal bool `json:"ecosystem_portal"`
}

type ServicesStatus struct {
	AgenticSecurity ServiceHealth `json:"agentic_security"`
	RivicQProtocol  ServiceHealth `json:"rivicq_protocol"`
	CryptoBOMCore   ServiceHealth `json:"cryptobom_core"`
}

type ServiceHealth struct {
	Reachable bool   `json:"reachable"`
	Status    string `json:"status"`
	URL       string `json:"url,omitempty"`
	Error     string `json:"error,omitempty"`
}

var startTime = time.Now()

func GetStatus(edition string) CoreStatus {
	return CoreStatus{
		Version:   "0.1.0",
		Uptime:    time.Since(startTime).Round(time.Second).String(),
		GoVersion: runtime.Version(),
		OS:        runtime.GOOS,
		Arch:      runtime.GOARCH,
		Edition:   edition,
		Integrations: IntegrationsStatus{
			Prometheus:      os.Getenv("PROMETHEUS_ENABLED") == "true",
			Grafana:         os.Getenv("GRAFANA_ENABLED") == "true",
			Cilium:          os.Getenv("CILIUM_ENDPOINT") != "",
			Trivy:           true,
			Syft:            true,
			CodeQL:          true,
			GoogleOAuth:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID") != "" && os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET") != "",
			GitHubOAuth:     os.Getenv("GITHUB_OAUTH_CLIENT_ID") != "" && os.Getenv("GITHUB_OAUTH_CLIENT_SECRET") != "",
			GitHubScanning:  os.Getenv("GITHUB_TOKEN") != "",
			GitHubActions:   os.Getenv("GITHUB_ACTIONS") == "true",
			OutboundNetwork: true,
		},
		Tools: ToolsStatus{
			CBOMScanning:    true,
			AssetDiscovery:  true,
			DemoScanner:     true,
			EcosystemPortal: true,
		},
		Services: ServicesStatus{
			AgenticSecurity: probeService(os.Getenv("AGENTIC_SECURITY_ENDPOINT"), "agentic-security"),
			RivicQProtocol:  probeService(os.Getenv("RIVICQ_PROTOCOL_ENDPOINT"), "rivicq-protocol"),
			CryptoBOMCore:   ServiceHealth{Reachable: true, Status: "running"},
		},
	}
}

func CheckIntegration(name string) (bool, string) {
	switch name {
	case "prometheus":
		return os.Getenv("PROMETHEUS_ENABLED") == "true", "Prometheus scraping endpoint"
	case "grafana":
		return os.Getenv("GRAFANA_ENABLED") == "true", "Grafana dashboard embedding"
	case "cilium":
		return os.Getenv("CILIUM_ENDPOINT") != "", "Cilium eBPF flow monitoring"
	case "trivy":
		return true, "Trivy vulnerability scanner"
	case "syft":
		return true, "Syft SBOM generation"
	case "codeql":
		return true, "CodeQL static analysis"
	case "google_oauth":
		ok := os.Getenv("GOOGLE_OAUTH_CLIENT_ID") != "" && os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET") != ""
		return ok, "Google OAuth single sign-on"
	case "github_oauth":
		ok := os.Getenv("GITHUB_OAUTH_CLIENT_ID") != "" && os.Getenv("GITHUB_OAUTH_CLIENT_SECRET") != ""
		return ok, "GitHub OAuth single sign-on"
	case "github_scanning":
		return os.Getenv("GITHUB_TOKEN") != "", "GitHub repository scanning"
	case "github_actions":
		return os.Getenv("GITHUB_ACTIONS") == "true", "GitHub Actions CI/CD"
	case "agentic_security":
		endpoint := os.Getenv("AGENTIC_SECURITY_ENDPOINT")
		return endpoint != "", fmt.Sprintf("RivicQ Agentic Security AI at %s", endpoint)
	case "rivicq_protocol":
		endpoint := os.Getenv("RIVICQ_PROTOCOL_ENDPOINT")
		return endpoint != "", fmt.Sprintf("RivicQ Crosschain Protocol at %s", endpoint)
	default:
		return false, "unknown integration"
	}
}

func GetServices() ServicesStatus {
	return ServicesStatus{
		AgenticSecurity: probeService(os.Getenv("AGENTIC_SECURITY_ENDPOINT"), "agentic-security"),
		RivicQProtocol:  probeService(os.Getenv("RIVICQ_PROTOCOL_ENDPOINT"), "rivicq-protocol"),
		CryptoBOMCore:   ServiceHealth{Reachable: true, Status: "running"},
	}
}

func probeService(endpoint, name string) ServiceHealth {
	if endpoint == "" {
		return ServiceHealth{
			Reachable: false,
			Status:    "not_configured",
			Error:     fmt.Sprintf("%s endpoint not set (set %s_ENDPOINT env var)", name, strings.ToUpper(name)),
		}
	}
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(endpoint + "/healthz")
	if err != nil {
		return ServiceHealth{
			Reachable: false,
			Status:    "unreachable",
			URL:       endpoint,
			Error:     err.Error(),
		}
	}
	defer func() { _ = resp.Body.Close() }()
	status := "healthy"
	if resp.StatusCode >= 400 {
		status = "degraded"
	}
	return ServiceHealth{
		Reachable: true,
		Status:    status,
		URL:       endpoint,
	}
}

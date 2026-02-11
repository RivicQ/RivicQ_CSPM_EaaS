package config

import (
	"fmt"
	"os"
	"strings"
)

// OSS Configuration for Open Source edition
type OSSConfig struct {
	Server   ServerConfig      `yaml:"server"`
	Database OSSDatabaseConfig `yaml:"database"`
	Demo     DemoConfig        `yaml:"demo"`
	Logging  LoggingConfig     `yaml:"logging"`
	Cilium   CiliumConfig      `yaml:"cilium"`
}

// Enterprise Configuration with IBMQ integration
type EnterpriseConfig struct {
	Server     ServerConfig             `yaml:"server"`
	Database   EnterpriseDatabaseConfig `yaml:"database"`
	Demo       DemoConfig               `yaml:"demo"`
	Logging    LoggingConfig            `yaml:"logging"`
	Cilium     CiliumConfig             `yaml:"cilium"`
	IBMQ       IBMQConfig               `yaml:"ibmq"`
	ML         MLConfig                 `yaml:"ml"`
	Cloud      CloudConfig              `yaml:"cloud"`
	SSO        SSOConfig                `yaml:"sso"`
	Analytics  AnalyticsConfig          `yaml:"analytics"`
	Enterprise EnterpriseConfigFeatures `yaml:"enterprise"`
}

type IBMQConfig struct {
	Enabled  bool   `yaml:"enabled"`
	APIKey   string `yaml:"api_key"`
	Endpoint string `yaml:"endpoint"`
	Network  string `yaml:"network"`
	Timeout  int    `yaml:"timeout"`
}

type MLConfig struct {
	Enabled    bool    `yaml:"enabled"`
	ModelPath  string  `yaml:"model_path"`
	Confidence float64 `yaml:"confidence_threshold"`
	ThreatAPI  string  `yaml:"threat_api"`
}

type CloudConfig struct {
	AWS   AWSConfig   `yaml:"aws"`
	GCP   GCPConfig   `yaml:"gcp"`
	Azure AzureConfig `yaml:"azure"`
}

type AWSConfig struct {
	Enabled   bool   `yaml:"enabled"`
	AccessKey string `yaml:"access_key"`
	SecretKey string `yaml:"secret_key"`
	Region    string `yaml:"region"`
}

type GCPConfig struct {
	Enabled   bool   `yaml:"enabled"`
	ProjectID string `yaml:"project_id"`
	KeyFile   string `yaml:"key_file"`
}

type AzureConfig struct {
	Enabled      bool   `yaml:"enabled"`
	Subscription string `yaml:"subscription"`
	TenantID     string `yaml:"tenant_id"`
	ClientID     string `yaml:"client_id"`
	ClientSecret string `yaml:"client_secret"`
}

type SSOConfig struct {
	SAML  SAMLConfig  `yaml:"saml"`
	LDAP  LDAPConfig  `yaml:"ldap"`
	OAuth OAuthConfig `yaml:"oauth"`
}

type SAMLConfig struct {
	Enabled     bool   `yaml:"enabled"`
	IDPURL      string `yaml:"idp_url"`
	Certificate string `yaml:"certificate"`
}

type LDAPConfig struct {
	Enabled  bool   `yaml:"enabled"`
	URL      string `yaml:"url"`
	BindDN   string `yaml:"bind_dn"`
	BindPass string `yaml:"bind_password"`
	BaseDN   string `yaml:"base_dn"`
}

type OAuthConfig struct {
	Enabled   bool   `yaml:"enabled"`
	Provider  string `yaml:"provider"`
	ClientID  string `yaml:"client_id"`
	SecretKey string `yaml:"secret_key"`
}

type AnalyticsConfig struct {
	Enabled     bool   `yaml:"enabled"`
	MLModelPath string `yaml:"ml_model_path"`
	ForecastAPI string `yaml:"forecast_api"`
}

type EnterpriseConfigFeatures struct {
	AdvancedThreatDetection bool `yaml:"advanced_threat_detection"`
	MultiCloudSupport       bool `yaml:"multi_cloud_support"`
	EnterpriseSSO           bool `yaml:"enterprise_sso"`
	AdvancedAnalytics       bool `yaml:"advanced_analytics"`
	PremiumSupport          bool `yaml:"premium_support"`
}

// Shared configuration types
type ServerConfig struct {
	Port      string `yaml:"port"`
	Host      string `yaml:"host"`
	Mode      string `yaml:"mode"`
	CORS      bool   `yaml:"cors"`
	RateLimit int    `yaml:"rate_limit"`
}

type OSSDatabaseConfig struct {
	URL     string `yaml:"url"`
	Type    string `yaml:"type"`
	SSL     bool   `yaml:"ssl"`
	Timeout int    `yaml:"timeout"`
}

type EnterpriseDatabaseConfig struct {
	URL     string `yaml:"url"`
	Type    string `yaml:"type"`
	SSL     bool   `yaml:"ssl"`
	Timeout int    `yaml:"timeout"`
}

type DemoConfig struct {
	Enabled  bool `yaml:"enabled"`
	AutoData bool `yaml:"auto_data"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
	Output string `yaml:"output"`
}

type CiliumConfig struct {
	Enabled   bool   `yaml:"enabled"`
	Endpoint  string `yaml:"endpoint"`
	APIToken  string `yaml:"api_token"`
	Namespace string `yaml:"namespace"`
}

// LoadOSS configuration for Open Source edition
func LoadOSS() (*OSSConfig, error) {
	config := &OSSConfig{
		Server: ServerConfig{
			Port:      "8080",
			Host:      "localhost",
			Mode:      "debug",
			CORS:      true,
			RateLimit: 100,
		},
		Database: OSSDatabaseConfig{
			URL:     "sqlite:///tmp/cryptobom-oss.db",
			Type:    "sqlite",
			SSL:     false,
			Timeout: 30,
		},
		Demo: DemoConfig{
			Enabled:  true,
			AutoData: true,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
			Output: "stdout",
		},
		Cilium: CiliumConfig{
			Enabled:   true,
			Endpoint:  "localhost:8081",
			APIToken:  "",
			Namespace: "default",
		},
	}

	// Override with environment variables if present
	if os.Getenv("CRYPTOBOM_PORT") != "" {
		config.Server.Port = os.Getenv("CRYPTOBOM_PORT")
	}
	if os.Getenv("CRYPTOBOM_LOG_LEVEL") != "" {
		config.Logging.Level = os.Getenv("CRYPTOBOM_LOG_LEVEL")
	}
	if os.Getenv("CILIUM_ENDPOINT") != "" {
		config.Cilium.Endpoint = os.Getenv("CILIUM_ENDPOINT")
	}

	return config, nil
}

// LoadEnterprise configuration for Enterprise edition
func LoadEnterprise() (*EnterpriseConfig, error) {
	config := &EnterpriseConfig{
		Server: ServerConfig{
			Port:      "9090",
			Host:      "localhost",
			Mode:      "release",
			CORS:      true,
			RateLimit: 1000,
		},
		Database: EnterpriseDatabaseConfig{
			URL:     "postgresql://user:pass@localhost:5432/cryptobom_enterprise",
			Type:    "postgresql",
			SSL:     true,
			Timeout: 60,
		},
		Demo: DemoConfig{
			Enabled:  true,
			AutoData: true,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
			Output: "stdout",
		},
		Cilium: CiliumConfig{
			Enabled:   true,
			Endpoint:  "localhost:8081",
			APIToken:  "",
			Namespace: "cryptobom-enterprise",
		},
		IBMQ: IBMQConfig{
			Enabled:  getEnvBool("IBMQ_ENABLED", true),
			APIKey:   getEnv("IBMQ_API_KEY", ""),
			Endpoint: getEnv("IBMQ_ENDPOINT", "https://quantum-computing.ibm.com/api"),
			Network:  getEnv("IBMQ_NETWORK", "ibm-q"),
			Timeout:  getEnvInt("IBMQ_TIMEOUT", 30),
		},
		ML: MLConfig{
			Enabled:    getEnvBool("ML_ENABLED", true),
			ModelPath:  getEnv("ML_MODEL_PATH", "/opt/cryptobom/models"),
			Confidence: getEnvFloat("ML_CONFIDENCE", 0.85),
			ThreatAPI:  getEnv("ML_THREAT_API", "https://api.threatintel.cryptobom.io"),
		},
		Cloud: CloudConfig{
			AWS: AWSConfig{
				Enabled:   getEnvBool("AWS_ENABLED", false),
				AccessKey: getEnv("AWS_ACCESS_KEY", ""),
				SecretKey: getEnv("AWS_SECRET_KEY", ""),
				Region:    getEnv("AWS_REGION", "us-east-1"),
			},
			GCP: GCPConfig{
				Enabled:   getEnvBool("GCP_ENABLED", false),
				ProjectID: getEnv("GCP_PROJECT_ID", ""),
				KeyFile:   getEnv("GCP_KEY_FILE", ""),
			},
			Azure: AzureConfig{
				Enabled:      getEnvBool("AZURE_ENABLED", false),
				Subscription: getEnv("AZURE_SUBSCRIPTION", ""),
				TenantID:     getEnv("AZURE_TENANT_ID", ""),
				ClientID:     getEnv("AZURE_CLIENT_ID", ""),
				ClientSecret: getEnv("AZURE_CLIENT_SECRET", ""),
			},
		},
		SSO: SSOConfig{
			SAML: SAMLConfig{
				Enabled:     getEnvBool("SAML_ENABLED", false),
				IDPURL:      getEnv("SAML_IDP_URL", ""),
				Certificate: getEnv("SAML_CERT", ""),
			},
			LDAP: LDAPConfig{
				Enabled:  getEnvBool("LDAP_ENABLED", false),
				URL:      getEnv("LDAP_URL", "ldap://localhost:389"),
				BindDN:   getEnv("LDAP_BIND_DN", "cn=admin,dc=example,dc=com"),
				BindPass: getEnv("LDAP_BIND_PASS", ""),
				BaseDN:   getEnv("LDAP_BASE_DN", "ou=users,dc=example,dc=com"),
			},
			OAuth: OAuthConfig{
				Enabled:   getEnvBool("OAUTH_ENABLED", false),
				Provider:  getEnv("OAUTH_PROVIDER", "google"),
				ClientID:  getEnv("OAUTH_CLIENT_ID", ""),
				SecretKey: getEnv("OAUTH_SECRET", ""),
			},
		},
		Analytics: AnalyticsConfig{
			Enabled:     getEnvBool("ANALYTICS_ENABLED", true),
			MLModelPath: getEnv("ANALYTICS_ML_PATH", "/opt/cryptobom/analytics"),
			ForecastAPI: getEnv("ANALYTICS_FORECAST_API", "https://api.forecast.cryptobom.io"),
		},
		Enterprise: EnterpriseConfigFeatures{
			AdvancedThreatDetection: true,
			MultiCloudSupport:       true,
			EnterpriseSSO:           true,
			AdvancedAnalytics:       true,
			PremiumSupport:          true,
		},
	}

	return config, nil
}

// Helper functions for environment variable parsing
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return strings.ToLower(value) == "true"
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := fmt.Sscanf(value, "%d", new(int)); err == nil && intValue == 1 {
			var result int
			fmt.Sscanf(value, "%d", &result)
			return result
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		var result float64
		if n, err := fmt.Sscanf(value, "%f", &result); err == nil && n == 1 {
			return result
		}
	}
	return defaultValue
}

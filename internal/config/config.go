package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	ServiceName string `mapstructure:"service_name"`
	Version     string `mapstructure:"version"`
	Debug       bool   `mapstructure:"debug"`
	Port        int    `mapstructure:"port"`

	Database DatabaseConfig `mapstructure:"database"`

	// IBM Quantum Configuration
	IBMQuantum IBMQuantumConfig `mapstructure:"ibm_quantum"`

	// CNCF Configuration
	Kubernetes KubernetesConfig `mapstructure:"kubernetes"`

	// Security Configuration
	Security SecurityConfig `mapstructure:"security"`

	// Observability
	Observability ObservabilityConfig `mapstructure:"observability"`

	// Headlamp Configuration
	Headlamp HeadlampConfig `mapstructure:"headlamp"`

	// IBM Cloud Configuration
	IBMCloud IBMCloudConfig `mapstructure:"ibm_cloud"`

	// AWS Configuration
	AWS AWSConfig `mapstructure:"aws"`

	// Quantum Safety Configuration
	Quantum QuantumConfig `mapstructure:"quantum"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"sslmode"`
}

type IBMQuantumConfig struct {
	APIKey      string `mapstructure:"api_key"`
	Endpoint    string `mapstructure:"endpoint"`
	Network     string `mapstructure:"network"`
	Attestation bool   `mapstructure:"attestation"`
}

type KubernetesConfig struct {
	InCluster     bool   `mapstructure:"in_cluster"`
	Kubeconfig    string `mapstructure:"kubeconfig"`
	Namespace     string `mapstructure:"namespace"`
	OperatorImage string `mapstructure:"operator_image"`
	CiliumEnabled bool   `mapstructure:"cilium_enabled"`
}

type SecurityConfig struct {
	JWTSecret         string `mapstructure:"jwt_secret"`
	OAuthEnabled      bool   `mapstructure:"oauth_enabled"`
	OAuthProvider     string `mapstructure:"oauth_provider"`
	MutualTLS         bool   `mapstructure:"mutual_tls"`
	PolicyEnforcement bool   `mapstructure:"policy_enforcement"`
}

type ObservabilityConfig struct {
	TracingEnabled bool   `mapstructure:"tracing_enabled"`
	MetricsEnabled bool   `mapstructure:"metrics_enabled"`
	JaegerEndpoint string `mapstructure:"jaeger_endpoint"`
	PrometheusURL  string `mapstructure:"prometheus_url"`
}

type HeadlampConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	URL       string `mapstructure:"url"`
	Namespace string `mapstructure:"namespace"`
	Plugin    string `mapstructure:"plugin"`
}

type IBMCloudConfig struct {
	APIKey        string `mapstructure:"api_key"`
	Region        string `mapstructure:"region"`
	ResourceGroup string `mapstructure:"resource_group"`
	HPCSEnabled   bool   `mapstructure:"hpcs_enabled"`
	HPCSInstance  string `mapstructure:"hpcs_instance"`
}

type QuantumConfig struct {
	Enabled         bool   `mapstructure:"enabled"`
	NISTStandard    string `mapstructure:"nist_standard"`
	AttestationMode string `mapstructure:"attestation_mode"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("/etc/cryptobom-saas/")
	viper.AddConfigPath("$HOME/.cryptobom-saas")

	// Set defaults
	viper.SetDefault("service_name", "cryptobom-saas")
	viper.SetDefault("version", "1.0.0")
	viper.SetDefault("debug", false)
	viper.SetDefault("port", 8080)

	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "cryptobom")
	viper.SetDefault("database.name", "cryptobom_saas")
	viper.SetDefault("database.sslmode", "require")

	viper.SetDefault("kubernetes.in_cluster", false)
	viper.SetDefault("kubernetes.namespace", "cryptobom-system")
	viper.SetDefault("kubernetes.operator_image", "rivic-q/cryptobom-operator:latest")
	viper.SetDefault("kubernetes.ebpf_enabled", true)
	viper.SetDefault("kubernetes.cilium_enabled", true)

	viper.SetDefault("headlamp.enabled", true)
	viper.SetDefault("headlamp.namespace", "headlamp-system")
	viper.SetDefault("headlamp.plugin", "cryptobom-headlamp-plugin")

	// Environment variables override
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	return &config, nil
}

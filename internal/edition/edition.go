package edition

import (
	"os"
	"strings"
)

// Edition represents the software edition.
type Edition string

const (
	// OSS is the open-source edition.
	OSS Edition = "oss"
	// Enterprise is the enterprise edition.
	Enterprise Edition = "enterprise"
)

// Features holds feature flags for the current edition.
type Features struct {
	IBMCloudIntegration  bool
	AWSHSMIntegration    bool
	QuantumAttestation   bool
	MultiCloudInventory  bool
	ComplianceReporting  bool
	SSOSAMIL             bool
	AuditLog             bool
	APIRateLimit         int // -1 = unlimited
}

// Config holds the edition configuration.
type Config struct {
	Edition  Edition
	Features Features
}

// Detect returns the current edition based on environment/license.
func Detect() *Config {
	licenseKey := os.Getenv("CRYPTOBOM_LICENSE_KEY")
	if isEnterpriseKey(licenseKey) {
		return enterpriseConfig()
	}
	return ossConfig()
}

func isEnterpriseKey(key string) bool {
	return strings.HasPrefix(key, "ENT-") && len(key) >= 20
}

func ossConfig() *Config {
	return &Config{
		Edition: OSS,
		Features: Features{
			IBMCloudIntegration: false,
			AWSHSMIntegration:   false,
			QuantumAttestation:  false,
			MultiCloudInventory: false,
			ComplianceReporting: false,
			SSOSAMIL:            false,
			AuditLog:            false,
			APIRateLimit:        100,
		},
	}
}

func enterpriseConfig() *Config {
	return &Config{
		Edition: Enterprise,
		Features: Features{
			IBMCloudIntegration: true,
			AWSHSMIntegration:   true,
			QuantumAttestation:  true,
			MultiCloudInventory: true,
			ComplianceReporting: true,
			SSOSAMIL:            true,
			AuditLog:            true,
			APIRateLimit:        -1,
		},
	}
}

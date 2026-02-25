// Package edition provides edition detection and feature-flag gating for CryptoBOM SaaS.
package edition

import (
	"os"
	"strings"
)

// Edition represents the software edition.
type Edition string

const (
	EditionOSS        Edition = "oss"
	EditionEnterprise Edition = "enterprise"
)

// Features defines which capabilities are enabled for a given edition.
type Features struct {
	IBMCloudIntegration bool
	AWSHSMIntegration   bool
	QuantumAttestation  bool
	MultiCloudInventory bool
	ComplianceReporting bool
	SSOSAML             bool
	AuditLog            bool
	APIRateLimit        int // -1 = unlimited
}

var ossFeatures = Features{
	IBMCloudIntegration: false,
	AWSHSMIntegration:   false,
	QuantumAttestation:  false,
	MultiCloudInventory: false,
	ComplianceReporting: false,
	SSOSAML:             false,
	AuditLog:            false,
	APIRateLimit:        100,
}

var enterpriseFeatures = Features{
	IBMCloudIntegration: true,
	AWSHSMIntegration:   true,
	QuantumAttestation:  true,
	MultiCloudInventory: true,
	ComplianceReporting: true,
	SSOSAML:             true,
	AuditLog:            true,
	APIRateLimit:        -1,
}

// Detect returns the current edition based on the CRYPTOBOM_EDITION environment variable.
func Detect() Edition {
	if strings.ToLower(os.Getenv("CRYPTOBOM_EDITION")) == "enterprise" {
		return EditionEnterprise
	}
	return EditionOSS
}

// GetFeatures returns the feature set for the given edition.
func GetFeatures(e Edition) Features {
	if e == EditionEnterprise {
		return enterpriseFeatures
	}
	return ossFeatures
}

// IsEnterprise returns true when running as the enterprise edition.
func IsEnterprise() bool {
	return Detect() == EditionEnterprise
}

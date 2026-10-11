package authn

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config is the runtime configuration for the auth lifecycle. It is resolved
// from the environment by LoadConfig. There is deliberately no default signing
// secret: a missing secret is a hard error so the service can never sign or
// accept tokens with a value published in source control.
type Config struct {
	Secret              string
	Issuer              string
	Audience            string
	AccessTTL           time.Duration
	RefreshTTL          time.Duration
	ResetTTL            time.Duration
	VerifyTTL           time.Duration
	MFASessionTTL       time.Duration
	DemoMode            bool
	AllowRegistration   bool
	RequireVerification bool
	AllowedDomains      []string
	BootstrapEmail      string
	BootstrapPassword   string
	BootstrapName       string
	BootstrapRole       Role
	DefaultTenantID     string
}

const (
	defaultIssuer   = "rivicq"
	defaultAudience = "rivicq-api"
	minSecretBytes  = 32
	defaultTenantID = "tenant-1"
)

// LoadConfig reads configuration from the environment and validates it.
func LoadConfig() (Config, error) {
	cfg := Config{
		Secret:              firstNonEmpty("AUTH_JWT_SECRET", "JWT_SECRET"),
		Issuer:              firstNonEmpty("AUTH_JWT_ISSUER"),
		Audience:            firstNonEmpty("AUTH_JWT_AUDIENCE"),
		AccessTTL:           durationFromEnv("AUTH_ACCESS_TTL", 15*time.Minute),
		RefreshTTL:          durationFromEnv("AUTH_REFRESH_TTL", 7*24*time.Hour),
		ResetTTL:            durationFromEnv("AUTH_RESET_TTL", 30*time.Minute),
		VerifyTTL:           durationFromEnv("AUTH_VERIFY_TTL", 24*time.Hour),
		MFASessionTTL:       durationFromEnv("AUTH_MFA_SESSION_TTL", 10*time.Minute),
		DemoMode:            boolFromEnv("DEMO_MODE") || boolFromEnv("RIVICQ_ALLOW_DEMO_MODE"),
		AllowRegistration:   boolFromEnvDefault("AUTH_ALLOW_REGISTRATION", true),
		RequireVerification: boolFromEnv("AUTH_REQUIRE_VERIFICATION"),
		BootstrapEmail:      firstNonEmpty("AUTH_BOOTSTRAP_EMAIL", "CRYPTOBOM_BOOTSTRAP_EMAIL"),
		BootstrapPassword:   firstNonEmpty("AUTH_BOOTSTRAP_PASSWORD", "CRYPTOBOM_BOOTSTRAP_PASSWORD"),
		BootstrapName:       firstNonEmpty("AUTH_BOOTSTRAP_NAME"),
		BootstrapRole:       bootstrapRoleFromEnv(),
		DefaultTenantID:     firstNonEmpty("AUTH_DEFAULT_TENANT", defaultTenantID),
	}
	if cfg.Issuer == "" {
		cfg.Issuer = defaultIssuer
	}
	if cfg.Audience == "" {
		cfg.Audience = defaultAudience
	}
	if domains := strings.TrimSpace(os.Getenv("AUTH_ALLOWED_DOMAINS")); domains != "" {
		for _, d := range strings.Split(domains, ",") {
			if d = strings.TrimSpace(strings.ToLower(d)); d != "" {
				cfg.AllowedDomains = append(cfg.AllowedDomains, d)
			}
		}
	}
	if cfg.BootstrapEmail == "" {
		cfg.BootstrapEmail = "admin@rivicq.local"
	}
	if cfg.BootstrapName == "" {
		cfg.BootstrapName = "Administrator"
	}
	if len(cfg.Secret) < minSecretBytes {
		return Config{}, fmt.Errorf("auth: signing secret must be set and at least %d bytes (set AUTH_JWT_SECRET or JWT_SECRET)", minSecretBytes)
	}
	return cfg, nil
}

func firstNonEmpty(keys ...string) string {
	for _, k := range keys {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return ""
}

// bootstrapRoleFromEnv reads an explicit AUTH_BOOTSTRAP_ROLE. An empty result
// stays empty so SeedBootstrap can fall back to admin; normalizing here would
// silently downgrade the bootstrap account to viewer.
func bootstrapRoleFromEnv() Role {
	raw := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_ROLE"))
	if raw == "" {
		return ""
	}
	return normalizeRole(raw)
}

func durationFromEnv(key string, fallback time.Duration) time.Duration {
	if raw := strings.TrimSpace(os.Getenv(key)); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil && d > 0 {
			return d
		}
	}
	return fallback
}

func boolFromEnv(key string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}

func boolFromEnvDefault(key string, fallback bool) bool {
	raw := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	switch raw {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	}
	return fallback
}

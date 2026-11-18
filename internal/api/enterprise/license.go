package enterprise

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// License represents a validated enterprise beta license.
// Format (dependency-free, HMAC-signed):
//   cryptobom-beta-v1.<tenantID-or-*|customer>.<unix-expiry>.<hex-hmac-sha256>
// Signature is HMAC-SHA256 over "<tenantID-or-*|customer>.<unix-expiry>" using
// CRYPTOBOM_LICENSE_SIGNING_KEY. A valid signed, unexpired license is required
// for enterprise startup (fail-closed).
type License struct {
	Tenant    string
	ExpiresAt time.Time
	Raw       string
}

// LicenseConfigured reports whether a license key has been provided.
func LicenseConfigured() bool {
	return strings.TrimSpace(os.Getenv("CRYPTOBOM_LICENSE_KEY")) != ""
}

// ConfiguredTenantBinding returns the tenant/customer binding expected for this
// deployment (optional but enforced when set).
func ConfiguredTenantBinding() string {
	for _, k := range []string{"CRYPTOBOM_LICENSE_TENANT_ID", "CRYPTOBOM_TENANT_ID", "CRYPTOBOM_CUSTOMER_ID"} {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return ""
}

// ValidateLicense validates a signed, expiring beta license token.
func ValidateLicense(token string, now time.Time) (*License, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("missing enterprise license")
	}
	const prefix = "cryptobom-beta-v1."
	if !strings.HasPrefix(token, prefix) {
		return nil, fmt.Errorf("invalid license format")
	}
	body := strings.TrimPrefix(token, prefix)
	parts := strings.Split(body, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid license format")
	}
	tenant, expStr, sigHex := parts[0], parts[1], parts[2]
	if tenant == "" || expStr == "" || sigHex == "" {
		return nil, fmt.Errorf("invalid license fields")
	}
	var expUnix int64
	if _, err := fmt.Sscanf(expStr, "%d", &expUnix); err != nil || expUnix <= 0 {
		return nil, fmt.Errorf("invalid license expiry")
	}
	expiresAt := time.Unix(expUnix, 0).UTC()
	if !expiresAt.After(now) {
		return nil, fmt.Errorf("license expired")
	}
	secret := strings.TrimSpace(os.Getenv("CRYPTOBOM_LICENSE_SIGNING_KEY"))
	if secret == "" {
		return nil, fmt.Errorf("license signing key not configured")
	}
	msg := tenant + "." + expStr
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(msg))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(strings.ToLower(sigHex)), []byte(expected)) {
		return nil, fmt.Errorf("invalid license signature")
	}
	if bound := ConfiguredTenantBinding(); bound != "" && tenant != "*" && tenant != bound {
		return nil, fmt.Errorf("license not valid for tenant/customer binding")
	}
	return &License{Tenant: tenant, ExpiresAt: expiresAt, Raw: token}, nil
}

// LoadAndValidateLicense loads and validates the configured enterprise license.
func LoadAndValidateLicense() (*License, error) {
	return ValidateLicense(os.Getenv("CRYPTOBOM_LICENSE_KEY"), time.Now().UTC())
}

// RequireValidLicense fails closed if no valid license is configured.
func RequireValidLicense() (*License, error) {
	lic, err := LoadAndValidateLicense()
	if err != nil {
		return nil, err
	}
	return lic, nil
}

// MustValidLicense validates the license or fatally exits (fail-closed startup).
func MustValidLicense(log *logrus.Logger) *License {
	lic, err := RequireValidLicense()
	if err != nil {
		if log == nil {
			log = logrus.New()
		}
		log.WithError(err).Fatal("Enterprise license validation failed (fail-closed): valid signed, unexpired CRYPTOBOM_LICENSE_KEY and CRYPTOBOM_LICENSE_SIGNING_KEY required")
	}
	return lic
}

// LicenseMiddleware rejects requests when no valid license is present.
func LicenseMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, err := RequireValidLicense(); err != nil {
			c.AbortWithStatusJSON(503, gin.H{
				"error":  "enterprise license invalid or unavailable",
				"code":   "ENTERPRISE_LICENSE_REQUIRED",
				"detail": "A valid signed, unexpired enterprise beta license is required",
			})
			return
		}
		c.Next()
	}
}

// LicenseStatus returns non-sensitive license state for observability/capability.
func LicenseStatus() gin.H {
	lic, err := LoadAndValidateLicense()
	if err != nil {
		return gin.H{"configured": LicenseConfigured(), "valid": false}
	}
	return gin.H{
		"configured": true,
		"valid":      true,
		"tenant":     lic.Tenant,
		"expires_at": lic.ExpiresAt.Format(time.RFC3339),
	}
}

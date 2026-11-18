//go:build enterprise

package enterprise

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	// Enterprise runtime is fail-closed: provide valid license/signing material for
	// server/bootstrap paths exercised by tagged tests.
	tenant := "*"
	exp := time.Now().UTC().Add(24 * time.Hour).Unix()
	secret := "test-enterprise-license-secret"
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(fmt.Sprintf("%s.%d", tenant, exp)))
	lic := fmt.Sprintf("cryptobom-beta-v1.%s.%d.%s", tenant, exp, hex.EncodeToString(mac.Sum(nil)))

	_ = os.Setenv("CRYPTOBOM_LICENSE_KEY", lic)
	_ = os.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", secret)
	_ = os.Unsetenv("CRYPTOBOM_LICENSE_TENANT_ID")
	_ = os.Unsetenv("CRYPTOBOM_TENANT_ID")
	_ = os.Unsetenv("CRYPTOBOM_CUSTOMER_ID")
	_ = os.Setenv("RIVICQ_ALLOW_DEMO_MODE", "true")
	_ = os.Setenv("AUTH_BOOTSTRAP_PASSWORD", "Enterprise-Test-Passphrase-42!")
	_ = os.Setenv("JWT_SECRET", "test-jwt-secret-for-enterprise-testing-1234567890")

	code := m.Run()
	os.Exit(code)
}

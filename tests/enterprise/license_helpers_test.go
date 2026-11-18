//go:build enterprise

package enterprise

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
	"time"
)

func setValidEnterpriseLicenseEnv(t *testing.T) {
	t.Helper()
	tenant := "*"
	exp := time.Now().UTC().Add(24 * time.Hour).Unix()
	secret := "test-enterprise-license-secret"
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(fmt.Sprintf("%s.%d", tenant, exp)))
	lic := fmt.Sprintf("cryptobom-beta-v1.%s.%d.%s", tenant, exp, hex.EncodeToString(mac.Sum(nil)))
	t.Setenv("CRYPTOBOM_LICENSE_KEY", lic)
	t.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", secret)
	t.Setenv("CRYPTOBOM_LICENSE_TENANT_ID", "")
	t.Setenv("CRYPTOBOM_TENANT_ID", "")
	t.Setenv("CRYPTOBOM_CUSTOMER_ID", "")
}

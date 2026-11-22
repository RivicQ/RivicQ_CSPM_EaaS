package edition

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
	"time"
)

func setEnterpriseLicenseEnv(t *testing.T) {
	t.Helper()
	tenant := "00000000-0000-0000-0000-000000000001"
	exp := time.Now().UTC().Add(24 * time.Hour).Unix()
	secret := "test-secret"
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = fmt.Fprintf(mac, "%s.%d", tenant, exp)
	lic := fmt.Sprintf("cryptobom-beta-v1.%s.%d.%s", tenant, exp, hex.EncodeToString(mac.Sum(nil)))
	t.Setenv("CRYPTOBOM_LICENSE_KEY", lic)
	t.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", secret)
	t.Setenv("CRYPTOBOM_LICENSE_TENANT_ID", tenant)
}

func TestOSSLimitsControlPlane(t *testing.T) {
	t.Setenv("CRYPTOBOM_EDITION", "oss")
	t.Setenv("CRYPTOBOM_LICENSE_KEY", "")
	t.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", "")
	cfg := Detect()
	if cfg.Edition != OSS {
		t.Fatalf("edition=%s", cfg.Edition)
	}
	f := cfg.Features
	if !f.WebsiteScan || !f.HostIPScan || !f.PodInventory || !f.QiskitProfile {
		t.Fatalf("OSS engine flags: %+v", f)
	}
	if f.DORAPack || f.MultiCloudInventory || f.SSOSAMIL || f.AuditLog || f.LiveKubernetesAttach || f.AIBOM || f.IBOM || f.QBOM || f.HBOM {
		t.Fatalf("OSS must not enable control-plane flags: %+v", f)
	}
	if !f.ApiSecurity || !f.DevSecOpsPipeline {
		t.Fatal("OSS API security + pipeline view required")
	}
}

func TestEnterpriseDetectRequiresLicense(t *testing.T) {
	t.Setenv("CRYPTOBOM_EDITION", "enterprise")
	t.Setenv("CRYPTOBOM_LICENSE_KEY", "")
	t.Setenv("CRYPTOBOM_LICENSE_SIGNING_KEY", "")
	if ed := Detect().Edition; ed != OSS {
		t.Fatalf("expected OSS when enterprise license missing, got %s", ed)
	}
}

func TestEnterpriseEnablesConfiguredControlPlane(t *testing.T) {
	setEnterpriseLicenseEnv(t)
	// Configure actual backing integrations/credentials; enterpriseConfig is capability-accurate.
	t.Setenv("CRYPTOBOM_COMPLIANCE_ENABLED", "true")
	t.Setenv("AWS_CLOUDHSM_CLUSTER_ID", "cluster-1")
	t.Setenv("CRYPTOBOM_CLOUD_INVENTORY_ENABLED", "true")
	t.Setenv("AWS_ACCESS_KEY_ID", "x")
	t.Setenv("IBMQ_API_KEY", "x")
	t.Setenv("CRYPTOBOM_AIBOM_ENABLED", "true")
	t.Setenv("CRYPTOBOM_IBOM_ENABLED", "true")

	cfg := Detect()
	if cfg.Edition != Enterprise {
		t.Fatalf("edition=%s", cfg.Edition)
	}
	f := cfg.Features
	if !f.DORAPack || !f.HardwareInventory || !f.CloudConnectors || !f.QuantumConnector || !f.AIBOM || !f.HSMConnector || !f.QBOM || !f.HBOM || !f.IBOM {
		t.Fatalf("enterprise flags: %+v", f)
	}
}

func TestPublicCatalog(t *testing.T) {
	t.Setenv("CRYPTOBOM_EDITION", "oss")
	t.Setenv("CRYPTOBOM_LICENSE_KEY", "")
	pub := Detect().Public()
	targets, ok := pub["scan_targets"].(map[string]any)
	if !ok || targets["website"] == nil || targets["pod"] == nil {
		t.Fatalf("scan_targets %+v", pub["scan_targets"])
	}
	layers, ok := pub["bom_layers"].(map[string]any)
	if !ok || layers["cbom"] != true || layers["aibom"] != false || layers["qbom"] != false || layers["hbom"] != false {
		t.Fatalf("bom_layers %+v", pub["bom_layers"])
	}
}

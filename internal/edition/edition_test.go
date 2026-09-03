package edition

import "testing"

func TestOSSLimitsControlPlane(t *testing.T) {
	cfg := ossConfig()
	if cfg.Edition != OSS {
		t.Fatalf("edition=%s", cfg.Edition)
	}
	f := cfg.Features
	if !f.WebsiteScan || !f.HostIPScan || !f.PodInventory || !f.QiskitProfile {
		t.Fatalf("OSS engine flags: %+v", f)
	}
	if f.DORAPack || f.MultiCloudInventory || f.SSOSAMIL || f.AuditLog || f.LiveKubernetesAttach || f.AIBOM || f.IBOM {
		t.Fatalf("OSS must not enable control-plane flags: %+v", f)
	}
	if !f.ApiSecurity || !f.DevSecOpsPipeline {
		t.Fatal("OSS API security + pipeline view required")
	}
}

func TestEnterpriseEnablesControlPlane(t *testing.T) {
	cfg := enterpriseConfig()
	if cfg.Edition != Enterprise {
		t.Fatalf("edition=%s", cfg.Edition)
	}
	f := cfg.Features
	if !f.DORAPack || !f.HardwareInventory || !f.CloudConnectors || !f.QuantumConnector || !f.AIBOM || !f.HSMConnector {
		t.Fatalf("enterprise flags: %+v", f)
	}
}

func TestPublicCatalog(t *testing.T) {
	pub := ossConfig().Public()
	targets, ok := pub["scan_targets"].(map[string]any)
	if !ok || targets["website"] == nil || targets["pod"] == nil {
		t.Fatalf("scan_targets %+v", pub["scan_targets"])
	}
	layers, ok := pub["bom_layers"].(map[string]any)
	if !ok || layers["cbom"] != true || layers["aibom"] != false {
		t.Fatalf("bom_layers %+v", pub["bom_layers"])
	}
}

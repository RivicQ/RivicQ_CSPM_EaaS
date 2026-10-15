package intelligence

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

func TestCycloneDXBOMFromFindings(t *testing.T) {
	findings := []Finding{
		{Algorithm: "MD5", Location: "a.go", RuleID: "crypto.weak-hash.md5", Risk: RiskBreakdown{Level: "HIGH"}},
		{Algorithm: "ECDH", Location: "b.go", KeyLength: 256, PQCClass: "migration_required", Risk: RiskBreakdown{Level: "HIGH"}},
		{Algorithm: "MD5", Location: "a.go"}, // duplicate asset must be dropped
		{Title: "secret.generic-assignment"}, // no algorithm -> not a crypto asset
	}
	doc := CycloneDXBOM("demo", nil, findings)

	if errs := ValidateCycloneDX(doc); len(errs) > 0 {
		t.Fatalf("schema: %v", errs)
	}
	list, _ := doc["components"].([]map[string]any)
	if len(list) != 2 {
		t.Fatalf("expected 2 crypto components (MD5, ECDH), got %d: %+v", len(list), list)
	}
	names := map[string]bool{}
	for _, c := range list {
		name, _ := c["name"].(string)
		names[name] = true
		if c["type"] != "cryptographic-asset" {
			t.Fatalf("unexpected type: %+v", c)
		}
		if c["bom-ref"] == "" {
			t.Fatalf("missing bom-ref: %+v", c)
		}
	}
	if !names["MD5"] || !names["ECDH"] {
		t.Fatalf("unexpected names: %+v", names)
	}
}

func TestCycloneDXDeterministicSerial(t *testing.T) {
	findings := []Finding{
		{Algorithm: "RSA", Location: "k.go", KeyLength: 2048},
		{Algorithm: "AES", Location: "k.go", PresenceKind: PresenceInventory},
	}
	a := CycloneDXBOM("demo", nil, findings)
	b := CycloneDXBOM("demo", nil, findings)
	if a["serialNumber"] != b["serialNumber"] {
		t.Fatalf("serialNumber not deterministic: %v vs %v", a["serialNumber"], b["serialNumber"])
	}
	la, _ := a["components"].([]map[string]any)
	lb, _ := b["components"].([]map[string]any)
	if la[0]["bom-ref"] != lb[0]["bom-ref"] {
		t.Fatalf("bom-ref not deterministic: %v vs %v", la[0]["bom-ref"], lb[0]["bom-ref"])
	}
}

func TestCycloneDXIncludesDiscoveryComponents(t *testing.T) {
	comps := []discovery.CBOMComponent{{
		Algorithm: "RSA", KeySize: 2048, Library: "crypto/rsa", Location: "tls",
	}}
	doc := CycloneDXBOM("demo", comps, nil)
	if errs := ValidateCycloneDX(doc); len(errs) > 0 {
		t.Fatalf("schema: %v", errs)
	}
	list, _ := doc["components"].([]map[string]any)
	if len(list) != 1 || list[0]["name"] != "RSA" {
		t.Fatalf("components %+v", list)
	}
}

func TestValidateCycloneDXRejectsEmpty(t *testing.T) {
	errs := ValidateCycloneDX(nil)
	if len(errs) == 0 {
		t.Fatal("expected errors for nil document")
	}
}

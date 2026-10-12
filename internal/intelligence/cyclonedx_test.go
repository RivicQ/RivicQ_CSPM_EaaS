package intelligence

import "testing"

func TestCycloneDXBOMFromFindings(t *testing.T) {
	findings := []Finding{
		{Algorithm: "MD5", Location: "a.go", RuleID: "crypto.weak-hash.md5", Risk: RiskBreakdown{Level: "HIGH"}},
		{Algorithm: "ECDH", Location: "b.go", KeyLength: 256, PQCClass: "migration_required", Risk: RiskBreakdown{Level: "HIGH"}},
		{Algorithm: "MD5", Location: "a.go"}, // duplicate asset must be dropped
		{Title: "secret.generic-assignment"}, // no algorithm -> not a crypto asset
	}
	doc := CycloneDXBOM("demo", nil, findings)

	list, _ := doc["components"].([]map[string]any)
	if len(list) != 2 {
		t.Fatalf("expected 2 crypto components (MD5, ECDH), got %d: %+v", len(list), list)
	}
	if list[0]["name"] != "MD5" || list[0]["type"] != "cryptographic-asset" {
		t.Fatalf("unexpected component[0]: %+v", list[0])
	}
	if list[1]["name"] != "ECDH" {
		t.Fatalf("unexpected component[1]: %+v", list[1])
	}
}

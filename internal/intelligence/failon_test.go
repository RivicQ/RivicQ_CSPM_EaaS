package intelligence

import "testing"

func TestParseFailOnRejectsUnknown(t *testing.T) {
	if _, err := ParseFailOn("BOGUS"); err == nil {
		t.Fatal("expected usage error for --fail-on BOGUS")
	}
	if _, err := ParseFailOn("block-on-critical"); err == nil {
		t.Fatal("expected usage error for typo")
	}
	got, err := ParseFailOn("BLOCK")
	if err != nil || got != "block" {
		t.Fatalf("BLOCK: got %q %v", got, err)
	}
	got, err = ParseFailOn("critical")
	if err != nil || got != "critical" {
		t.Fatalf("critical: got %q %v", got, err)
	}
}

func TestParseFormatRejectsUnknown(t *testing.T) {
	if _, err := ParseFormat("yaml"); err == nil {
		t.Fatal("expected usage error for --format yaml")
	}
	got, err := ParseFormat("JSON")
	if err != nil || got != "json" {
		t.Fatalf("JSON: got %q %v", got, err)
	}
}

func TestShouldFailOnUnknownDoesNotTrip(t *testing.T) {
	rep := &Report{Gate: GateResult{Failed: true, Decision: "BLOCK"}}
	if ShouldFailOn("BOGUS", rep) {
		t.Fatal("unknown --fail-on must not fail the gate; ParseFailOn is the usage path")
	}
}

func TestShouldFailOnBlockAndNone(t *testing.T) {
	blocked := &Report{Gate: GateResult{Failed: true, Decision: "BLOCK"}}
	ok := &Report{Gate: GateResult{Failed: false, Decision: "ALLOW"}}
	if !ShouldFailOn("BLOCK", blocked) {
		t.Fatal("BLOCK threshold should fail a blocked report")
	}
	if ShouldFailOn("NONE", blocked) {
		t.Fatal("NONE must never fail")
	}
	if ShouldFailOn("BLOCK", ok) {
		t.Fatal("ALLOW report must not fail BLOCK")
	}
}

func TestShouldFailOnIgnoresInventorySeverity(t *testing.T) {
	rep := &Report{
		Gate: GateResult{Failed: false, Decision: "ALLOW"},
		Findings: []Finding{
			{Severity: "HIGH", PresenceKind: PresenceInventory, Algorithm: "AES"},
		},
	}
	if ShouldFailOn("high", rep) {
		t.Fatal("inventory observations must not trip severity gates")
	}
}

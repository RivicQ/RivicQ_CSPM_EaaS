package intelligence

import "testing"

func TestInferPresenceAndExploitability(t *testing.T) {
	if InferPresenceKind("crypto.import.rsa", "github-content", "CRYPTO_IMPORT") != PresenceLibrary {
		t.Fatal("import rules are library presence")
	}
	if InferPresenceKind("crypto.inventory.aes", "github-content", "CRYPTO_INVENTORY") != PresenceInventory {
		t.Fatal("inventory rules stay inventory")
	}
	if InferExploitability(ClassPQCLegacy, false) != ExploitabilityCurrent {
		t.Fatal("legacy is currently exploitable")
	}
	if InferExploitability(ClassPQCMigrationRequired, false) != ExploitabilityQuantum {
		t.Fatal("migration_required is quantum exposure, not current break")
	}
	if InferExploitability(ClassPQCReady, true) != ExploitabilityNone {
		t.Fatal("pqc_ready is not a current or quantum finding")
	}
}

func TestFinalizeFindingStampsEvidence(t *testing.T) {
	f := FinalizeFinding(Finding{
		Scanner:   "github-content",
		RuleID:    "crypto.import.rsa",
		Algorithm: "RSA",
		KeyLength: 2048,
		Location:  "main.go",
		Evidence:  "crypto/rsa",
	})
	if f.PresenceKind != PresenceLibrary {
		t.Fatalf("presence=%s", f.PresenceKind)
	}
	if f.DetectionMethod != MethodRegexSAST {
		t.Fatalf("method=%s", f.DetectionMethod)
	}
	if f.PQCClass != ClassPQCMigrationRequired {
		t.Fatalf("pqc class=%s want migration_required", f.PQCClass)
	}
	if f.Exploitability != ExploitabilityQuantum {
		t.Fatalf("exploitability=%s", f.Exploitability)
	}
	if f.RiskRationale == "" || f.Limitations == "" {
		t.Fatalf("missing rationale/limitations: %+v", f)
	}
	if f.ID == "" || f.Fingerprint == "" {
		t.Fatal("expected stable id and fingerprint")
	}
}

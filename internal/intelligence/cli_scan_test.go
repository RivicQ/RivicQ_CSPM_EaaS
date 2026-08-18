package intelligence_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/intelligence"
)

func TestCryptoFixtureProducesCBOMAndPolicyBlock(t *testing.T) {
	root := filepath.Join("..", "..", "fixtures", "crypto-test")
	b, err := os.ReadFile(filepath.Join(root, "weak.go"))
	if err != nil {
		t.Fatal(err)
	}
	res := shared.AnalyzeRepositoryFiles("fixture://crypto-test", []shared.RepoFile{{
		Path: "weak.go", Content: string(b),
	}}, false)
	if len(res.CBOM) == 0 {
		t.Fatal("expected CBOM components from crypto fixture")
	}
	cfs := make([]intelligence.ContentFinding, 0, len(res.CryptoFindings))
	for _, f := range res.CryptoFindings {
		cfs = append(cfs, shared.ToContentFinding(f))
	}
	rep := intelligence.BuildReport(intelligence.ScanInput{
		Target:          "fixture://crypto-test",
		ContentFindings: cfs,
		ContentRepo:     "fixture://crypto-test",
	})
	if !rep.Gate.Failed {
		t.Fatalf("crypto fixture should fail policy, findings=%d reasons=%v", len(rep.Findings), rep.Gate.Reasons)
	}
	foundRSA1024 := false
	for _, f := range res.CryptoFindings {
		if f.Algorithm == "RSA" && f.KeyLength == 1024 {
			foundRSA1024 = true
		}
	}
	if !foundRSA1024 {
		t.Fatalf("expected RSA-1024 key length on finding, got %+v", res.CryptoFindings)
	}
}

func TestTerraformFixtureProducesIaCFinding(t *testing.T) {
	root := filepath.Join("..", "..", "fixtures", "terraform-test")
	b, err := os.ReadFile(filepath.Join(root, "main.tf"))
	if err != nil {
		t.Fatal(err)
	}
	res := shared.AnalyzeRepositoryFiles("fixture://terraform-test", []shared.RepoFile{{
		Path: "main.tf", Content: string(b),
	}}, false)
	found := false
	for _, f := range res.CryptoFindings {
		if f.FindingType == "IAC" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected IaC finding, got %+v", res.CryptoFindings)
	}
}

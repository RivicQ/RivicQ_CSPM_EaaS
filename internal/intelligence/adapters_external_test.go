package intelligence

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRunOptionalToolsSkipsMissingBinaries(t *testing.T) {
	t.Setenv("RIVICQ_EXTERNAL_TOOLS", "1")
	dir := t.TempDir()
	findings, used := RunOptionalTools(dir)
	if findings == nil {
		findings = []Finding{}
	}
	_ = findings
	for _, name := range used {
		if name == "" {
			t.Fatal("empty tool name")
		}
	}
}

func TestRunOptionalToolsDisabled(t *testing.T) {
	t.Setenv("RIVICQ_EXTERNAL_TOOLS", "0")
	findings, used := RunOptionalTools(t.TempDir())
	if len(findings) != 0 || len(used) != 0 {
		t.Fatalf("disabled tools should be a no-op, got %d findings %v", len(findings), used)
	}
}

func TestRunOptionalToolsIgnoresFile(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "note.txt")
	if err := os.WriteFile(p, []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	findings, used := RunOptionalTools(p)
	if len(findings) != 0 || len(used) != 0 {
		t.Fatalf("file target should skip, got %d %v", len(findings), used)
	}
}

func TestMarkToolsUsed(t *testing.T) {
	tools := []ToolStatus{{Name: "syft", Available: true}, {Name: "trivy", Available: false}}
	got := MarkToolsUsed(tools, []string{"syft"})
	if !got[0].Used || got[1].Used {
		t.Fatalf("used flags %#v", got)
	}
}

func TestCryptoComponent(t *testing.T) {
	if !cryptoComponent("pkg:generic/openssl@3") {
		t.Fatal("openssl should match")
	}
	if cryptoComponent("left-pad") {
		t.Fatal("left-pad should not match")
	}
}

func TestAppendExternalSkipsFixtures(t *testing.T) {
	out := appendExternal(nil, Finding{ID: "x", Location: "/repo/testdata/fake.key"})
	if len(out) != 0 {
		t.Fatalf("testdata should be skipped, got %#v", out)
	}
	out = appendExternal(nil, Finding{ID: "y", Location: "/repo/cmd/rivicq/main.go"})
	if len(out) != 1 {
		t.Fatalf("source file should be kept, got %#v", out)
	}
}

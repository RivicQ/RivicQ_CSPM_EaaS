package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/intelligence"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	cmd := os.Args[1]
	args := os.Args[2:]
	switch cmd {
	case "scan", "sbom", "cbom", "vuln", "secrets", "iac", "compliance", "policy":
		if err := runScan(cmd, args); err != nil {
			fmt.Fprintf(os.Stderr, "rivicq: %v\n", err)
			os.Exit(1)
		}
	case "version", "-version", "--version":
		fmt.Println("rivicq 0.1.0")
	case "help", "-h", "--help":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", cmd)
		usage()
		os.Exit(2)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, `RivicQ security intelligence CLI

Usage:
  rivicq scan <path> [flags]
  rivicq sbom|cbom|vuln|secrets|iac|compliance|policy <path>

Flags:
  --format table|json     output format (default table)
  --fail-on BLOCK|WARN|NONE  policy gate (default BLOCK; NONE never fails)
  --include-fixtures         include fixtures/testdata (dataset analysis)
  --json                     shortcut for --format json

Examples:
  rivicq scan .
  rivicq cbom ./src --format json
  rivicq scan fixtures/crypto-test --include-fixtures --fail-on NONE --format json
`)
}

func runScan(mode string, args []string) error {
	fs := flag.NewFlagSet("rivicq "+mode, flag.ContinueOnError)
	format := fs.String("format", "table", "table|json")
	failOn := fs.String("fail-on", "BLOCK", "BLOCK|WARN|NONE")
	asJSON := fs.Bool("json", false, "json output")
	includeFixtures := fs.Bool("include-fixtures", false, "scan fixtures/ and testdata/ (dataset analysis only)")
	flagArgs, positional := splitCLIArgs(args)
	if err := fs.Parse(flagArgs); err != nil {
		return err
	}
	root := "."
	if len(positional) > 0 {
		root = positional[0]
	} else if rest := fs.Args(); len(rest) > 0 {
		root = rest[0]
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	if *asJSON {
		*format = "json"
	}

	files, err := walkRepo(abs, *includeFixtures)
	if err != nil {
		return err
	}
	content := shared.AnalyzeRepositoryFiles("local:"+abs, files, false)
	contentFindings := make([]intelligence.ContentFinding, 0, len(content.CryptoFindings))
	for _, f := range content.CryptoFindings {
		contentFindings = append(contentFindings, shared.ToContentFinding(f))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	disc, err := intelligence.ScanLocalSBOM(ctx, abs)
	if err != nil {
		disc = nil
	}

	rep := intelligence.BuildReport(intelligence.ScanInput{
		Target:          abs,
		Discovery:       disc,
		ContentFindings: contentFindings,
		ContentRepo:     abs,
	})
	rep.Asset = abs
	if rep.Metadata == nil {
		rep.Metadata = map[string]string{}
	}
	rep.Metadata["mode"] = mode
	rep.Metadata["edition"] = "community"

	switch *format {
	case "json":
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if err := enc.Encode(rep); err != nil {
			return err
		}
	default:
		printTable(mode, abs, content, rep)
	}

	failed := rep.Gate.Failed
	if strings.EqualFold(*failOn, "NONE") || *failOn == "" {
		failed = false
	} else if strings.EqualFold(*failOn, "WARN") && len(rep.Gate.Warnings) > 0 {
		failed = true
	}
	if failed {
		return fmt.Errorf("policy gate %s", rep.Gate.Decision)
	}
	return nil
}

func printTable(mode, abs string, content shared.GHScanResult, rep *intelligence.Report) {
	fmt.Println("Repository Scan")
	fmt.Printf("Target: %s\n", abs)
	fmt.Printf("Mode:   %s\n\n", mode)
	s := rep.Summary
	fmt.Printf("SAST          %s\n", s.SAST)
	fmt.Printf("Secrets       %s\n", s.Secrets)
	fmt.Printf("SCA           %s\n", s.SCA)
	fmt.Printf("SBOM          %s (%d components)\n", s.SBOM, len(content.SBOM))
	fmt.Printf("CBOM          %d crypto assets\n", len(content.CBOM)+s.Crypto)
	fmt.Printf("IaC           %s\n", s.IaC)
	fmt.Printf("Container     %s\n", s.Container)
	fmt.Printf("PQC readiness %d%%\n", content.PQCReadiness)
	fmt.Printf("Compliance    %s\n\n", s.Compliance)
	fmt.Printf("Policy Gate:  %s", rep.Gate.Decision)
	if rep.Gate.Failed {
		fmt.Printf(" (FAILED)\n")
	} else {
		fmt.Printf(" (PASSED)\n")
	}
	for _, r := range rep.Gate.Reasons {
		fmt.Printf("  - %s\n", r)
	}
	for _, w := range rep.Gate.Warnings {
		fmt.Printf("  ! %s\n", w)
	}
	fmt.Printf("\nExternal tools:\n")
	anyAvail := false
	for _, tool := range intelligence.ProbeExternalTools() {
		if tool.Available && !strings.HasPrefix(tool.Name, "rivicq-") {
			fmt.Printf("  %s (optional)\n", tool.Name)
			anyAvail = true
		}
	}
	if !anyAvail {
		fmt.Println("  (none on PATH — using built-in scanners)")
	}
}

func splitCLIArgs(args []string) (flags []string, positional []string) {
	takesVal := map[string]bool{
		"--format": true, "-format": true,
		"--fail-on": true, "-fail-on": true,
	}
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			positional = append(positional, args[i+1:]...)
			break
		}
		if strings.HasPrefix(a, "-") {
			flags = append(flags, a)
			name := a
			if eq := strings.Index(a, "="); eq >= 0 {
				continue
			}
			if takesVal[name] && i+1 < len(args) && !strings.HasPrefix(args[i+1], "-") {
				flags = append(flags, args[i+1])
				i++
			}
			continue
		}
		positional = append(positional, a)
	}
	return flags, positional
}

func walkRepo(root string, includeFixtures bool) ([]shared.RepoFile, error) {
	skipDir := map[string]bool{
		".git": true, "node_modules": true, "vendor": true,
		"dist": true, "coverage": true, "bin": true,
	}
	if !includeFixtures {
		skipDir["testdata"] = true
		skipDir["fixtures"] = true
		skipDir["datasets"] = true
	}
	var out []shared.RepoFile
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		rel = filepath.ToSlash(rel)
		if info.IsDir() {
			base := info.Name()
			if skipDir[base] || rel == "web/build" || (!includeFixtures && strings.Contains(rel, "/testdata/")) {
				return filepath.SkipDir
			}
			return nil
		}
		if info.Size() > 512*1024 {
			return nil
		}
		name := strings.ToLower(info.Name())
		if strings.HasSuffix(name, "_test.go") {
			return nil
		}
		// Scanner implementations speak weak crypto on purpose (probe clients / detectors).
		switch name {
		case "tls_scanner.go", "ssh_scanner.go", "http_scanner.go", "github_content_scan.go":
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		keep := map[string]bool{
			".go": true, ".js": true, ".ts": true, ".py": true, ".java": true, ".rs": true,
			".rb": true, ".php": true, ".tf": true, ".yml": true, ".yaml": true, ".json": true,
			".mod": true, ".sum": true, ".toml": true, ".lock": true, ".env": true,
			".pem": true, ".crt": true, ".conf": true, ".xml": true, ".gradle": true,
		}
		if name == "dockerfile" || name == "makefile" || name == "go.mod" || name == "package.json" || name == "requirements.txt" {
			keep[ext] = true
		}
		if !keep[ext] && name != "dockerfile" && name != "makefile" {
			return nil
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		out = append(out, shared.RepoFile{Path: rel, Content: string(b)})
		if len(out) >= 400 {
			return fmt.Errorf("file cap")
		}
		return nil
	})
	if err != nil && !strings.Contains(err.Error(), "file cap") {
		return out, err
	}
	return out, nil
}

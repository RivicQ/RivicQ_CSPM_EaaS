package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
	"github.com/rivic-q/cryptobom-saas/internal/identity"
	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

func identityUsage() {
	fmt.Fprint(os.Stderr, `RivicQ identity / connectivity artifact analysis (metadata only — no secrets)

Usage:
  rivicq identity scan <file-or-dir> [flags]
  rivicq identity cbom <file-or-dir> [flags]
  rivicq identity pqc  <file-or-dir> [flags]

Flags:
  --format json|table        output format (default table)
  --profile <id>             domain profile (default identity/generic)
  --device-lifetime <v>      <2y | 2-5y | 5-10y | 10y+ (default unknown)
  --fail-on BLOCK|WARN|NONE  CI gate (default BLOCK)
  --json                     shortcut for --format json

Examples:
  rivicq identity scan certificate.pem --profile identity/gd
  rivicq identity cbom ./certs/ --format json
`)
}

func runIdentity(args []string) error {
	if len(args) == 0 {
		identityUsage()
		return fmt.Errorf("identity: missing subcommand")
	}
	sub := args[0]
	rest := args[1:]
	switch sub {
	case "scan", "cbom", "pqc":
		return identityScan(sub, rest)
	case "help", "-h", "--help":
		identityUsage()
		return nil
	default:
		identityUsage()
		return fmt.Errorf("identity: unknown subcommand %q", sub)
	}
}

func identityScan(sub string, args []string) error {
	p := parseArgs(args, map[string]bool{"format": true, "profile": true, "device-lifetime": true, "fail-on": true})
	if p.bools["json"] {
		p.values["format"] = "json"
	}
	target := "."
	if len(p.positional) > 0 {
		target = p.positional[0]
	}
	prof := resolveProfile(p.value("profile", ""), profile.DomainIdentity)
	limits := identity.DefaultLimits()
	opts := identity.Options{DeviceLifetime: lifetimeFlag(p.value("device-lifetime", "unknown"))}

	ctx := context.Background()
	files, err := identityTargets(target, limits.MaxFileBytes)
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("identity: no files found at %s", target)
	}
	var reports []*identity.Report
	for _, f := range files {
		rep, aerr := identity.AnalyzeFile(ctx, f, prof, limits, opts)
		if aerr != nil {
			continue
		}
		reports = append(reports, rep)
	}
	if len(reports) == 0 {
		return fmt.Errorf("identity: no analyzable artifacts at %s", target)
	}

	format := p.value("format", "table")
	switch {
	case format == "json" && sub == "scan":
		if err := writeJSON(reports); err != nil {
			return err
		}
	case format == "json" && sub == "cbom":
		var bom []any
		for _, r := range reports {
			bom = append(bom, r.CBOM)
		}
		if err := writeJSON(bom); err != nil {
			return err
		}
	case format == "json" && sub == "pqc":
		var plans []any
		for _, r := range reports {
			plans = append(plans, r.PQC)
		}
		if err := writeJSON(plans); err != nil {
			return err
		}
	default:
		for _, r := range reports {
			printIdentity(sub, r)
		}
	}

	failOn := strings.ToUpper(p.value("fail-on", "BLOCK"))
	if identityGate(reports, failOn) {
		return failOnError{threshold: failOn, decision: "identity"}
	}
	return nil
}

func identityTargets(target string, maxBytes int64) ([]string, error) {
	info, err := os.Stat(target)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return []string{target}, nil
	}
	var out []string
	err = filepath.Walk(target, func(path string, fi os.FileInfo, werr error) error {
		if werr != nil {
			return nil
		}
		if fi.IsDir() {
			if fi.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		if fi.Size() > maxBytes {
			return nil
		}
		out = append(out, path)
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(out)
	return out, nil
}

func identityGate(reports []*identity.Report, failOn string) bool {
	if failOn == "NONE" || failOn == "" {
		return false
	}
	blocked, warned := false, false
	for _, r := range reports {
		for _, a := range r.Algorithms {
			switch a.PQCStatus {
			case "migration_required", "broken_classical":
				blocked = true
			case "migration_recommended":
				warned = true
			}
		}
		for _, c := range r.Certificates {
			if c.Risk.QuantumStatus == "quantum_vulnerable" {
				blocked = true
			}
		}
	}
	switch failOn {
	case "BLOCK":
		return blocked
	default:
		return blocked || warned
	}
}

func printIdentity(sub string, r *identity.Report) {
	switch sub {
	case "cbom":
		fmt.Printf("CBOM — %s (%s, %s)\n", r.FileName, r.Format, r.ProfileID)
		for _, it := range r.CBOM {
			fmt.Printf("  [%-16s] %-28s risk=%-8s pqc=%-18s %s\n", it.Type, it.Name, it.RiskLevel, it.PQCStatus, it.Evidence)
		}
		return
	case "pqc":
		fmt.Printf("PQC plan — %s\n", r.FileName)
		fmt.Printf("  readiness=%s priority=%s\n", r.PQC.Readiness, r.PQC.Priority)
		for _, a := range r.PQC.Affected {
			fmt.Printf("  %-10s risk=%-8s -> %s (%s)\n", a.Algorithm, a.QuantumRisk, a.Replacement, a.Phase)
		}
		if len(r.PQC.Affected) == 0 {
			fmt.Printf("  %s\n", r.PQC.Note)
		}
		return
	}
	fmt.Printf("Identity scan — %s\n", r.FileName)
	fmt.Printf("  format=%s profile=%s size=%d sha256=%s\n", r.Format, r.ProfileID, r.SizeBytes, shortHash(r.SHA256))
	if len(r.Certificates) > 0 {
		fmt.Printf("  certificates: %d\n", len(r.Certificates))
		for _, c := range r.Certificates {
			fmt.Printf("    - %s (issuer %s) %s/%s expiry=%s priority=%s\n",
				c.Metadata.Subject, c.Metadata.Issuer, c.Metadata.PublicKeyAlgorithm,
				c.Risk.QuantumStatus, c.Risk.ExpiryStatus, c.Risk.MigrationPriority)
		}
	}
	if len(r.Identities) > 0 {
		fmt.Printf("  identities:\n")
		for _, id := range r.Identities {
			fmt.Printf("    - [%s] %s\n", id.Type, id.Name)
		}
	}
	if len(r.PKI) > 0 {
		fmt.Printf("  PKI:\n")
		for _, p := range r.PKI {
			fmt.Printf("    - %s (%d certs, self-signed=%v)\n", p.Issuer, p.CertificateCount, p.SelfSigned)
		}
	}
	if len(r.Libraries) > 0 {
		fmt.Printf("  crypto libraries: %s\n", libNames(r.Libraries))
	}
	if len(r.Algorithms) > 0 {
		fmt.Printf("  algorithms: %s\n", algNames(r.Algorithms))
	}
	fmt.Printf("  PQC: readiness=%s priority=%s affected=%d\n", r.PQC.Readiness, r.PQC.Priority, len(r.PQC.Affected))
}

func libNames(in []cryptoscan.LibraryFinding) string {
	var names []string
	for _, l := range in {
		names = append(names, l.Library)
	}
	return strings.Join(names, ", ")
}

func algNames(in []cryptoscan.AlgorithmFinding) string {
	var names []string
	for _, a := range in {
		names = append(names, a.Algorithm)
	}
	return strings.Join(names, ", ")
}

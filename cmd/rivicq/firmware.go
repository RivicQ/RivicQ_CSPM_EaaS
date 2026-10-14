package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/firmware"
	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

// parsedArgs is a tiny flag parser supporting --flag value, --flag=value and
// positional arguments in any order (unlike the stdlib flag package).
type parsedArgs struct {
	values     map[string]string
	bools      map[string]bool
	positional []string
}

func parseArgs(args []string, valueFlags map[string]bool) parsedArgs {
	p := parsedArgs{values: map[string]string{}, bools: map[string]bool{}}
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			p.positional = append(p.positional, args[i+1:]...)
			break
		}
		if strings.HasPrefix(a, "--") || strings.HasPrefix(a, "-") {
			name := strings.TrimLeft(a, "-")
			if eq := strings.Index(name, "="); eq >= 0 {
				p.values[name[:eq]] = name[eq+1:]
				continue
			}
			if valueFlags[name] && i+1 < len(args) && !strings.HasPrefix(args[i+1], "-") {
				p.values[name] = args[i+1]
				i++
				continue
			}
			p.bools[name] = true
			continue
		}
		p.positional = append(p.positional, a)
	}
	return p
}

func (p parsedArgs) value(name, def string) string {
	if v, ok := p.values[name]; ok {
		return v
	}
	return def
}

func firmwareUsage() {
	fmt.Fprint(os.Stderr, `RivicQ firmware static analysis (metadata only — no execution, no key extraction)

Usage:
  rivicq firmware scan <file-or-dir> [flags]
  rivicq firmware cbom <file-or-dir> [flags]
  rivicq firmware pqc  <file-or-dir> [flags]
  rivicq firmware compare <old> <new> [flags]

Flags:
  --format json|table        output format (default table)
  --profile <id>             domain profile (default embedded/generic)
  --device-lifetime <v>      <2y | 2-5y | 5-10y | 10y+ (default unknown)
  --fail-on BLOCK|WARN|NONE  CI gate (default BLOCK)
  --fail-on-change           compare: exit 1 when anything changed
  --json                     shortcut for --format json

Examples:
  rivicq firmware scan firmware.bin --profile embedded/infineon --device-lifetime 10y+
  rivicq firmware cbom ./firmware/ --format json
  rivicq firmware compare v1.bin v2.bin --fail-on-change
`)
}

func runFirmware(args []string) error {
	if len(args) == 0 {
		firmwareUsage()
		return fmt.Errorf("firmware: missing subcommand")
	}
	sub := args[0]
	rest := args[1:]
	switch sub {
	case "scan", "cbom", "pqc":
		return firmwareScan(sub, rest)
	case "compare":
		return firmwareCompare(rest)
	case "help", "-h", "--help":
		firmwareUsage()
		return nil
	default:
		firmwareUsage()
		return fmt.Errorf("firmware: unknown subcommand %q", sub)
	}
}

func lifetimeFlag(v string) string {
	switch v {
	case "", "unknown":
		return "unknown"
	case "<2y":
		return "<2 years"
	case "2-5y":
		return "2-5 years"
	case "5-10y":
		return "5-10 years"
	case "10y+", "10+", "10y":
		return "10+ years"
	default:
		return v
	}
}

func firmwareScan(sub string, args []string) error {
	p := parseArgs(args, map[string]bool{"format": true, "profile": true, "device-lifetime": true, "fail-on": true})
	if p.bools["json"] {
		p.values["format"] = "json"
	}
	target := "."
	if len(p.positional) > 0 {
		target = p.positional[0]
	}
	prof := resolveProfile(p.value("profile", ""), profile.DomainEmbedded)
	limits := firmware.DefaultLimits()
	opts := firmware.Options{DeviceLifetime: lifetimeFlag(p.value("device-lifetime", "unknown"))}

	ctx := context.Background()
	files, err := firmwareTargets(target, limits.MaxFileBytes)
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("firmware: no files found at %s", target)
	}

	var reports []*firmware.Report
	var errs []string
	for _, f := range files {
		rep, aerr := firmware.Analyze(ctx, f, prof, limits, opts)
		if aerr != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", f, aerr))
			continue
		}
		reports = append(reports, rep)
	}
	if len(reports) == 0 {
		return fmt.Errorf("firmware: all targets failed: %s", strings.Join(errs, "; "))
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
			printFirmware(sub, r)
		}
	}

	failOn, ferr := parsePartnerFailOn(p.value("fail-on", "BLOCK"))
	if ferr != nil {
		return ferr
	}
	if firmwareGate(reports, failOn) {
		return failOnError{threshold: failOn, decision: "firmware"}
	}
	return nil
}

func firmwareCompare(args []string) error {
	p := parseArgs(args, map[string]bool{"format": true, "profile": true, "device-lifetime": true})
	if p.bools["json"] {
		p.values["format"] = "json"
	}
	if len(p.positional) < 2 {
		firmwareUsage()
		return fmt.Errorf("firmware compare: need <old> <new>")
	}
	prof := resolveProfile(p.value("profile", ""), profile.DomainEmbedded)
	limits := firmware.DefaultLimits()
	opts := firmware.Options{DeviceLifetime: lifetimeFlag(p.value("device-lifetime", "unknown"))}
	ctx := context.Background()
	from, err := firmware.Analyze(ctx, p.positional[0], prof, limits, opts)
	if err != nil {
		return fmt.Errorf("firmware compare: %w", err)
	}
	to, err := firmware.Analyze(ctx, p.positional[1], prof, limits, opts)
	if err != nil {
		return fmt.Errorf("firmware compare: %w", err)
	}
	diff := firmware.Compare(from, to)
	if p.value("format", "table") == "json" {
		if err := writeJSON(diff); err != nil {
			return err
		}
	} else {
		printFirmwareDiff(diff)
	}
	if p.bools["fail-on-change"] && diff.Changed {
		return failOnError{threshold: "CHANGE", decision: "firmware-compare"}
	}
	return nil
}

func firmwareTargets(target string, maxBytes int64) ([]string, error) {
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
			switch fi.Name() {
			case ".git", "node_modules":
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

func resolveProfile(id string, d profile.Domain) profile.Profile {
	return profile.Resolve(profile.Default(), id, d)
}

func firmwareGate(reports []*firmware.Report, failOn string) bool {
	if failOn == "NONE" || failOn == "" {
		return false
	}
	blocked := false
	warned := false
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
	case "WARN":
		return blocked || warned
	default:
		return blocked || warned
	}
}

func printFirmware(sub string, r *firmware.Report) {
	switch sub {
	case "cbom":
		fmt.Printf("CBOM — %s (%s, %s)\n", r.FileName, r.Format, r.ProfileID)
		for _, it := range r.CBOM {
			fmt.Printf("  [%-16s] %-24s risk=%-8s pqc=%-18s %s\n", it.Type, it.Name, it.RiskLevel, it.PQCStatus, it.Evidence)
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
	fmt.Printf("Firmware scan — %s\n", r.FileName)
	fmt.Printf("  format=%s arch=%s class=%s endian=%s size=%d sha256=%s\n",
		r.Format, orDash(r.Arch), orDash(r.Class), orDash(r.Endianness), r.SizeBytes, shortHash(r.SHA256))
	fmt.Printf("  profile=%s sections=%d symbols=%d strings=%d\n", r.ProfileID, len(r.Sections), r.SymbolCount, r.StringCount)
	if len(r.Libraries) > 0 {
		fmt.Printf("  crypto libraries:\n")
		for _, l := range r.Libraries {
			fmt.Printf("    - %s (%s)\n", l.Library, strings.Join(l.Markers, ", "))
		}
	}
	if len(r.Algorithms) > 0 {
		fmt.Printf("  algorithms:\n")
		for _, a := range r.Algorithms {
			fmt.Printf("    - %-10s %-14s pqc=%s\n", a.Algorithm, a.Category, a.PQCStatus)
		}
	}
	if len(r.CryptoAPIs) > 0 {
		fmt.Printf("  crypto APIs: %s\n", apiNames(r.CryptoAPIs))
	}
	if len(r.Protocols) > 0 {
		fmt.Printf("  protocols: %s\n", protoNames(r.Protocols))
	}
	if len(r.Rules) > 0 {
		fmt.Printf("  silicon/identity markers: %s\n", ruleNames(r.Rules))
	}
	if len(r.Certificates) > 0 {
		fmt.Printf("  certificates: %d\n", len(r.Certificates))
		for _, c := range r.Certificates {
			fmt.Printf("    - %s (issuer %s) %s/%s\n", c.Metadata.Subject, c.Metadata.Issuer, c.Metadata.PublicKeyAlgorithm, c.Risk.QuantumStatus)
		}
	}
	for _, w := range r.Warnings {
		fmt.Printf("  ! %s\n", w)
	}
	fmt.Printf("  PQC: readiness=%s priority=%s affected=%d\n", r.PQC.Readiness, r.PQC.Priority, len(r.PQC.Affected))
}

func printFirmwareDiff(d firmware.Diff) {
	fmt.Printf("Firmware diff\n  from=%s\n  to=%s\n", d.From, d.To)
	line := func(label string, added, removed []string) {
		if len(added) == 0 && len(removed) == 0 {
			return
		}
		fmt.Printf("  %s: +%v -%v\n", label, added, removed)
	}
	line("libraries", d.LibrariesAdded, d.LibrariesRemoved)
	line("algorithms", d.AlgorithmsAdded, d.AlgorithmsRemoved)
	line("crypto-apis", d.APIsAdded, d.APIsRemoved)
	line("protocols", d.ProtocolsAdded, d.ProtocolsRemoved)
	if d.CertificatesChanged {
		fmt.Printf("  certificates: changed\n")
	}
	if d.RiskChanged {
		fmt.Printf("  risk: %s -> %s\n", d.RiskFrom, d.RiskTo)
	}
	if d.PQCStatusChanged {
		fmt.Printf("  pqc-status changed\n")
	}
	if !d.Changed {
		fmt.Printf("  no changes\n")
	}
}

func apiNames(in []firmware.APIFinding) string {
	var names []string
	for _, a := range in {
		names = append(names, a.API)
	}
	return strings.Join(names, ", ")
}

func protoNames(in []firmware.ProtocolFinding) string {
	var names []string
	for _, a := range in {
		names = append(names, a.Protocol)
	}
	return strings.Join(names, ", ")
}

func ruleNames(in []firmware.RuleFinding) string {
	var names []string
	for _, a := range in {
		names = append(names, a.Label)
	}
	return strings.Join(names, ", ")
}

func writeJSON(v any) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

func shortHash(h string) string {
	if len(h) > 16 {
		return h[:16]
	}
	return h
}

func orDash(s string) string {
	if s == "" {
		return "-"
	}
	return s
}

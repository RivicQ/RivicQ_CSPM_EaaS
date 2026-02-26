package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"text/tabwriter"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

func main() {
	outputFlag := flag.String("output", "cbom-findings.json", "Path to write JSON results")
	formatFlag := flag.String("format", "table", "Output format: json | table")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	targets := discovery.DemoTargets

	fmt.Fprintf(os.Stderr, "🔍 CryptoBOM Infrastructure Discovery Scanner\n")
	fmt.Fprintf(os.Stderr, "   Scanning %d targets...\n\n", len(targets))

	scanner := discovery.NewScanner()
	result, err := scanner.ScanAll(ctx, targets)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Scan failed: %v\n", err)
		os.Exit(1)
	}

	// Write JSON output
	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to marshal results: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(*outputFlag, jsonData, 0600); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to write output: %v\n", err)
		os.Exit(1)
	}

	// Print findings
	if *formatFlag == "json" {
		fmt.Println(string(jsonData))
	} else {
		printTable(result)
	}

	// Print summary
	s := result.Summary
	fmt.Printf("\n📊 Scanned %d targets, found %d findings (CRITICAL: %d, HIGH: %d, MEDIUM: %d, LOW: %d)\n",
		s.ScannedTargets, s.TotalFindings, s.Critical, s.High, s.Medium, s.Low)
	fmt.Printf("⚛  Quantum-unsafe assets: %d\n", s.QuantumUnsafe)
	fmt.Printf("📄 Full findings written to %s\n", *outputFlag)
}

func printTable(result *discovery.ScanResult) {
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "SEVERITY\tTARGET\tPROTOCOL\tFINDING\tREMEDIATION")
	fmt.Fprintln(w, "--------\t------\t--------\t-------\t-----------")

	for _, f := range result.Findings {
		remText := f.Remediation
		if len(remText) > 60 {
			remText = remText[:57] + "..."
		}
		title := f.Title
		if len(title) > 50 {
			title = title[:47] + "..."
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n",
			severityIcon(f.Severity)+string(f.Severity),
			f.TargetLabel,
			f.Protocol,
			title,
			remText,
		)
	}
	w.Flush()
}

func severityIcon(s discovery.SeverityLevel) string {
	switch s {
	case discovery.SeverityCritical:
		return "🔴 "
	case discovery.SeverityHigh:
		return "🟠 "
	case discovery.SeverityMedium:
		return "🟡 "
	case discovery.SeverityLow:
		return "🟢 "
	default:
		return "⚪ "
	}
}

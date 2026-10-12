package intelligence

import (
	"time"

	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

// CycloneDXBOM is a CycloneDX 1.6-compatible document focused on cryptographic
// assets. It is generated from existing CBOM components and detected crypto
// findings — it does not replace the internal ScanResult stored in cbom_reports.
//
// Content scans (SAST-style) produce findings but no discovery.CBOMComponent
// values, so findings that name a cryptographic algorithm are folded into the
// BOM here. Library-presence/finding records without an algorithm are ignored so
// the BOM stays a cryptographic-asset BOM and not a general findings dump.
func CycloneDXBOM(target string, components []discovery.CBOMComponent, findings []Finding) map[string]any {
	comps := make([]map[string]any, 0, len(components)+len(findings))
	seen := map[string]bool{}
	for _, c := range components {
		key := c.Algorithm + "|" + c.Library + "|" + c.Location
		if seen[key] {
			continue
		}
		seen[key] = true
		comps = append(comps, map[string]any{
			"type":    "cryptographic-asset",
			"name":    firstNonEmpty(c.Algorithm, c.Library),
			"version": c.Version,
			"cryptoProperties": map[string]any{
				"assetType": "algorithm",
				"algorithmProperties": map[string]any{
					"parameterSetIdentifier": keySizeLabel(c.KeySize),
					"executionEnvironment":   "software",
				},
			},
			"properties": []map[string]string{
				{"name": "rivicq:quantum_safe", "value": boolStr(c.QuantumSafe)},
				{"name": "rivicq:pqc_status", "value": c.PQCStatus},
				{"name": "rivicq:location", "value": c.Location},
				{"name": "rivicq:risk_level", "value": string(c.RiskLevel)},
			},
		})
	}
	for _, f := range findings {
		if f.Algorithm == "" {
			continue
		}
		key := f.Algorithm + "||" + f.Location
		if seen[key] {
			continue
		}
		seen[key] = true
		comps = append(comps, map[string]any{
			"type": "cryptographic-asset",
			"name": f.Algorithm,
			"cryptoProperties": map[string]any{
				"assetType": "algorithm",
				"algorithmProperties": map[string]any{
					"parameterSetIdentifier": keySizeLabel(f.KeyLength),
					"executionEnvironment":   "software",
				},
			},
			"properties": []map[string]string{
				{"name": "rivicq:quantum_safe", "value": boolStr(f.QuantumSafe)},
				{"name": "rivicq:pqc_status", "value": f.PQCClass},
				{"name": "rivicq:location", "value": f.Location},
				{"name": "rivicq:risk_level", "value": f.Risk.Level},
				{"name": "rivicq:source", "value": "detected-finding"},
				{"name": "rivicq:rule_id", "value": f.RuleID},
			},
		})
	}
	return map[string]any{
		"bomFormat":    "CycloneDX",
		"specVersion":  "1.6",
		"version":      1,
		"serialNumber": "urn:uuid:" + uuid.NewString(),
		"metadata": map[string]any{
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"tools": []map[string]string{
				{"vendor": "RivicQ", "name": "RivicQ CBOM Engine", "version": ScannerVersion},
			},
			"component": map[string]any{"type": "application", "name": target},
		},
		"components": comps,
		"annotations": []map[string]any{
			{
				"text": "Generated from RivicQ discovery/CBOM components and detected crypto findings. This is a CycloneDX 1.6 cryptographic-asset BOM, not a substitute for a full application SBOM.",
			},
		},
	}
}

func keySizeLabel(n int) string {
	if n <= 0 {
		return ""
	}
	return itoa(n)
}

func boolStr(v bool) string {
	if v {
		return "true"
	}
	return "false"
}

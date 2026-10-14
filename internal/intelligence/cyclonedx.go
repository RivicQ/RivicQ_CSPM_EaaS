package intelligence

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

// cycloneDXNamespace is a stable UUID used to derive deterministic serial
// numbers (UUID v5 / SHA-1 name-based) so two scans of the same evidence
// produce the same CycloneDX identity. Random UUIDs made regression tests
// and scan diffs noisy.
var cycloneDXNamespace = uuid.MustParse("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

// CycloneDXBOM is a CycloneDX 1.6-compatible document focused on cryptographic
// assets. It is generated from existing CBOM components and detected crypto
// findings — it does not replace the internal ScanResult stored in cbom_reports.
//
// Content scans (SAST-style) produce findings but no discovery.CBOMComponent
// values, so findings that name a cryptographic algorithm are folded into the
// BOM here. Library-presence/finding records without an algorithm are ignored so
// the BOM stays a cryptographic-asset BOM and not a general findings dump.
func CycloneDXBOM(target string, components []discovery.CBOMComponent, findings []Finding) map[string]any {
	type row struct {
		key      string
		bomRef   string
		comp     map[string]any
		depends  []string
		location string
		algo     string
	}
	seen := map[string]int{}
	rows := make([]row, 0, len(components)+len(findings))

	add := func(key string, comp map[string]any, location, algo string, related []string) {
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = len(rows)
		ref := bomRefFor(key)
		comp["bom-ref"] = ref
		if _, ok := comp["name"]; !ok || comp["name"] == "" {
			comp["name"] = firstNonEmpty(algo, key)
		}
		comp["type"] = "cryptographic-asset"
		rows = append(rows, row{
			key:      key,
			bomRef:   ref,
			comp:     comp,
			depends:  related,
			location: location,
			algo:     algo,
		})
	}

	for _, c := range components {
		key := c.Algorithm + "|" + c.Library + "|" + c.Location
		add(key, map[string]any{
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
				{"name": "rivicq:presence_kind", "value": PresenceLibrary},
				{"name": "rivicq:detection_method", "value": MethodSBOM},
				{"name": "rivicq:library", "value": c.Library},
			},
		}, c.Location, c.Algorithm, nil)
	}
	for _, f := range findings {
		if f.Algorithm == "" {
			continue
		}
		key := f.Algorithm + "||" + f.Location
		props := []map[string]string{
			{"name": "rivicq:quantum_safe", "value": boolStr(f.QuantumSafe)},
			{"name": "rivicq:pqc_status", "value": f.PQCClass},
			{"name": "rivicq:location", "value": f.Location},
			{"name": "rivicq:risk_level", "value": f.Risk.Level},
			{"name": "rivicq:source", "value": firstNonEmpty(f.Source, "detected-finding")},
			{"name": "rivicq:rule_id", "value": f.RuleID},
			{"name": "rivicq:presence_kind", "value": f.PresenceKind},
			{"name": "rivicq:detection_method", "value": f.DetectionMethod},
			{"name": "rivicq:evidence_kind", "value": f.EvidenceKind},
			{"name": "rivicq:exploitability", "value": f.Exploitability},
			{"name": "rivicq:confidence", "value": fmt.Sprintf("%.2f", f.Confidence)},
			{"name": "rivicq:scanner", "value": f.Scanner},
			{"name": "rivicq:scanner_version", "value": firstNonEmpty(f.ScannerVersion, ScannerVersion)},
			{"name": "rivicq:limitations", "value": f.Limitations},
		}
		if f.RiskRationale != "" {
			props = append(props, map[string]string{"name": "rivicq:risk_rationale", "value": f.RiskRationale})
		}
		add(key, map[string]any{
			"name": f.Algorithm,
			"cryptoProperties": map[string]any{
				"assetType": "algorithm",
				"algorithmProperties": map[string]any{
					"parameterSetIdentifier": keySizeLabel(f.KeyLength),
					"executionEnvironment":   "software",
				},
			},
			"properties": props,
		}, f.Location, f.Algorithm, f.RelatedAssets)
	}

	sort.Slice(rows, func(i, j int) bool { return rows[i].bomRef < rows[j].bomRef })

	comps := make([]map[string]any, 0, len(rows))
	deps := make([]map[string]any, 0)
	identity := strings.Builder{}
	identity.WriteString(target)
	identity.WriteByte('\n')
	for _, r := range rows {
		comps = append(comps, r.comp)
		identity.WriteString(r.key)
		identity.WriteByte('\n')
		if len(r.depends) > 0 {
			deps = append(deps, map[string]any{"ref": r.bomRef, "dependsOn": r.depends})
		}
	}

	serial := uuid.NewSHA1(cycloneDXNamespace, []byte(identity.String()))
	doc := map[string]any{
		"bomFormat":    "CycloneDX",
		"specVersion":  "1.6",
		"version":      1,
		"serialNumber": "urn:uuid:" + serial.String(),
		"metadata": map[string]any{
			"tools": []map[string]string{
				{"vendor": "RivicQ", "name": "RivicQ CBOM Engine", "version": ScannerVersion},
			},
			"component": map[string]any{"type": "application", "name": target, "bom-ref": "app-" + shortHash(target)},
		},
		"components": comps,
		"annotations": []map[string]any{
			{
				"text": "Generated from RivicQ discovery/CBOM components and detected crypto findings. This is a CycloneDX 1.6 cryptographic-asset BOM, not a substitute for a full application SBOM. Inventory observations are not policy violations.",
			},
		},
	}
	if len(deps) > 0 {
		doc["dependencies"] = deps
	}
	return doc
}

func bomRefFor(key string) string {
	return "crypto-" + shortHash(key)
}

func shortHash(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])[:16]
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

// ValidateCycloneDX reports structural problems in a document produced by
// CycloneDXBOM. It is a contract check, not a full CycloneDX JSON-schema
// validator (that would require vendoring the upstream schema).
func ValidateCycloneDX(doc map[string]any) []string {
	var errs []string
	if doc == nil {
		return []string{"document is nil"}
	}
	if doc["bomFormat"] != "CycloneDX" {
		errs = append(errs, "bomFormat must be CycloneDX")
	}
	if doc["specVersion"] != "1.6" {
		errs = append(errs, "specVersion must be 1.6")
	}
	serial, _ := doc["serialNumber"].(string)
	if !strings.HasPrefix(serial, "urn:uuid:") || len(serial) < 45 {
		errs = append(errs, "serialNumber must be urn:uuid:<uuid>")
	}
	list, ok := doc["components"].([]map[string]any)
	if !ok {
		errs = append(errs, "components must be an array of objects")
		return errs
	}
	refs := map[string]bool{}
	for i, c := range list {
		if c["type"] != "cryptographic-asset" {
			errs = append(errs, fmt.Sprintf("components[%d].type must be cryptographic-asset", i))
		}
		name, _ := c["name"].(string)
		if strings.TrimSpace(name) == "" {
			errs = append(errs, fmt.Sprintf("components[%d].name is required", i))
		}
		ref, _ := c["bom-ref"].(string)
		if ref == "" {
			errs = append(errs, fmt.Sprintf("components[%d].bom-ref is required", i))
			continue
		}
		if refs[ref] {
			errs = append(errs, "duplicate bom-ref "+ref)
		}
		refs[ref] = true
	}
	return errs
}

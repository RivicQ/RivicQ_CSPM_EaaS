package intelligence

import (
	"strconv"
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

// ClientArchitecture is the discover → mitigate → report path for a scan.
type ClientArchitecture struct {
	TargetClass string  `json:"target_class"`
	Target      string  `json:"target"`
	ScanType    string  `json:"scan_type,omitempty"`
	Edition     string  `json:"edition"`
	Resources   map[string]bool `json:"resources"`
	Phases      []Phase `json:"phases"`
	Honesty     string  `json:"honesty"`
}

// Phase is one step of the client architecture.
type Phase struct {
	ID      string   `json:"id"` // discover | mitigate | report
	Title   string   `json:"title"`
	Status  string   `json:"status"` // complete | partial | pending
	Summary string   `json:"summary"`
	Actions []string `json:"actions"`
}

// PQCReadiness scores the four workbook layers (SBOM/CBOM/HBOM/AIBOM) plus HNDL and DORA/NIS2/BSI mapping.
// Community returns JSON scores. Enterprise adds pack_available when the control plane is licensed.
type PQCReadiness struct {
	Overall         int            `json:"overall"`
	Layers          map[string]int `json:"layers"`
	HNDLExposure    int            `json:"hndl_exposure"`
	Migration       []Mitigation   `json:"migration"`
	Compliance      []ControlMap   `json:"compliance"`
	PackAvailable   bool           `json:"pack_available"`
	Note            string         `json:"note"`
}

// Mitigation is a PQC mapping for one algorithm family (not a live key rotation).
type Mitigation struct {
	Algorithm    string `json:"algorithm"`
	AttackClass  string `json:"attack_class,omitempty"`
	ReplaceWith  string `json:"replace_with"`
	Standard     string `json:"standard"`
	Priority     string `json:"priority"`
}

// ControlMap is an operator mapping, not a certification.
type ControlMap struct {
	Framework string `json:"framework"`
	Control   string `json:"control"`
	Status    string `json:"status"`
	Evidence  string `json:"evidence"`
}

func buildClientArchitecture(in ScanInput, findings []Finding, qiskit qiskitprofile.PipelineResult) *ClientArchitecture {
	scanType := in.ScanType
	if scanType == "" {
		scanType = "cbom"
	}
	class := discovery.ClassifyTarget(in.Target, scanType)
	resources := map[string]bool{}
	if in.Discovery != nil {
		resources = discovery.ResourcesFromTargets(in.Discovery.Targets)
	}
	ed := string(edition.Detect().Edition)
	discoverStatus := "partial"
	if len(findings) > 0 || resourceEnabled(resources, "tls", "https", "http", "ssh", "sbom", "k8s", "hardware") {
		discoverStatus = "complete"
	}
	mitigations := pqcMitigations(findings)
	mitigateStatus := "pending"
	if len(mitigations) > 0 {
		mitigateStatus = "complete"
	}
	return &ClientArchitecture{
		TargetClass: string(class),
		Target:      in.Target,
		ScanType:    scanType,
		Edition:     ed,
		Resources:   resources,
		Honesty:     "Discover inventories cryptography. Mitigate maps to NIST ML-KEM / ML-DSA / SLH-DSA. Report is CBOM + Qiskit/audit scores + DORA/NIS2/BSI mappings — not a certification.",
		Phases: []Phase{
			{
				ID:      "discover",
				Title:   "Discover",
				Status:  discoverStatus,
				Summary: discoverSummary(class, resources),
				Actions: discoverActions(class, resources),
			},
			{
				ID:      "mitigate",
				Title:   "Mitigate",
				Status:  mitigateStatus,
				Summary: "Map Shor/Grover-class algorithms to FIPS 203/204/205 replacements. Hybrid classical+PQC is recommended; this engine does not rotate keys.",
				Actions: mitigationActions(mitigations),
			},
			{
				ID:      "report",
				Title:   "Report",
				Status:  "complete",
				Summary: "CycloneDX 1.6 CBOM, intelligence findings, Qiskit estate score, and audit composite. Community is JSON. Enterprise adds the DORA pack when licensed.",
				Actions: reportActions(qiskit, ed),
			},
		},
	}
}

func buildPQCReadiness(findings []Finding, disc *discovery.ScanResult) *PQCReadiness {
	layers := map[string]int{
		"sbom":  0,
		"cbom":  40,
		"hbom":  0,
		"aibom": 0,
	}
	if disc != nil {
		res := discovery.ResourcesFromTargets(disc.Targets)
		if res["sbom"] {
			layers["sbom"] = 80
		}
		if res["tls"] || res["https"] || res["ssh"] || len(disc.Components) > 0 {
			layers["cbom"] = 90
		}
		if res["hardware"] {
			layers["hbom"] = 70
		}
		if res["k8s"] {
			layers["cbom"] = maxInt(layers["cbom"], 60)
		}
	}
	shor := 0
	pqc := 0
	for _, f := range findings {
		cl := qiskitprofile.Classify(f.Algorithm, f.KeyLength)
		if cl.AttackClass == qiskitprofile.AttackShor {
			shor++
		}
		if f.QuantumSafe || cl.AttackClass == qiskitprofile.AttackPQC {
			pqc++
		}
	}
	hndl := 0
	if len(findings) > 0 {
		hndl = (shor * 100) / len(findings)
		if hndl > 100 {
			hndl = 100
		}
	}
	layerAvg := (layers["sbom"] + layers["cbom"] + layers["hbom"] + layers["aibom"]) / 4
	overall := layerAvg
	if hndl > 50 {
		overall -= (hndl - 50) / 5
	}
	if pqc > 0 {
		overall += 5
	}
	if overall < 0 {
		overall = 0
	}
	if overall > 100 {
		overall = 100
	}
	cfg := edition.Detect()
	return &PQCReadiness{
		Overall:       overall,
		Layers:        layers,
		HNDLExposure:  hndl,
		Migration:     pqcMitigations(findings),
		Compliance:    complianceMaps(findings, cfg.Features.DORAPack),
		PackAvailable: cfg.Features.DORAPack,
		Note:          "Workbook-aligned PQC readiness (SBOM/CBOM/HBOM/AIBOM + HNDL). AIBOM is scored when model-signing crypto is present. Not a Big-4 assessment and not a certification.",
	}
}

func pqcMitigations(findings []Finding) []Mitigation {
	seen := map[string]bool{}
	out := make([]Mitigation, 0)
	for _, f := range findings {
		if f.Algorithm == "" {
			continue
		}
		cl := qiskitprofile.Classify(f.Algorithm, f.KeyLength)
		key := strings.ToUpper(f.Algorithm) + ":" + string(cl.AttackClass)
		if seen[key] {
			continue
		}
		seen[key] = true
		m := Mitigation{Algorithm: f.Algorithm, AttackClass: string(cl.AttackClass), Priority: "monitor"}
		switch cl.AttackClass {
		case qiskitprofile.AttackShor:
			if looksLikeSignature(f.Algorithm) {
				m.ReplaceWith = "ML-DSA-65 (hybrid with classical signatures during migration)"
				m.Standard = "FIPS 204"
			} else {
				m.ReplaceWith = "ML-KEM-768 (hybrid with classical KEM/TLS during migration)"
				m.Standard = "FIPS 203"
			}
			m.Priority = "plan"
			if f.KeyLength > 0 && f.KeyLength < 2048 {
				m.Priority = "now"
			}
		case qiskitprofile.AttackGrover:
			m.ReplaceWith = "AES-256 / SHA-384+ (Grover-sized symmetric)"
			m.Standard = "SP 800-57 / BSI TR-02102"
			m.Priority = "hygiene"
		case qiskitprofile.AttackPQC:
			m.ReplaceWith = "Keep current NIST PQC algorithm; track parameter sets"
			m.Standard = "FIPS 203/204/205"
			m.Priority = "preferred"
		default:
			continue
		}
		out = append(out, m)
		if len(out) >= 12 {
			break
		}
	}
	return out
}

func looksLikeSignature(alg string) bool {
	u := strings.ToUpper(alg)
	if strings.Contains(u, "ECDSA") || strings.Contains(u, "ED25519") || strings.Contains(u, "DSA") {
		return true
	}
	return strings.Contains(u, "RSA") && (strings.Contains(u, "PSS") || strings.Contains(u, "SIG") || strings.Contains(u, "SHA"))
}

func complianceMaps(findings []Finding, doraPack bool) []ControlMap {
	cbomEvidence := "CycloneDX 1.6 CBOM + intelligence findings"
	maps := []ControlMap{
		{Framework: "DORA RTS", Control: "Art. 9 ICT risk — cryptographic asset inventory", Status: "mapped", Evidence: cbomEvidence},
		{Framework: "DORA", Control: "Art. 6 ICT governance", Status: packStatus(doraPack), Evidence: "Community JSON; Enterprise pack when licensed"},
		{Framework: "NIS2", Control: "Art. 21 risk-management measures (cryptography)", Status: "mapped", Evidence: cbomEvidence},
		{Framework: "BSI TR-02102", Control: "Algorithm strength vs German technical guideline", Status: "mapped", Evidence: "Finding bsi_ref fields where present"},
		{Framework: "NIST PQC", Control: "FIPS 203/204/205 migration mapping", Status: "mapped", Evidence: "Qiskit-aligned taxonomy (local, not CAVP)"},
	}
	hasDORA := false
	for _, f := range findings {
		for _, c := range f.Controls {
			if strings.Contains(strings.ToUpper(c), "DORA") {
				hasDORA = true
			}
		}
	}
	if hasDORA {
		maps[0].Status = "evidenced"
	}
	return maps
}

func packStatus(doraPack bool) string {
	if doraPack {
		return "pack_enabled"
	}
	return "json_only"
}

func discoverSummary(class discovery.TargetClass, res map[string]bool) string {
	switch class {
	case discovery.ClassWebsite:
		return "Public website: TLS on 443 plus HTTPS headers/cookies. SSH skipped unless scan_type=full."
	case discovery.ClassIP:
		return "IP address: TLS, SSH, and HTTP surface scan of the host."
	case discovery.ClassServer:
		return "Server: TLS, SSH, and HTTP cryptographic discovery on the resolved host."
	case discovery.ClassPod:
		return "Kubernetes pod: declared namespace/workload inventory. Live apiserver attach is Enterprise."
	case discovery.ClassHardware:
		return "Hardware frame: declared HSM/TPM/QSIC/QRNG metadata. Not firmware reverse-engineering."
	case discovery.ClassPath:
		return "Local path: SBOM cryptographic library discovery."
	default:
		return "Host: TLS, SSH, and HTTP cryptographic discovery."
	}
}

func discoverActions(class discovery.TargetClass, res map[string]bool) []string {
	out := make([]string, 0, 6)
	for _, k := range []string{"tls", "https", "http", "ssh", "sbom", "k8s", "hardware"} {
		if res[k] {
			out = append(out, k+" enabled")
		}
	}
	if len(out) == 0 {
		out = append(out, "No scanners scheduled for "+string(class))
	}
	return out
}

func mitigationActions(ms []Mitigation) []string {
	if len(ms) == 0 {
		out := []string{"No algorithm-specific PQC mapping yet — complete discovery first"}
		return out
	}
	out := make([]string, 0, len(ms))
	for _, m := range ms {
		out = append(out, m.Algorithm+" → "+m.ReplaceWith+" ("+m.Standard+")")
	}
	return out
}

func reportActions(qiskit qiskitprofile.PipelineResult, ed string) []string {
	return []string{
		"GET /api/v1/scans/:id/report — discovery.ScanResult (stable contract)",
		"GET /api/v1/scans/:id/intelligence — findings, gate, architecture, PQC readiness",
		"GET /api/v1/scans/:id/cyclonedx — CycloneDX 1.6 CBOM",
		"Qiskit estate " + strconv.Itoa(qiskit.EstateScore) + "/100 on " + ed + " (local taxonomy, not IBM Quantum hardware)",
	}
}

func resourceEnabled(res map[string]bool, keys ...string) bool {
	for _, k := range keys {
		if res[k] {
			return true
		}
	}
	return false
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

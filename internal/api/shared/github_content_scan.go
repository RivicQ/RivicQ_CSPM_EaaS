package shared

import (
	"bufio"
	"embed"
	"encoding/json"
	"io/fs"
	"path"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

//go:embed testdata/demo-repo/**
var demoRepoFS embed.FS

// RepoFile is a scanned source file with real content.
type RepoFile struct {
	Path    string
	Content string
}

// GHScanStage records a completed scanner stage (not a timer).
type GHScanStage struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Status string `json:"status"`
}

// GHComponent is an SBOM/CBOM inventory item derived from files.
type GHComponent struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
	PURL    string `json:"purl,omitempty"`
	Type    string `json:"type"`
	License string `json:"license,omitempty"`
	Demo    bool   `json:"demo,omitempty"`
}

type ghScanJob struct {
	ID      string
	Status  string
	Stage   string
	Stages  []GHScanStage
	Results []GHScanResult
	Error   string
	Demo    bool
}

var ghScanJobs = struct {
	mu   sync.RWMutex
	jobs map[string]*ghScanJob
	order []string
}{jobs: map[string]*ghScanJob{}}

func storeGHScanJob(job *ghScanJob) {
	ghScanJobs.mu.Lock()
	defer ghScanJobs.mu.Unlock()
	if _, exists := ghScanJobs.jobs[job.ID]; !exists {
		ghScanJobs.order = append(ghScanJobs.order, job.ID)
	}
	copied := *job
	ghScanJobs.jobs[job.ID] = &copied
	for len(ghScanJobs.order) > 50 {
		old := ghScanJobs.order[0]
		ghScanJobs.order = ghScanJobs.order[1:]
		delete(ghScanJobs.jobs, old)
	}
}

func updateGHScanJob(id string, fn func(*ghScanJob)) {
	ghScanJobs.mu.Lock()
	defer ghScanJobs.mu.Unlock()
	job, ok := ghScanJobs.jobs[id]
	if !ok {
		return
	}
	fn(job)
}

func getGHScanJob(id string) (*ghScanJob, bool) {
	ghScanJobs.mu.RLock()
	defer ghScanJobs.mu.RUnlock()
	j, ok := ghScanJobs.jobs[id]
	if !ok {
		return nil, false
	}
	copied := *j
	return &copied, true
}

func listGHScanJobs() []*ghScanJob {
	ghScanJobs.mu.RLock()
	defer ghScanJobs.mu.RUnlock()
	out := make([]*ghScanJob, 0, len(ghScanJobs.order))
	for i := len(ghScanJobs.order) - 1; i >= 0; i-- {
		if j, ok := ghScanJobs.jobs[ghScanJobs.order[i]]; ok {
			copied := *j
			out = append(out, &copied)
		}
	}
	return out
}

func findingKey(f GHFinding) string {
	return strings.ToLower(f.FilePath + "|" + f.FindingType + "|" + f.Algorithm)
}

type GHScanDiff struct {
	CurrentScan  string      `json:"current_scan"`
	PreviousScan string      `json:"previous_scan"`
	New          []GHFinding `json:"new"`
	Resolved     []GHFinding `json:"resolved"`
	Unchanged    []GHFinding `json:"unchanged"`
	Counts       GHScanDiffCounts `json:"counts"`
}

type GHScanDiffCounts struct {
	New       int `json:"new"`
	Resolved  int `json:"resolved"`
	Unchanged int `json:"unchanged"`
}

func compareGHScans(current, previous *ghScanJob) GHScanDiff {
	curr := map[string]GHFinding{}
	prev := map[string]GHFinding{}
	if len(current.Results) > 0 {
		for _, f := range current.Results[0].CryptoFindings {
			curr[findingKey(f)] = f
		}
	}
	if len(previous.Results) > 0 {
		for _, f := range previous.Results[0].CryptoFindings {
			prev[findingKey(f)] = f
		}
	}
	diff := GHScanDiff{CurrentScan: current.ID, PreviousScan: previous.ID}
	for k, f := range curr {
		if _, ok := prev[k]; ok {
			diff.Unchanged = append(diff.Unchanged, f)
		} else {
			diff.New = append(diff.New, f)
		}
	}
	for k, f := range prev {
		if _, ok := curr[k]; !ok {
			diff.Resolved = append(diff.Resolved, f)
		}
	}
	diff.Counts = GHScanDiffCounts{New: len(diff.New), Resolved: len(diff.Resolved), Unchanged: len(diff.Unchanged)}
	return diff
}

type cryptoRule struct {
	re          *regexp.Regexp
	algorithm   string
	findingType string
	severity    string
	quantumSafe bool
	owasp       string
	cwe         string
	remediation string
}

var cryptoRules = []cryptoRule{
	{regexp.MustCompile(`(?i)` + `crypto/` + `md5|hashlib\.` + `md5|MessageDigest\.getInstance\(["']MD5|md5\.Sum\(`), "MD5", "WEAK_HASH", "HIGH", false, "A02:2021 Cryptographic Failures", "CWE-327", "Replace MD5 with SHA-256 or SHA-3; do not use MD5 for integrity or passwords."},
	{regexp.MustCompile(`(?i)` + `crypto/` + `sha1|hashlib\.` + `sha1|sha1\.Sum\(`), "SHA-1", "WEAK_HASH", "HIGH", false, "A02:2021 Cryptographic Failures", "CWE-327", "Migrate SHA-1 to SHA-256 or SHA-3."},
	{regexp.MustCompile(`(?i)` + `crypto/` + `rsa|RSA\.generate|` + `rsa` + `\.GenerateKey|RSA_PKCS1|algorithm:\s*['"]RS256`), "RSA", "CRYPTO_IMPORT", "MEDIUM", false, "A02:2021 Cryptographic Failures", "CWE-327", "Review RSA key sizes (prefer ≥3072) and plan ML-KEM / ML-DSA hybrid migration."},
	{regexp.MustCompile(`(?i)` + `des-` + `ede3|` + `DES` + `ede|triple-des|tripledes`), "3DES", "WEAK_CIPHER", "CRITICAL", false, "A02:2021 Cryptographic Failures", "CWE-327", "Remove 3DES; use AES-256-GCM."},
	{regexp.MustCompile(`(?i)arc` + `four|rc4-` + `sha|RC4-` + `MD5`), "RC4", "WEAK_CIPHER", "CRITICAL", false, "A02:2021 Cryptographic Failures", "CWE-327", "Disable RC4; use TLS 1.2+ with AEAD ciphers."},
	{regexp.MustCompile(`(?i)` + `crypto/` + `ecdsa|EC_KEY|` + `ecdsa` + `\.GenerateKey`), "ECDSA", "CRYPTO_IMPORT", "MEDIUM", false, "A02:2021 Cryptographic Failures", "CWE-327", "ECDSA is not quantum-safe; plan ML-DSA migration."},
	{regexp.MustCompile(`(?i)jwt\.sign|json` + `webtoken|jose\.JWT`), "JWT", "CRYPTO_IMPORT", "LOW", false, "A02:2021 Cryptographic Failures", "CWE-347", "Prefer EdDSA or PQC-hybrid JWT signing; rotate secrets."},
	{regexp.MustCompile(`(?i)ml-kem|ml-dsa|kyber|dilithium|liboqs`), "PQC", "PQC_LIBRARY", "INFO", true, "A02:2021 Cryptographic Failures", "CWE-327", "PQC library detected — verify it is used for production key exchange, not only imported."},
	{regexp.MustCompile(`tls\.VersionTLS10`), "TLS 1.0", "WEAK_TLS", "HIGH", false, "A02:2021 Cryptographic Failures", "CWE-326", "Disable TLS 1.0; require TLS 1.2 or TLS 1.3."},
	{regexp.MustCompile(`tls\.VersionTLS11`), "TLS 1.1", "WEAK_TLS", "HIGH", false, "A02:2021 Cryptographic Failures", "CWE-326", "Disable TLS 1.1; require TLS 1.2 or TLS 1.3."},
}

// rsaKeyBitsRe captures RSA modulus size from GenerateKey(..., N) or RSA.generate(N).
var rsaKeyBitsRe = regexp.MustCompile(`(?i)GenerateKey\([^)]*?,\s*(1024|2048|3072|4096)\s*\)|RSA\.generate\((1024|2048|3072|4096)\)`)

func extractKeyLength(algorithm, content string) int {
	if !strings.EqualFold(algorithm, "RSA") {
		return 0
	}
	m := rsaKeyBitsRe.FindStringSubmatch(content)
	if len(m) < 2 {
		return 0
	}
	for i := 1; i < len(m); i++ {
		if m[i] == "" {
			continue
		}
		n, err := strconv.Atoi(m[i])
		if err != nil {
			continue
		}
		return n
	}
	return 0
}

type secretRule struct {
	re          *regexp.Regexp
	kind        string
	severity    string
	remediation string
}

var secretRules = []secretRule{
	{regexp.MustCompile(`AKIA[0-9A-Z]{16}`), "aws_access_key", "CRITICAL", "Rotate the AWS key; store credentials in a secret manager."},
	{regexp.MustCompile(`ghp_[A-Za-z0-9]{20,}`), "github_token", "CRITICAL", "Revoke the GitHub PAT and use a GitHub App with least privilege."},
	{regexp.MustCompile(`-----BEGIN (RSA |OPENSSH |EC |OPENSSH )?PRIVATE KEY-----`), "private_key", "CRITICAL", "Remove private keys from source control; rotate the key pair."},
	{regexp.MustCompile(`(?i)(api[_-]?key|secret|password|token)\s*[=:]\s*['"][^'"]{12,}['"]`), "generic_secret", "HIGH", "Move secrets to environment variables or a vault; rotate exposed values."},
}

var interestingExt = map[string]bool{
	".go": true, ".py": true, ".js": true, ".jsx": true, ".ts": true, ".tsx": true,
	".java": true, ".rs": true, ".rb": true, ".php": true, ".cs": true, ".c": true, ".cpp": true,
	".json": true, ".yml": true, ".yaml": true, ".xml": true, ".tf": true, ".mod": true,
	".sum": true, ".txt": true, ".toml": true, ".gradle": true, ".env": true,
}

var interestingNames = map[string]bool{
	"dockerfile": true, "docker-compose.yml": true, "docker-compose.yaml": true,
	"package.json": true, "package-lock.json": true, "go.mod": true, "go.sum": true,
	"requirements.txt": true, "pom.xml": true, "cargo.toml": true, "gemfile": true,
	"composer.json": true, "config.env": true, "secrets.fixture": true,
}

func isInterestingPath(p string) bool {
	base := strings.ToLower(path.Base(p))
	if interestingNames[base] {
		return true
	}
	ext := strings.ToLower(path.Ext(p))
	return interestingExt[ext]
}

func lineOf(content string, idx int) int {
	if idx <= 0 {
		return 1
	}
	return strings.Count(content[:idx], "\n") + 1
}

func maskSecret(s string) string {
	if len(s) <= 8 {
		return "********"
	}
	return s[:4] + strings.Repeat("*", len(s)-8) + s[len(s)-4:]
}

func isPlaceholderSecret(s string) bool {
	l := strings.ToLower(s)
	return strings.Contains(l, "${{") ||
		strings.Contains(l, "secrets.") ||
		strings.Contains(l, "replace_with") ||
		strings.Contains(l, "changeme") ||
		strings.Contains(l, "not-for-production") ||
		strings.Contains(l, "placeholder") ||
		strings.Contains(l, "example") ||
		strings.Contains(l, "your-") ||
		strings.Contains(l, "<path") ||
		strings.Contains(l, "xxxx")
}

func languageOf(p string) string {
	switch strings.ToLower(path.Ext(p)) {
	case ".go":
		return "Go"
	case ".py":
		return "Python"
	case ".js", ".jsx":
		return "JavaScript"
	case ".ts", ".tsx":
		return "TypeScript"
	case ".java":
		return "Java"
	case ".rs":
		return "Rust"
	case ".tf":
		return "HCL"
	case ".json":
		return "JSON"
	default:
		base := strings.ToLower(path.Base(p))
		if base == "dockerfile" {
			return "Dockerfile"
		}
		return strings.TrimPrefix(path.Ext(p), ".")
	}
}

func summarizeFindings(findings []GHFinding) GHSummary {
	sum := GHSummary{TotalFindings: len(findings)}
	for _, f := range findings {
		if !f.QuantumSafe {
			sum.QuantumUnsafe++
		}
		switch strings.ToUpper(f.Severity) {
		case "CRITICAL":
			sum.Critical++
		case "HIGH":
			sum.High++
		case "MEDIUM":
			sum.Medium++
		case "LOW":
			sum.Low++
		}
	}
	return sum
}

func pqcReadiness(findings []GHFinding) int {
	crypto := 0
	safe := 0
	for _, f := range findings {
		if f.FindingType == "CRYPTO_IMPORT" || f.FindingType == "WEAK_HASH" || f.FindingType == "WEAK_CIPHER" || f.FindingType == "PQC_LIBRARY" {
			crypto++
			if f.QuantumSafe {
				safe++
			}
		}
	}
	if crypto == 0 {
		return 100
	}
	return int(float64(safe) / float64(crypto) * 100)
}

func parseNPMDependencies(content string) []GHComponent {
	var pkg struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if json.Unmarshal([]byte(content), &pkg) != nil {
		return nil
	}
	out := make([]GHComponent, 0)
	for name, ver := range pkg.Dependencies {
		out = append(out, GHComponent{Name: name, Version: strings.TrimPrefix(ver, "^"), Type: "npm", PURL: "pkg:npm/" + name})
	}
	return out
}

func parseGoMod(content string) []GHComponent {
	out := make([]GHComponent, 0)
	sc := bufio.NewScanner(strings.NewReader(content))
	inBlock := false
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if strings.HasPrefix(line, "require (") {
			inBlock = true
			continue
		}
		if inBlock && line == ")" {
			inBlock = false
			continue
		}
		if strings.HasPrefix(line, "require ") && !inBlock {
			fields := strings.Fields(line)
			if len(fields) >= 3 {
				out = append(out, GHComponent{Name: fields[1], Version: fields[2], Type: "golang", PURL: "pkg:golang/" + fields[1]})
			}
		}
		if inBlock && line != "" && !strings.HasPrefix(line, "//") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				out = append(out, GHComponent{Name: fields[0], Version: fields[1], Type: "golang", PURL: "pkg:golang/" + fields[0]})
			}
		}
	}
	return out
}

func parseRequirements(content string) []GHComponent {
	out := make([]GHComponent, 0)
	sc := bufio.NewScanner(strings.NewReader(content))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		name, ver, _ := strings.Cut(line, "==")
		out = append(out, GHComponent{Name: strings.TrimSpace(name), Version: strings.TrimSpace(ver), Type: "pypi"})
	}
	return out
}

// knownAdvisories maps ecosystem:name:version to a published CVE. Only exact versions are flagged.
var knownAdvisories = map[string]string{
	"npm:lodash:4.17.20": "CVE-2021-23337",
	// CVE-2022-23529 (jsonwebtoken) is omitted: NVD rejected that identifier.
}

func scaAdvisories(filePath string, comps []GHComponent, demo bool) []GHFinding {
	out := make([]GHFinding, 0)
	for _, c := range comps {
		key := c.Type + ":" + c.Name + ":" + c.Version
		cve, ok := knownAdvisories[key]
		if !ok {
			continue
		}
		out = append(out, GHFinding{
			ID:          uuid.New().String(),
			FilePath:    filePath,
			LineNumber:  1,
			FindingType: "SCA",
			Algorithm:   c.Name,
			Severity:    "HIGH",
			Description: c.Name + "@" + c.Version + " matches published advisory " + cve,
			Remediation: "Upgrade " + c.Name + " to a patched release. Advisory is tied to this exact version.",
			OWASP:       "A06:2021 Vulnerable and Outdated Components",
			CWE:         "CWE-1035",
			CVE:         cve,
			Tool:        "rivicq-sca-overlay",
			Demo:        demo,
		})
	}
	return out
}

func complianceFor(f GHFinding) []string {
	switch f.FindingType {
	case "SECRET":
		return []string{"NIST 800-53 IA-5", "ISO 27001 A.9.4", "CRA Annex I"}
	case "WEAK_HASH", "WEAK_CIPHER", "CRYPTO_IMPORT", "PQC_LIBRARY", "WEAK_TLS":
		return []string{"NIST 800-57", "BSI TR-02102", "PQC migration"}
	case "IAC":
		return []string{"CIS", "NIST 800-53 AC-3", "NIS2 Art. 21"}
	case "CONTAINER":
		return []string{"CIS Docker", "NIST 800-53 CM-6"}
	case "SCA":
		return []string{"CRA Annex I", "NIST SSDF PO.3"}
	case "API":
		return []string{"OWASP API Security", "NIST 800-53 AC-3"}
	default:
		return nil
	}
}

// AnalyzeRepositoryFiles runs deterministic SAST/SCA/secret/CBOM/IaC analysis on real file contents.
func AnalyzeRepositoryFiles(repo string, files []RepoFile, demo bool) GHScanResult {
	findings := make([]GHFinding, 0)
	sbom := make([]GHComponent, 0)
	cbom := make([]GHComponent, 0)
	langs := map[string]int{}
	stages := []GHScanStage{
		{ID: "discovering", Label: "Discovering files", Status: "completed"},
		{ID: "languages", Label: "Detecting languages", Status: "completed"},
	}

	for _, file := range files {
		lang := languageOf(file.Path)
		if lang != "" {
			langs[lang]++
		}
		content := file.Content
		base := strings.ToLower(path.Base(file.Path))

		for _, rule := range cryptoRules {
			loc := rule.re.FindStringIndex(content)
			if loc == nil {
				continue
			}
			findings = append(findings, GHFinding{
				ID:          uuid.New().String(),
				FilePath:    file.Path,
				LineNumber:  lineOf(content, loc[0]),
				FindingType: rule.findingType,
				Algorithm:   rule.algorithm,
				KeyLength:   extractKeyLength(rule.algorithm, content),
				Severity:    rule.severity,
				Description: rule.algorithm + " usage in " + file.Path,
				Remediation: rule.remediation,
				QuantumSafe: rule.quantumSafe,
				OWASP:       rule.owasp,
				CWE:         rule.cwe,
				Evidence:    maskSecret(strings.TrimSpace(content[loc[0]:min(loc[1]+40, len(content))])),
				Tool:        "rivicq-content-analyzer",
				Demo:        demo,
			})
			cbom = append(cbom, GHComponent{Name: rule.algorithm, Type: "algorithm", Demo: demo})
		}

		for _, rule := range secretRules {
			loc := rule.re.FindStringIndex(content)
			if loc == nil {
				continue
			}
			match := content[loc[0]:loc[1]]
			if isPlaceholderSecret(match) {
				continue
			}
			findings = append(findings, GHFinding{
				ID:          uuid.New().String(),
				FilePath:    file.Path,
				LineNumber:  lineOf(content, loc[0]),
				FindingType: "SECRET",
				Algorithm:   rule.kind,
				Severity:    rule.severity,
				Description: "Possible " + rule.kind + " in " + file.Path,
				Remediation: rule.remediation,
				QuantumSafe: true,
				OWASP:       "A07:2021 Identification and Authentication Failures",
				CWE:         "CWE-798",
				Evidence:    maskSecret(match),
				Tool:        "rivicq-secret-detector",
				Demo:        demo,
			})
		}

		if base == "package.json" {
			deps := parseNPMDependencies(content)
			sbom = append(sbom, deps...)
			findings = append(findings, scaAdvisories(file.Path, deps, demo)...)
			stages = appendStage(stages, "sca", "Running SCA")
		}
		if base == "go.mod" {
			sbom = append(sbom, parseGoMod(content)...)
			stages = appendStage(stages, "sca", "Running SCA")
		}
		if base == "requirements.txt" {
			sbom = append(sbom, parseRequirements(content)...)
			stages = appendStage(stages, "sca", "Running SCA")
		}

		if base == "dockerfile" {
			if strings.Contains(content, "USER root") {
				findings = append(findings, GHFinding{
					ID: uuid.New().String(), FilePath: file.Path, LineNumber: lineOf(content, strings.Index(content, "USER root")),
					FindingType: "CONTAINER", Algorithm: "docker", Severity: "HIGH",
					Description: "Container runs as root", Remediation: "Add a non-root USER instruction.",
					OWASP: "A05:2021 Security Misconfiguration", CWE: "CWE-250", Tool: "rivicq-docker-analyzer", Demo: demo,
				})
			}
			if strings.Contains(content, "EXPOSE 22") {
				findings = append(findings, GHFinding{
					ID: uuid.New().String(), FilePath: file.Path, LineNumber: lineOf(content, strings.Index(content, "EXPOSE 22")),
					FindingType: "CONTAINER", Algorithm: "docker", Severity: "MEDIUM",
					Description: "Dockerfile exposes SSH port 22", Remediation: "Do not expose SSH from application images.",
					OWASP: "A05:2021 Security Misconfiguration", CWE: "CWE-668", Tool: "rivicq-docker-analyzer", Demo: demo,
				})
			}
			stages = appendStage(stages, "container", "Analyzing containers")
		}

		if strings.HasSuffix(base, ".tf") || strings.Contains(file.Path, "terraform") {
			if strings.Contains(content, "0.0.0.0/0") {
				findings = append(findings, GHFinding{
					ID: uuid.New().String(), FilePath: file.Path, LineNumber: lineOf(content, strings.Index(content, "0.0.0.0/0")),
					FindingType: "IAC", Algorithm: "terraform", Severity: "HIGH",
					Description: "Security group allows 0.0.0.0/0", Remediation: "Restrict CIDR to known networks.",
					OWASP: "A01:2021 Broken Access Control", CWE: "CWE-284", Tool: "rivicq-iac-analyzer", Demo: demo,
				})
			}
			if strings.Contains(content, "public-read") {
				findings = append(findings, GHFinding{
					ID: uuid.New().String(), FilePath: file.Path, LineNumber: lineOf(content, strings.Index(content, "public-read")),
					FindingType: "IAC", Algorithm: "terraform", Severity: "CRITICAL",
					Description: "Object storage ACL is public-read", Remediation: "Use private ACLs and bucket policies.",
					OWASP: "A01:2021 Broken Access Control", CWE: "CWE-732", Tool: "rivicq-iac-analyzer", Demo: demo,
				})
			}
			stages = appendStage(stages, "iac", "Analyzing IaC")
		}

		if strings.Contains(base, "openapi") || strings.Contains(base, "swagger") {
			findings = append(findings, GHFinding{
				ID: uuid.New().String(), FilePath: file.Path, LineNumber: 1,
				FindingType: "API", Algorithm: "openapi", Severity: "INFO",
				Description: "OpenAPI/Swagger specification discovered",
				Remediation: "Review operations against OWASP API Security Top 10; this is discovery, not a complete API test.",
				OWASP:       "API1:2023 Broken Object Level Authorization",
				CWE:         "CWE-285",
				Tool:        "rivicq-api-analyzer",
				Demo:        demo,
			})
			if !strings.Contains(content, "securitySchemes") && !strings.Contains(content, "security:") {
				findings = append(findings, GHFinding{
					ID: uuid.New().String(), FilePath: file.Path, LineNumber: 1,
					FindingType: "API", Algorithm: "openapi", Severity: "HIGH",
					Description: "API specification does not declare security schemes",
					Remediation: "Define securitySchemes (OAuth2, OIDC, or mTLS) and apply them to operations.",
					OWASP:       "API2:2023 Broken Authentication",
					CWE:         "CWE-306",
					Tool:        "rivicq-api-analyzer",
					Demo:        demo,
				})
			}
			stages = appendStage(stages, "api", "Analyzing APIs")
		}
	}

	stages = appendStage(stages, "sast", "Running SAST")
	stages = appendStage(stages, "secrets", "Detecting secrets")
	stages = appendStage(stages, "sbom", "Generating SBOM")
	stages = appendStage(stages, "cbom", "Generating CBOM")
	stages = appendStage(stages, "pqc", "Calculating PQC readiness")
	stages = appendStage(stages, "owasp", "Mapping OWASP")
	stages = appendStage(stages, "compliance", "Mapping compliance controls")
	stages = appendStage(stages, "completed", "Scan complete")

	for i := range findings {
		if len(findings[i].Compliance) == 0 {
			findings[i].Compliance = complianceFor(findings[i])
		}
	}

	langList := make([]string, 0, len(langs))
	for k := range langs {
		langList = append(langList, k)
	}

	result := GHScanResult{
		ScanID:         uuid.New().String(),
		Repo:           repo,
		Status:         "completed",
		CryptoFindings: findings,
		Summary:        summarizeFindings(findings),
		ScannedAt:      time.Now().UTC().Format(time.RFC3339),
		Stages:         stages,
		SBOM:           sbom,
		CBOM:           cbom,
		Languages:      langList,
		PQCReadiness:   pqcReadiness(findings),
		FileCount:      len(files),
		Demo:           demo,
	}
	return result
}

func appendStage(stages []GHScanStage, id, label string) []GHScanStage {
	for _, s := range stages {
		if s.ID == id {
			return stages
		}
	}
	return append(stages, GHScanStage{ID: id, Label: label, Status: "completed"})
}

func loadDemoRepoFiles() []RepoFile {
	files := make([]RepoFile, 0)
	_ = fs.WalkDir(demoRepoFS, "testdata/demo-repo", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		b, readErr := demoRepoFS.ReadFile(p)
		if readErr != nil {
			return nil
		}
		rel := strings.TrimPrefix(p, "testdata/demo-repo/")
		files = append(files, RepoFile{Path: rel, Content: string(b)})
		return nil
	})
	return files
}

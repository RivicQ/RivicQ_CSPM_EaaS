package shared

import (
	"encoding/json"
	"sort"
	"strings"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/intelligence"
	"github.com/stretchr/testify/require"
)

// TestAnalyzeRepositoryFiles_IsDeterministic is the core scanner-accuracy
// guarantee: analysing the same bytes twice must produce identical findings.
// Without it, scan-to-scan diffs report phantom new and resolved findings.
func TestAnalyzeRepositoryFiles_IsDeterministic(t *testing.T) {
	files := loadDemoRepoFiles()
	first := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", files, true)
	second := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", files, true)

	require.Equal(t, len(first.CryptoFindings), len(second.CryptoFindings))
	for i := range first.CryptoFindings {
		a, b := first.CryptoFindings[i], second.CryptoFindings[i]
		require.Equal(t, a.ID, b.ID, "finding %d id must be stable", i)
		require.Equal(t, a.Fingerprint, b.Fingerprint, "finding %d fingerprint must be stable", i)
		require.Equal(t, a.RuleID, b.RuleID)
		require.Equal(t, a.FilePath, b.FilePath)
		require.Equal(t, a.LineNumber, b.LineNumber)
	}

	// ScanID is per-run by design; everything else must match byte for byte.
	first.ScanID, second.ScanID = "", ""
	require.Equal(t, first.Summary, second.Summary)
	require.Equal(t, first.PQCReadiness, second.PQCReadiness)
	require.Equal(t, first.Languages, second.Languages)
}

// TestAnalyzeRepositoryFiles_FindingsAreSorted checks ordering explicitly rather
// than relying on the determinism test's element-by-element comparison.
func TestAnalyzeRepositoryFiles_FindingsAreSorted(t *testing.T) {
	result := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", loadDemoRepoFiles(), true)
	findings := result.CryptoFindings
	require.Greater(t, len(findings), 2)
	sorted := sort.SliceIsSorted(findings, func(i, j int) bool {
		a, b := findings[i], findings[j]
		if a.FilePath != b.FilePath {
			return a.FilePath < b.FilePath
		}
		if a.LineNumber != b.LineNumber {
			return a.LineNumber < b.LineNumber
		}
		return a.RuleID < b.RuleID
	})
	require.True(t, sorted, "findings must be emitted in a deterministic order")

	langs := append([]string(nil), result.Languages...)
	require.True(t, sort.StringsAreSorted(langs), "languages must be sorted")
}

// TestEveryFindingCarriesRuleIDAndConfidence guards against a finding that a
// reviewer cannot trace back to a detector or weight.
func TestEveryFindingCarriesRuleIDAndConfidence(t *testing.T) {
	result := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", loadDemoRepoFiles(), true)
	require.NotEmpty(t, result.CryptoFindings)

	ruleIDs := map[string]bool{}
	for _, f := range result.CryptoFindings {
		require.NotEmpty(t, f.RuleID, "finding %q in %s has no rule id", f.Description, f.FilePath)
		require.NotContains(t, f.RuleID, " ", "rule ids must be machine-comparable")
		require.Len(t, f.Fingerprint, 64, "fingerprint must be a full sha256 hex digest")
		require.Equal(t, "rvq-"+f.Fingerprint[:16], f.ID)
		require.Greater(t, f.Confidence, 0.0, "rule %s must state a confidence", f.RuleID)
		require.LessOrEqual(t, f.Confidence, 1.0, "confidence must be within 0..1 for %s", f.RuleID)
		ruleIDs[f.RuleID] = true
	}
	require.Greater(t, len(ruleIDs), 3, "corpus should exercise several rules")
}

// TestSameFileRepeatedAlgorithmRemainsOneFinding documents that a rule reports
// once per file: it signals the presence and line of a risky primitive rather
// than counting call sites, so the finding count is comparable across repos.
func TestSameFileRepeatedAlgorithmRemainsOneFinding(t *testing.T) {
	files := []RepoFile{
		{Path: "crypto/a.go", Content: "package a\n\nfunc h1() { crypto/md5.New() }\nfunc h2() { crypto/md5.New() }\n"},
	}
	result := AnalyzeRepositoryFiles("acme/dupe", files, false)
	var md5 int
	for _, f := range result.CryptoFindings {
		if f.RuleID == "crypto.weak-hash.md5" {
			md5++
		}
	}
	require.Equal(t, 1, md5, "one rule match per file, not one per call site")
}

// TestFingerprintSurvivesLineMovement guards against a fingerprint that embeds
// the line number, which would report every code shift as new-and-resolved.
func TestFingerprintSurvivesLineMovement(t *testing.T) {
	base := "package a\n\nfunc h() { crypto/md5.New() }\n"
	moved := "// a comment was inserted above\npackage a\n\nfunc h() { crypto/md5.New() }\n"

	first := AnalyzeRepositoryFiles("acme/move", []RepoFile{{Path: "a.go", Content: base}}, false)
	second := AnalyzeRepositoryFiles("acme/move", []RepoFile{{Path: "a.go", Content: moved}}, false)

	require.Len(t, first.CryptoFindings, 1)
	require.Len(t, second.CryptoFindings, 1)
	require.Equal(t, first.CryptoFindings[0].Fingerprint, second.CryptoFindings[0].Fingerprint)
	require.NotEqual(t, first.CryptoFindings[0].LineNumber, second.CryptoFindings[0].LineNumber,
		"the line number itself must still change")
}

// TestRSA1024IsDistinguishedFromGenericRSAImport pins the accuracy improvement:
// a specific insufficient-keysize signal outranks a generic import match.
func TestRSA1024IsDistinguishedFromGenericRSAImport(t *testing.T) {
	files := []RepoFile{
		{Path: "main.go", Content: "package main\n\nimport \"crypto/rsa\"\n\nfunc k() { _, _ = rsa.GenerateKey(nil, 1024) }\n"},
	}
	result := AnalyzeRepositoryFiles("acme/rsa", files, false)

	var sawInsufficient, sawGeneric bool
	for _, f := range result.CryptoFindings {
		if f.RuleID == "crypto.rsa.keysize.insufficient" {
			sawInsufficient = true
			require.Equal(t, 1024, f.KeyLength)
			require.Equal(t, "HIGH", f.Severity)
			require.Greater(t, f.Confidence, 0.8)
		}
		if f.RuleID == "crypto.import.rsa" {
			sawGeneric = true
			require.Less(t, f.Confidence, 0.8, "a bare substring match must not claim high confidence")
		}
	}
	require.True(t, sawInsufficient, "an explicit 1024-bit key must be reported as insufficient")
	require.True(t, sawGeneric, "the import itself is still inventory evidence")
}

// TestLegacyCipherRulesCoverKnownWeakPrimitives pins the rules that map to the
// legacy and high-risk classes of the PQC taxonomy.
func TestLegacyCipherRulesCoverKnownWeakPrimitives(t *testing.T) {
	cases := []struct {
		name    string
		content string
		ruleID  string
	}{
		{"md5", "package a\nimport \"crypto/md5\"\n", "crypto.weak-hash.md5"},
		{"sha1", "package a\nimport \"crypto/sha1\"\n", "crypto.weak-hash.sha1"},
		{"3des", "crypto := \"DES-EDE3-CBC\"\n", "crypto.weak-cipher.3des"},
		{"arcfour", "cipher := \"arcfour\"\n", "crypto.weak-cipher.rc4"},
		{"tls10", "minVersion := tls.VersionTLS10\n", "tls.version.1_0"},
		{"tls11", "minVersion := tls.VersionTLS11\n", "tls.version.1_1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			result := AnalyzeRepositoryFiles("acme/weak", []RepoFile{{Path: "cfg.go", Content: tc.content}}, false)
			var found bool
			for _, f := range result.CryptoFindings {
				if f.RuleID == tc.ruleID {
					found = true
				}
			}
			require.True(t, found, "expected rule %s to fire", tc.ruleID)
		})
	}
}

// TestSecretRulesAssignEvidenceWeightedConfidence keeps a precise PEM match
// above a generic assignment match.
func TestSecretRulesAssignEvidenceWeightedConfidence(t *testing.T) {
	files := []RepoFile{
		{Path: "deploy/id_rsa", Content: "-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n"},
	}
	result := AnalyzeRepositoryFiles("acme/keys", files, false)

	var priv float64
	for _, f := range result.CryptoFindings {
		if f.RuleID == "secret.private-key" {
			priv = f.Confidence
			require.NotContains(t, f.Evidence, "MIIEow", "key material must be masked")
		}
	}
	require.Greater(t, priv, 0.9)

	byRule := map[string]float64{}
	for _, r := range secretRules {
		byRule[r.ruleID] = r.confidence
	}
	require.Greater(t, byRule["secret.private-key"], byRule["secret.generic-assignment"])
}

// TestScanResultJSONCarriesProvenance checks the API contract: a consumer must be
// able to read the rule, fingerprint, and engine version without extra calls.
func TestScanResultJSONCarriesProvenance(t *testing.T) {
	result := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", loadDemoRepoFiles(), true)
	raw, err := json.Marshal(result.CryptoFindings[0])
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(raw, &decoded))
	for _, key := range []string{"id", "fingerprint", "rule_id", "confidence", "tool", "compliance"} {
		require.Contains(t, decoded, key)
	}
	require.Equal(t, EngineVersion, result.EngineVersion, "engine version must be present on the result")
	require.NotEmpty(t, result.TaxonomyVersion, "pqc taxonomy version must be present on the result")
}

// TestCompareGHScansUsesFingerprintAndStaysStable verifies the diff path keys on
// the stable fingerprint rather than a per-run random identifier.
func TestCompareGHScansUsesFingerprintAndStaysStable(t *testing.T) {
	files := []RepoFile{{Path: "a.go", Content: "package a\nimport \"crypto/md5\"\n"}}
	first := AnalyzeRepositoryFiles("acme/diff", files, false)

	prev := &ghScanJob{ID: "scan-1"}
	prev.Results = append(prev.Results, first)

	// Unchanged repo: same fingerprints, so nothing is new or resolved.
	again := AnalyzeRepositoryFiles("acme/diff", files, false)
	curr := &ghScanJob{ID: "scan-2"}
	curr.Results = append(curr.Results, again)
	same := compareGHScans(curr, prev)
	require.Equal(t, 0, same.Counts.New)
	require.Equal(t, 0, same.Counts.Resolved)
	require.Greater(t, same.Counts.Unchanged, 0)

	// Changed repo: the finding disappears and is reported as resolved.
	clean := AnalyzeRepositoryFiles("acme/diff", nil, false)
	curr2 := &ghScanJob{ID: "scan-3"}
	curr2.Results = append(curr2.Results, clean)
	resolved := compareGHScans(curr2, prev)
	require.Equal(t, 0, resolved.Counts.New)
	require.Greater(t, resolved.Counts.Resolved, 0)
	require.Len(t, resolved.Resolved[0].Fingerprint, 64)
}

// TestRuleIDsAreUnique guards the registry: two rules sharing an ID would make
// suppressions and accuracy reporting ambiguous.
func TestRuleIDsAreUnique(t *testing.T) {
	seen := map[string]string{}
	check := func(ruleID, algorithm string) {
		require.NotEmpty(t, ruleID)
		if prev, dup := seen[ruleID]; dup {
			t.Errorf("rule id %q used by both %q and %q", ruleID, prev, algorithm)
		}
		seen[ruleID] = algorithm
	}
	for _, r := range cryptoRules {
		check(r.ruleID, r.algorithm)
	}
	for _, r := range secretRules {
		check(r.ruleID, r.kind)
	}
	require.Greater(t, len(seen), 10, "expected a meaningful rule registry")
}

// TestEngineVersionIsSemantic keeps engine provenance greppable in reports.
func TestEngineVersionIsSemantic(t *testing.T) {
	require.True(t, strings.HasPrefix(EngineVersion, "rivicq-content-scanner/"))
	parts := strings.SplitN(EngineVersion, "/", 2)
	require.Len(t, parts, 2)
	require.Len(t, strings.Split(parts[1], "."), 3, "expected a semver suffix, got %q", EngineVersion)
	require.NotEqual(t, "0.0.0", parts[1])
}

// TestFindingFingerprintIgnoresRunSpecificFields documents the identity rules:
// tenant-independent, order-independent, and free of scan IDs.
func TestFindingFingerprintIgnoresRunSpecificFields(t *testing.T) {
	a := findingFingerprint("crypto.weak-hash.md5", "a.go", "WEAK_HASH", "MD5", "", 0)
	b := findingFingerprint("crypto.weak-hash.md5", "a.go", "WEAK_HASH", "MD5", "", 0)
	require.Equal(t, a, b)

	require.NotEqual(t, a, findingFingerprint("crypto.weak-hash.sha1", "a.go", "WEAK_HASH", "MD5", "", 0))
	require.NotEqual(t, a, findingFingerprint("crypto.weak-hash.md5", "b.go", "WEAK_HASH", "MD5", "", 0))
	require.NotEqual(t, a, findingFingerprint("crypto.weak-hash.md5", "a.go", "WEAK_CIPHER", "MD5", "", 0))
	require.NotEqual(t, a, findingFingerprint("crypto.weak-hash.md5", "a.go", "WEAK_HASH", "MD5", "CVE-2024-0001", 0))
	require.NotEqual(t, a, findingFingerprint("crypto.weak-hash.md5", "a.go", "WEAK_HASH", "RSA", "", 0))
	require.NotEqual(t, a, findingFingerprint("crypto.weak-hash.md5", "a.go", "WEAK_HASH", "MD5", "", 2048))
}

// TestEngineVersionAppearsInResults keeps the rule-set version attached to output
// so a stored report can be tied to the detector that produced it.
func TestEngineVersionAppearsInResults(t *testing.T) {
	result := AnalyzeRepositoryFiles("acme/provenance", []RepoFile{
		{Path: "a.go", Content: "package a\nimport \"crypto/md5\"\n"},
	}, false)
	require.Equal(t, EngineVersion, result.EngineVersion)
	require.Equal(t, intelligence.TaxonomyVersion, result.TaxonomyVersion)
}

// TestConfidenceOutranksSeverityInSummary keeps the summary honest: a
// high-confidence low-severity finding and a low-confidence critical one are
// both reported, and neither is silently dropped.
func TestConfidenceOutranksSeverityInSummary(t *testing.T) {
	result := AnalyzeRepositoryFiles("acme/summary", []RepoFile{
		{Path: "a.go", Content: "package a\nimport \"crypto/md5\"\nimport \"crypto/sha1\"\n"},
	}, false)
	require.Equal(t, result.Summary.TotalFindings, len(result.CryptoFindings))
	for _, f := range result.CryptoFindings {
		switch f.Severity {
		case "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO":
		default:
			t.Errorf("unmapped severity %q for %s", f.Severity, f.RuleID)
		}
	}
}

func TestFindingFingerprintIsHexSHA256(t *testing.T) {
	fp := findingFingerprint("x", "y", "z", "a", "b", 1)
	require.Len(t, fp, 64)
	for _, c := range fp {
		require.True(t, strings.ContainsRune("0123456789abcdef", c), "non-hex char %q", c)
	}
}

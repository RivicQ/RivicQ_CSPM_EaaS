package intelligence

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// ScannerVersion is the intelligence engine identifier stamped on findings.
// Bump when detection rules change in a way that should invalidate fingerprints.
const ScannerVersion = "rivicq-intelligence/1.0.0"

// FingerprintKey is the canonical, tenant-independent identity of a finding.
// Repeated scans of the same evidence produce the same fingerprint.
func FingerprintKey(f Finding) string {
	return strings.Join([]string{
		strings.ToLower(strings.TrimSpace(f.Scanner)),
		strings.ToLower(strings.TrimSpace(f.RuleID)),
		strings.ToUpper(strings.TrimSpace(f.Algorithm)),
		fmt.Sprintf("%d", f.KeyLength),
		strings.TrimSpace(f.Location),
		fmt.Sprintf("%d", f.Line),
		strings.ToUpper(strings.TrimSpace(f.CVE)),
		strings.TrimSpace(f.Component),
		compactEvidence(f.Evidence),
	}, "|")
}

func Fingerprint(f Finding) string {
	sum := sha256.Sum256([]byte(FingerprintKey(f)))
	return hex.EncodeToString(sum[:])
}

func compactEvidence(s string) string {
	s = strings.Join(strings.Fields(strings.ToLower(s)), " ")
	if len(s) > 160 {
		s = s[:160]
	}
	return s
}

func ruleIDFor(f Finding) string {
	if f.RuleID != "" {
		return f.RuleID
	}
	algo := strings.ToUpper(strings.TrimSpace(f.Algorithm + " " + f.Evidence + " " + f.Title))
	switch {
	case strings.Contains(algo, "MD5"):
		return "crypto.md5"
	case strings.Contains(algo, "SHA-1") || strings.Contains(algo, "SHA1"):
		return "crypto.sha1"
	case strings.Contains(algo, "RC4"):
		return "crypto.rc4"
	case strings.Contains(algo, "3DES") || (strings.Contains(algo, "DES") && !strings.Contains(algo, "AES")):
		return "crypto.3des"
	case strings.Contains(algo, "TLS 1.0") || strings.Contains(algo, "TLS1.0"):
		return "tls.version.1_0"
	case strings.Contains(algo, "TLS 1.1") || strings.Contains(algo, "TLS1.1"):
		return "tls.version.1_1"
	case strings.Contains(algo, "RSA"):
		return "crypto.rsa"
	case strings.Contains(algo, "ECDSA"):
		return "crypto.ecdsa"
	case strings.Contains(algo, "ECDH"):
		return "crypto.ecdh"
	case strings.Contains(algo, "AES"):
		return "crypto.aes"
	case f.CVE != "":
		return "cve." + strings.ToLower(f.CVE)
	case f.Scanner != "":
		return "scanner." + strings.ToLower(f.Scanner)
	default:
		return "crypto.unclassified"
	}
}

// FinalizeFinding stamps fingerprint, rule, PQC class, and stable ID.
// Detection IDs from scanners (UUIDs) are kept in labels.instance_id.
func FinalizeFinding(f Finding) Finding {
	f.ScannerVersion = ScannerVersion
	f.RuleID = ruleIDFor(f)
	if f.Labels == nil {
		f.Labels = map[string]string{}
	}
	if f.ID != "" && !strings.HasPrefix(f.ID, "rvq-") {
		f.Labels["instance_id"] = f.ID
	}
	fp := Fingerprint(f)
	f.Fingerprint = fp
	f.ID = "rvq-" + fp[:16]
	f.PQCClass = ClassifyPQC(f)
	if f.RecommendedAction == "" {
		f.RecommendedAction = pqcRecommendedAction(f.PQCClass)
	}
	f.Risk.RecommendedAction = f.RecommendedAction
	now := time.Now().UTC()
	if f.CreatedAt.IsZero() {
		f.CreatedAt = now
	}
	if f.UpdatedAt.IsZero() {
		f.UpdatedAt = f.CreatedAt
	}
	if f.FirstSeen.IsZero() {
		f.FirstSeen = f.CreatedAt
	}
	if f.LastSeen.IsZero() {
		f.LastSeen = f.UpdatedAt
	}
	if f.Status == "" {
		f.Status = "open"
	}
	return f
}

// DedupFindings merges findings that share a fingerprint so repeated scans
// do not emit uncontrolled duplicates. Highest severity and latest last_seen win.
func DedupFindings(in []Finding) []Finding {
	if len(in) == 0 {
		return in
	}
	order := make([]string, 0, len(in))
	byFP := make(map[string]Finding, len(in))
	for _, f := range in {
		f = FinalizeFinding(f)
		prev, ok := byFP[f.Fingerprint]
		if !ok {
			byFP[f.Fingerprint] = f
			order = append(order, f.Fingerprint)
			continue
		}
		if f.FirstSeen.Before(prev.FirstSeen) {
			prev.FirstSeen = f.FirstSeen
			prev.CreatedAt = f.FirstSeen
		}
		if f.LastSeen.After(prev.LastSeen) {
			prev.LastSeen = f.LastSeen
			prev.UpdatedAt = f.LastSeen
		}
		if severityRank(f.Severity) > severityRank(prev.Severity) {
			prev.Severity = f.Severity
			prev.Risk = f.Risk
			prev.RiskScore = f.RiskScore
		}
		if f.KEV {
			prev.KEV = true
		}
		byFP[f.Fingerprint] = prev
	}
	out := make([]Finding, 0, len(order))
	for _, fp := range order {
		out = append(out, byFP[fp])
	}
	return out
}

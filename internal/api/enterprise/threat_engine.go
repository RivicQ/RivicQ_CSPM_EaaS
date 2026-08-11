package enterprise

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/database"
)

// enterpriseDefaultTenant is used as a fallback when the request does not
// carry a tenant (JWT claim or X-Tenant-ID header). It matches the default
// tenant seeded by the shared handlers.
const enterpriseDefaultTenant = "00000000-0000-0000-0000-000000000001"

// quantumVulnerableAlgorithms maps well-known public-key / hash algorithms to
// their post-quantum risk posture.
var quantumVulnerableAlgorithms = map[string]bool{
	"RSA": true, "RSA-1024": true, "RSA-2048": true, "RSA-3072": true, "RSA-4096": true,
	"DSA": true, "ECDSA": true, "ECDSA-P256": true, "ECDSA-P384": true, "ECDSA-P521": true,
	"ECDH": true, "DH": true, "Diffie-Hellman": true, "ElGamal": true,
	"SHA-1": true, "SHA1": true, "MD5": true, "MD4": true,
	"Triple DES": true, "3DES": true, "DES": true,
}

// quantumSafeAlgorithms are families that are either symmetric (fine for
// Grover's algorithm with adequate key size) or already PQC-ready.
var quantumSafeAlgorithms = map[string]bool{
	"AES": true, "AES-128": true, "AES-192": true, "AES-256": true, "AES-256-GCM": true,
	"ChaCha20": true, "ChaCha20-Poly1305": true, "Blake2": true, "Blake2b": true, "Blake3": true,
	"SHA-256": true, "SHA-384": true, "SHA-512": true, "SHA-224": true, "SHA-3": true,
	"ML-KEM-768": true, "ML-KEM-1024": true, "ML-DSA-65": true, "ML-DSA-87": true,
	"SLH-DSA": true, "X25519": true, "X448": true, "Ed25519": true, "Ed448": true,
	"HMAC": true, "PBKDF2": true, "Argon2": true, "scrypt": true, "bcrypt": true,
}

func classifyAlgorithm(algorithm string) (vulnerable, safe bool) {
	vulnerable = quantumVulnerableAlgorithms[algorithm]
	safe = quantumSafeAlgorithms[algorithm]
	return
}

// ThreatDetection is a single detected threat derived from real inventory data.
type ThreatDetection struct {
	ID             string    `json:"id"`
	Type           string    `json:"type"`
	Severity       string    `json:"severity"`
	Confidence     float64   `json:"confidence"`
	Source         string    `json:"source"`
	Description    string    `json:"description"`
	AffectedAssets []string  `json:"affected_assets"`
	Recommendation string    `json:"recommendation"`
	DetectedAt     time.Time `json:"detected_at"`
}

// ThreatAnalysis is the result of a full ML threat-detection pass.
type ThreatAnalysis struct {
	Threats           []ThreatDetection `json:"threats"`
	AlgorithmStats    []algorithmStat   `json:"algorithm_stats"`
	TotalThreats      int               `json:"total_threats"`
	Critical          int               `json:"critical"`
	High              int               `json:"high"`
	Medium            int               `json:"medium"`
	Low               int               `json:"low"`
	QuantumRiskScore  float64           `json:"quantum_risk_score"`
	QuantumSafeAssets int               `json:"quantum_safe_assets"`
	VulnerableAssets  int               `json:"vulnerable_assets"`
	TotalAssets       int               `json:"total_assets"`
	PQCReadiness      float64           `json:"pqc_readiness"`
	GeneratedAt       time.Time         `json:"generated_at"`
	Source            string            `json:"source"`
}

// algorithmStat aggregates usage and risk for a single algorithm family.
type algorithmStat struct {
	Algorithm      string `json:"algorithm"`
	Usage          int    `json:"usage"`
	Vulnerability  int    `json:"vulnerability_score"`
	QuantumSafe    bool   `json:"quantum_safe"`
	Vulnerable     bool   `json:"quantum_vulnerable"`
	RiskLevel      string `json:"risk_level"`
	Migration      string `json:"migration"`
	SampleLocation string `json:"sample_location,omitempty"`
}

func riskLevelFor(vulnScore int, quantumSafe, vulnerable bool) string {
	if quantumSafe && !vulnerable {
		return "low"
	}
	switch {
	case vulnScore >= 80:
		return "critical"
	case vulnScore >= 60:
		return "high"
	case vulnScore >= 40:
		return "medium"
	default:
		return "low"
	}
}

func migrationFor(riskLevel string) string {
	switch riskLevel {
	case "critical", "high":
		return "migrate"
	case "medium":
		return "plan"
	default:
		return "monitored"
	}
}

// cryptoAssetRow is a denormalised projection of crypto_assets for the engine.
type cryptoAssetRow struct {
	ID            string
	CBOMReportID  string
	ReportName    string
	Algorithm     string
	KeySize       int
	Usage         string
	Location      string
	Vulnerability int
	QuantumSafe   bool
}

func (r cryptoAssetRow) AlgorithmKey() string {
	key := r.Algorithm
	if r.KeySize > 0 {
		switch r.Algorithm {
		case "RSA", "DSA", "DH", "ECDH":
			key = fmt.Sprintf("%s-%d", r.Algorithm, r.KeySize)
		}
	}
	return key
}

// sqlQuerier is the narrow interface the engine needs, satisfied by
// *database.DB (which embeds *sql.DB) and *sql.DB.
type sqlQuerier interface {
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
}

func assetsForDB(db *database.DB) sqlQuerier {
	if db == nil {
		return nil
	}
	return db.DB
}

func queryCryptoAssets(ctx context.Context, q sqlQuerier, tenantID string) ([]cryptoAssetRow, error) {
	if q == nil {
		return nil, nil
	}
	rows, err := q.QueryContext(ctx, `
		SELECT ca.id, ca.cbom_report_id, cr.name, ca.algorithm, ca.key_size, ca.usage,
		       ca.location, ca.vulnerability_score, ca.quantum_safe
		FROM crypto_assets ca
		JOIN cbom_reports cr ON ca.cbom_report_id = cr.id
		WHERE cr.tenant_id = $1
		ORDER BY ca.created_at DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []cryptoAssetRow
	for rows.Next() {
		var r cryptoAssetRow
		var keySize sql.NullInt64
		var location sql.NullString
		if err := rows.Scan(&r.ID, &r.CBOMReportID, &r.ReportName, &r.Algorithm,
			&keySize, &r.Usage, &location, &r.Vulnerability, &r.QuantumSafe); err != nil {
			return nil, err
		}
		if keySize.Valid {
			r.KeySize = int(keySize.Int64)
		}
		if location.Valid {
			r.Location = location.String
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// analyzeThreats runs the detection engine against real inventory data. When
// the database is unavailable (demo mode) it returns an empty analysis rather
// than fabricated findings.
func analyzeThreats(ctx context.Context, db *database.DB, tenantID string) (*ThreatAnalysis, error) {
	assets, err := queryCryptoAssets(ctx, assetsForDB(db), tenantID)
	if err != nil {
		return nil, err
	}

	analysis := &ThreatAnalysis{
		GeneratedAt: time.Now().UTC(),
		Source:      "live",
	}
	if db == nil {
		analysis.Source = "demo"
		return analysis, nil
	}

	stats := aggregateByAlgorithm(assets)
	analysis.AlgorithmStats = stats
	analysis.TotalAssets = len(assets)
	analysis.QuantumSafeAssets = countQuantumSafe(assets)
	analysis.VulnerableAssets = analysis.TotalAssets - analysis.QuantumSafeAssets
	if analysis.TotalAssets > 0 {
		analysis.QuantumRiskScore = float64(analysis.VulnerableAssets) / float64(analysis.TotalAssets)
		analysis.PQCReadiness = float64(analysis.QuantumSafeAssets) / float64(analysis.TotalAssets) * 100
	}

	threats := buildThreats(stats, assets)
	analysis.Threats = threats
	analysis.TotalThreats = len(threats)
	for _, t := range threats {
		switch t.Severity {
		case "critical":
			analysis.Critical++
		case "high":
			analysis.High++
		case "medium":
			analysis.Medium++
		case "low":
			analysis.Low++
		}
	}
	return analysis, nil
}

func aggregateByAlgorithm(assets []cryptoAssetRow) []algorithmStat {
	groups := make(map[string]*algorithmStat)
	var order []string
	for _, a := range assets {
		key := a.AlgorithmKey()
		st, ok := groups[key]
		if !ok {
			vulnerable, safe := classifyAlgorithm(key)
			st = &algorithmStat{
				Algorithm:   key,
				QuantumSafe: safe,
				Vulnerable:  vulnerable,
			}
			groups[key] = st
			order = append(order, key)
		}
		st.Usage++
		if a.Vulnerability > st.Vulnerability {
			st.Vulnerability = a.Vulnerability
		}
		if st.SampleLocation == "" && a.Location != "" {
			st.SampleLocation = a.Location
		}
	}

	stats := make([]algorithmStat, 0, len(order))
	for _, key := range order {
		st := groups[key]
		st.RiskLevel = riskLevelFor(st.Vulnerability, st.QuantumSafe, st.Vulnerable)
		st.Migration = migrationFor(st.RiskLevel)
		stats = append(stats, *st)
	}
	rank := map[string]int{"critical": 4, "high": 3, "medium": 2, "low": 1}
	sort.Slice(stats, func(i, j int) bool {
		if rank[stats[i].RiskLevel] != rank[stats[j].RiskLevel] {
			return rank[stats[i].RiskLevel] > rank[stats[j].RiskLevel]
		}
		return stats[i].Usage > stats[j].Usage
	})
	return stats
}

func countQuantumSafe(assets []cryptoAssetRow) int {
	n := 0
	for _, a := range assets {
		if a.QuantumSafe {
			n++
		}
	}
	return n
}

func buildThreats(stats []algorithmStat, assets []cryptoAssetRow) []ThreatDetection {
	var threats []ThreatDetection
	now := time.Now().UTC()

	for _, st := range stats {
		if st.QuantumSafe && !st.Vulnerable {
			continue
		}
		affected := make([]string, 0, st.Usage)
		for _, a := range assets {
			if len(affected) >= 5 {
				break
			}
			if a.AlgorithmKey() == st.Algorithm {
				affected = append(affected, a.ID)
			}
		}

		confidence := 0.6 + float64(st.Usage)*0.02
		if confidence > 0.95 {
			confidence = 0.95
		}

		var tType, recommendation string
		switch st.RiskLevel {
		case "critical":
			tType = "critical_quantum_vulnerability"
			recommendation = "Immediately migrate " + st.Algorithm + " to a NIST PQC algorithm (ML-KEM / ML-DSA)."
		case "high":
			tType = "quantum_vulnerability"
			recommendation = "Prioritize migration of " + st.Algorithm + "; schedule ML-KEM/ML-DSA adoption in the current quarter."
		case "medium":
			tType = "quantum_transition_risk"
			recommendation = "Plan a hybrid (classic + PQC) transition for " + st.Algorithm + "."
		default:
			tType = "weak_crypto_usage"
			recommendation = "Replace " + st.Algorithm + " usage with a quantum-safe or key-strengthened alternative."
		}

		threats = append(threats, ThreatDetection{
			ID:             fmt.Sprintf("threat-%s-%d", slugify(st.Algorithm), now.Unix()),
			Type:           tType,
			Severity:       st.RiskLevel,
			Confidence:     confidence,
			Source:         "ml-threat-engine",
			Description: fmt.Sprintf(
				"%d asset(s) rely on %s which is not quantum-safe (vulnerability score %d).",
				st.Usage, st.Algorithm, st.Vulnerability),
			AffectedAssets: affected,
			Recommendation: recommendation,
			DetectedAt:     now,
		})
	}
	return threats
}

func slugify(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'):
			if ch >= 'A' && ch <= 'Z' {
				ch += 32
			}
			out = append(out, ch)
		case ch == ' ', ch == '-', ch == '.':
			out = append(out, '-')
		}
	}
	return string(out)
}

// persistThreatEvents inserts the detected high/critical threats as security
// events so they show up in the real events feed. Duplicate findings for the
// same algorithm are skipped.
func persistThreatEvents(db *database.DB, analysis *ThreatAnalysis, tenantID string) error {
	if db == nil || db.Queries == nil {
		return nil
	}
	for _, t := range analysis.Threats {
		if t.Severity != "critical" && t.Severity != "high" {
			continue
		}
		exists, err := eventExistsForSource(db, tenantID, t.Source, t.ID)
		if err != nil || exists {
			continue
		}
		metadata, _ := json.Marshal(map[string]interface{}{
			"threat_id":       t.ID,
			"confidence":      t.Confidence,
			"recommendation":  t.Recommendation,
			"affected_assets": t.AffectedAssets,
			"generated_at":    t.DetectedAt,
		})
		event := &database.SecurityEvent{
			TenantID:    tenantID,
			EventType:   t.Type,
			Severity:    t.Severity,
			Source:      t.Source,
			Description: t.Description,
			Metadata:    string(metadata),
			Resolved:    false,
		}
		if err := db.Queries.CreateSecurityEvent(event); err != nil {
			return err
		}
	}
	return nil
}

func eventExistsForSource(db *database.DB, tenantID, source, threatID string) (bool, error) {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM security_events
		WHERE tenant_id = $1 AND source = $2 AND metadata::text LIKE $3
	`, tenantID, source, "%"+threatID+"%").Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// quantumMetrics computes real quantum posture metrics from inventory data.
type quantumMetrics struct {
	QuantumSafeAssets  int     `json:"quantum_safe_assets"`
	QuantumVulnerable  int     `json:"quantum_vulnerable"`
	IBMQAttestations   int     `json:"ibmq_attestations"`
	QuantumRiskScore   float64 `json:"quantum_risk_score"`
	PQCReadinessPct    float64 `json:"pqc_readiness_pct"`
	AtRiskData         int     `json:"at_risk_data"`
	OutdatedAlgorithms int     `json:"outdated_algorithms"`
	TotalAssets        int     `json:"total_assets"`
}

func computeQuantumMetrics(ctx context.Context, db *database.DB, tenantID string) (*quantumMetrics, error) {
	analysis, err := analyzeThreats(ctx, db, tenantID)
	if err != nil {
		return nil, err
	}
	metrics := &quantumMetrics{
		QuantumSafeAssets:    analysis.QuantumSafeAssets,
		QuantumVulnerable:    analysis.VulnerableAssets,
		IBMQAttestations:     countAttestations(db, tenantID),
		QuantumRiskScore:     analysis.QuantumRiskScore,
		PQCReadinessPct:      analysis.PQCReadiness,
		TotalAssets:          analysis.TotalAssets,
		AtRiskData:           analysis.VulnerableAssets,
		OutdatedAlgorithms:   len(analysis.AlgorithmStats),
	}
	return metrics, nil
}

func countAttestations(db *database.DB, tenantID string) int {
	if db == nil {
		return 0
	}
	var n int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM quantum_attestations qa
		JOIN cbom_reports cr ON qa.cbom_report_id = cr.id
		WHERE cr.tenant_id = $1
	`, tenantID).Scan(&n)
	if err != nil {
		return 0
	}
	return n
}

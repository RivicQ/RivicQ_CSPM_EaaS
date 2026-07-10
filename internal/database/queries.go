package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Query interface for database operations
type Queries struct {
	db *sql.DB
}

// CBOM Report data structures
type CBOMReport struct {
	ID           string    `json:"id" db:"id"`
	TenantID     string    `json:"tenant_id" db:"tenant_id"`
	Name         string    `json:"name" db:"name"`
	Version      string    `json:"version" db:"version"`
	CycloneDXBOM string    `json:"cyclonedx_bom" db:"cyclonedx_bom"`
	Metadata     string    `json:"metadata" db:"metadata"`
	Status       string    `json:"status" db:"status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// CryptoAsset data structures
type CryptoAsset struct {
	ID                 string    `json:"id" db:"id"`
	CBOMReportID       string    `json:"cbom_report_id" db:"cbom_report_id"`
	Algorithm          string    `json:"algorithm" db:"algorithm"`
	KeySize            int       `json:"key_size" db:"key_size"`
	Usage              string    `json:"usage" db:"usage"`
	Location           string    `json:"location" db:"location"`
	VulnerabilityScore int       `json:"vulnerability_score" db:"vulnerability_score"`
	QuantumSafe        bool      `json:"quantum_safe" db:"quantum_safe"`
	Metadata           string    `json:"metadata" db:"metadata"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

// QuantumAttestation data structures
type QuantumAttestation struct {
	ID              string     `json:"id" db:"id"`
	CBOMReportID    string     `json:"cbom_report_id" db:"cbom_report_id"`
	AttestationType string     `json:"attestation_type" db:"attestation_type"`
	QuantumNetwork  string     `json:"quantum_network" db:"quantum_network"`
	Status          string     `json:"status" db:"status"`
	Result          string     `json:"result" db:"result"`
	AttestedAt      *time.Time `json:"attested_at" db:"attested_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// SecurityEvent data structures
type SecurityEvent struct {
	ID          string    `json:"id" db:"id"`
	TenantID    string    `json:"tenant_id" db:"tenant_id"`
	EventType   string    `json:"event_type" db:"event_type"`
	Severity    string    `json:"severity" db:"severity"`
	Source      string    `json:"source" db:"source"`
	Description string    `json:"description" db:"description"`
	Metadata    string    `json:"metadata" db:"metadata"`
	Resolved    bool      `json:"resolved" db:"resolved"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// KubernetesCluster data structures
type KubernetesCluster struct {
	ID        string    `json:"id" db:"id"`
	TenantID  string    `json:"tenant_id" db:"tenant_id"`
	Name      string    `json:"name" db:"name"`
	Endpoint  string    `json:"endpoint" db:"endpoint"`
	Version   string    `json:"version" db:"version"`
	Platform  string    `json:"platform" db:"platform"`
	Region    string    `json:"region" db:"region"`
	Status    string    `json:"status" db:"status"`
	Metadata  string    `json:"metadata" db:"metadata"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// NewQueries creates a new Queries instance
func NewQueries(db *sql.DB) *Queries {
	return &Queries{db: db}
}

// CBOM Report operations
func (q *Queries) CreateCBOMReport(report *CBOMReport) error {
	query := `
		INSERT INTO cbom_reports (id, tenant_id, name, version, cyclonedx_bom, metadata, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`

	return q.db.QueryRow(
		query,
		uuid.New().String(),
		report.TenantID,
		report.Name,
		report.Version,
		report.CycloneDXBOM,
		report.Metadata,
		report.Status,
	).Scan(&report.ID, &report.CreatedAt, &report.UpdatedAt)
}

func (q *Queries) GetCBOMReport(id string) (*CBOMReport, error) {
	query := `
		SELECT id, tenant_id, name, version, cyclonedx_bom, metadata, status, created_at, updated_at
		FROM cbom_reports 
		WHERE id = $1`

	report := &CBOMReport{}
	err := q.db.QueryRow(query, id).Scan(
		&report.ID, &report.TenantID, &report.Name, &report.Version,
		&report.CycloneDXBOM, &report.Metadata, &report.Status,
		&report.CreatedAt, &report.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}
	return report, nil
}

func (q *Queries) ListCBOMReports(tenantID string, limit, offset int) ([]CBOMReport, error) {
	query := `
		SELECT id, tenant_id, name, version, cyclonedx_bom, metadata, status, created_at, updated_at
		FROM cbom_reports 
		WHERE tenant_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3`

	rows, err := q.db.Query(query, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []CBOMReport
	for rows.Next() {
		report := CBOMReport{}
		err := rows.Scan(
			&report.ID, &report.TenantID, &report.Name, &report.Version,
			&report.CycloneDXBOM, &report.Metadata, &report.Status,
			&report.CreatedAt, &report.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		reports = append(reports, report)
	}

	return reports, nil
}

func (q *Queries) UpdateCBOMReport(report *CBOMReport) error {
	query := `
		UPDATE cbom_reports 
		SET name = $2, version = $3, cyclonedx_bom = $4, metadata = $5, status = $6, updated_at = NOW()
		WHERE id = $1`

	_, err := q.db.Exec(
		query,
		report.ID, report.Name, report.Version,
		report.CycloneDXBOM, report.Metadata, report.Status,
	)
	return err
}

func (q *Queries) DeleteCBOMReport(id string) error {
	query := `DELETE FROM cbom_reports WHERE id = $1`
	_, err := q.db.Exec(query, id)
	return err
}

// Crypto Asset operations
func (q *Queries) CreateCryptoAsset(asset *CryptoAsset) error {
	query := `
		INSERT INTO crypto_assets (id, cbom_report_id, algorithm, key_size, usage, location, vulnerability_score, quantum_safe, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	return q.db.QueryRow(
		query,
		uuid.New().String(),
		asset.CBOMReportID,
		asset.Algorithm,
		asset.KeySize,
		asset.Usage,
		asset.Location,
		asset.VulnerabilityScore,
		asset.QuantumSafe,
		asset.Metadata,
	).Scan(&asset.ID, &asset.CreatedAt, &asset.UpdatedAt)
}

func (q *Queries) GetCryptoAsset(id string) (*CryptoAsset, error) {
	query := `
		SELECT id, cbom_report_id, algorithm, key_size, usage, location, vulnerability_score, quantum_safe, metadata, created_at, updated_at
		FROM crypto_assets 
		WHERE id = $1`

	asset := &CryptoAsset{}
	err := q.db.QueryRow(query, id).Scan(
		&asset.ID, &asset.CBOMReportID, &asset.Algorithm, &asset.KeySize,
		&asset.Usage, &asset.Location, &asset.VulnerabilityScore,
		&asset.QuantumSafe, &asset.Metadata,
		&asset.CreatedAt, &asset.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}
	return asset, nil
}

func (q *Queries) ListCryptoAssets(cbomReportID string, limit, offset int) ([]CryptoAsset, error) {
	query := `
		SELECT id, cbom_report_id, algorithm, key_size, usage, location, vulnerability_score, quantum_safe, metadata, created_at, updated_at
		FROM crypto_assets 
		WHERE cbom_report_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3`

	rows, err := q.db.Query(query, cbomReportID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []CryptoAsset
	for rows.Next() {
		asset := CryptoAsset{}
		err := rows.Scan(
			&asset.ID, &asset.CBOMReportID, &asset.Algorithm, &asset.KeySize,
			&asset.Usage, &asset.Location, &asset.VulnerabilityScore,
			&asset.QuantumSafe, &asset.Metadata,
			&asset.CreatedAt, &asset.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		assets = append(assets, asset)
	}

	return assets, nil
}

func (q *Queries) UpdateCryptoAsset(asset *CryptoAsset) error {
	query := `
		UPDATE crypto_assets 
		SET algorithm = $2, key_size = $3, usage = $4, location = $5, vulnerability_score = $6, quantum_safe = $7, metadata = $8, updated_at = NOW()
		WHERE id = $1`

	_, err := q.db.Exec(
		query,
		asset.ID, asset.Algorithm, asset.KeySize, asset.Usage,
		asset.Location, asset.VulnerabilityScore, asset.QuantumSafe, asset.Metadata,
	)
	return err
}

// Quantum Attestation operations
func (q *Queries) CreateQuantumAttestation(attestation *QuantumAttestation) error {
	query := `
		INSERT INTO quantum_attestations (id, cbom_report_id, attestation_type, quantum_network, status, result)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	return q.db.QueryRow(
		query,
		uuid.New().String(),
		attestation.CBOMReportID,
		attestation.AttestationType,
		attestation.QuantumNetwork,
		attestation.Status,
		attestation.Result,
	).Scan(&attestation.ID, &attestation.CreatedAt, &attestation.UpdatedAt)
}

func (q *Queries) ListQuantumAttestations(cbomReportID string, limit, offset int) ([]QuantumAttestation, error) {
	query := `
		SELECT id, cbom_report_id, attestation_type, quantum_network, status, result, attested_at, created_at, updated_at
		FROM quantum_attestations 
		WHERE cbom_report_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3`

	rows, err := q.db.Query(query, cbomReportID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attestations []QuantumAttestation
	for rows.Next() {
		attestation := QuantumAttestation{}
		err := rows.Scan(
			&attestation.ID, &attestation.CBOMReportID, &attestation.AttestationType,
			&attestation.QuantumNetwork, &attestation.Status, &attestation.Result,
			&attestation.AttestedAt, &attestation.CreatedAt, &attestation.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		attestations = append(attestations, attestation)
	}

	return attestations, nil
}

// Security Event operations
func (q *Queries) CreateSecurityEvent(event *SecurityEvent) error {
	query := `
		INSERT INTO security_events (id, tenant_id, event_type, severity, source, description, metadata, resolved)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	return q.db.QueryRow(
		query,
		uuid.New().String(),
		event.TenantID,
		event.EventType,
		event.Severity,
		event.Source,
		event.Description,
		event.Metadata,
		event.Resolved,
	).Scan(&event.ID, &event.CreatedAt, &event.UpdatedAt)
}

func (q *Queries) ListSecurityEvents(tenantID string, limit, offset int) ([]SecurityEvent, error) {
	query := `
		SELECT id, tenant_id, event_type, severity, source, description, metadata, resolved, created_at, updated_at
		FROM security_events 
		WHERE tenant_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3`

	rows, err := q.db.Query(query, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []SecurityEvent
	for rows.Next() {
		event := SecurityEvent{}
		err := rows.Scan(
			&event.ID, &event.TenantID, &event.EventType, &event.Severity,
			&event.Source, &event.Description, &event.Metadata,
			&event.Resolved, &event.CreatedAt, &event.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, nil
}

// Kubernetes Cluster operations
func (q *Queries) CreateKubernetesCluster(cluster *KubernetesCluster) error {
	query := `
		INSERT INTO kubernetes_clusters (id, tenant_id, name, endpoint, version, platform, region, status, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	return q.db.QueryRow(
		query,
		uuid.New().String(),
		cluster.TenantID,
		cluster.Name,
		cluster.Endpoint,
		cluster.Version,
		cluster.Platform,
		cluster.Region,
		cluster.Status,
		cluster.Metadata,
	).Scan(&cluster.ID, &cluster.CreatedAt, &cluster.UpdatedAt)
}

func (q *Queries) ListKubernetesClusters(tenantID string, limit, offset int) ([]KubernetesCluster, error) {
	query := `
		SELECT id, tenant_id, name, endpoint, version, platform, region, status, metadata, created_at, updated_at
		FROM kubernetes_clusters 
		WHERE tenant_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3`

	rows, err := q.db.Query(query, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clusters []KubernetesCluster
	for rows.Next() {
		cluster := KubernetesCluster{}
		err := rows.Scan(
			&cluster.ID, &cluster.TenantID, &cluster.Name, &cluster.Endpoint,
			&cluster.Version, &cluster.Platform, &cluster.Region,
			&cluster.Status, &cluster.Metadata,
			&cluster.CreatedAt, &cluster.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		clusters = append(clusters, cluster)
	}

	return clusters, nil
}

// Metrics and analytics operations
func (q *Queries) GetMetricsOverview(tenantID string) (map[string]interface{}, error) {
	var totalAssets, quantumSafeAssets, vulnerabilities float64

	// Get total assets
	err := q.db.QueryRow(`
		SELECT COUNT(*) FROM crypto_assets ca 
		JOIN cbom_reports cr ON ca.cbom_report_id = cr.id 
		WHERE cr.tenant_id = $1
	`, tenantID).Scan(&totalAssets)
	if err != nil {
		return nil, err
	}

	// Get quantum safe assets
	err = q.db.QueryRow(`
		SELECT COUNT(*) FROM crypto_assets ca 
		JOIN cbom_reports cr ON ca.cbom_report_id = cr.id 
		WHERE cr.tenant_id = $1 AND ca.quantum_safe = true
	`, tenantID).Scan(&quantumSafeAssets)
	if err != nil {
		return nil, err
	}

	// Get vulnerabilities count
	err = q.db.QueryRow(`
		SELECT COUNT(*) FROM security_events se 
		WHERE se.tenant_id = $1 AND se.resolved = false
	`, tenantID).Scan(&vulnerabilities)
	if err != nil {
		return nil, err
	}

	// Get algorithm distribution
	rows, err := q.db.Query(`
		SELECT ca.algorithm, COUNT(*) 
		FROM crypto_assets ca 
		JOIN cbom_reports cr ON ca.cbom_report_id = cr.id 
		WHERE cr.tenant_id = $1 
		GROUP BY ca.algorithm
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	algorithms := make(map[string]int)
	for rows.Next() {
		var algorithm string
		var count int
		if err := rows.Scan(&algorithm, &count); err != nil {
			return nil, err
		}
		algorithms[algorithm] = count
	}

	complianceScore := 85.5
	if totalAssets > 0 {
		complianceScore = (quantumSafeAssets / totalAssets) * 100
	}

	return map[string]interface{}{
		"total_assets":     totalAssets,
		"quantum_safe":     quantumSafeAssets,
		"vulnerabilities":  vulnerabilities,
		"compliance_score": complianceScore,
		"algorithms":       algorithms,
	}, nil
}

// Health check
func (q *Queries) HealthCheck() error {
	var dbVersion string
	err := q.db.QueryRow("SELECT version()").Scan(&dbVersion)
	if err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}
	return nil
}

// InsertAuditEvent logs an audit event to the database
func (q *Queries) InsertAuditEvent(tenantID, eventType, requestID, method, path string, status, latencyMs int, ip, userAgent, actorID string) error {
	_, err := q.db.Exec(
		`INSERT INTO audit_events (tenant_id, event_type, request_id, method, path, status, latency_ms, ip, user_agent, actor_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		tenantID, eventType, requestID, method, path, status, latencyMs, ip, userAgent, actorID,
	)
	return err
}

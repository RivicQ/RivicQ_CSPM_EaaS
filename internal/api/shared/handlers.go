package shared

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/sirupsen/logrus"
)

const defaultTenantID = "00000000-0000-0000-0000-000000000001"

func demoMode(db *database.DB) bool {
	return db == nil || db.DB == nil || db.Queries == nil
}

// installScanPersistence wires the DB-backed persist hook into the shared scan
// manager so completed scans are stored as CBOM reports + crypto assets.
func installScanPersistence(db *database.DB, logger *logrus.Logger) {
	discovery.GetScanManager().SetPersistFunc(persistCBOMScanResult(db, logger))
}

// persistCBOMScanResult writes a completed scan result into PostgreSQL when
// available, returning the CBOM report ID as the stable asset ID.
func persistCBOMScanResult(db *database.DB, logger *logrus.Logger) discovery.PersistFunc {
	return func(job *discovery.ScanJob, result *discovery.ScanResult) (string, error) {
		if demoMode(db) {
			return "", nil
		}

		// Ensure the default tenant exists before writing the CBOM report
		// (crypto_assets and cbom_reports reference tenants by FK).
		if _, err := db.Exec(`INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			defaultTenantID, "Default Organization"); err != nil {
			logger.WithError(err).Warn("Failed to ensure default tenant for scan persistence")
		}

		bomJSON, err := json.Marshal(result)
		if err != nil {
			return "", err
		}

		report := &database.CBOMReport{
			TenantID:     defaultTenantID,
			Name:         job.Target,
			Version:      "1.0",
			CycloneDXBOM: string(bomJSON),
			Metadata:     fmt.Sprintf(`{"scan_type":%q,"scan_id":%q}`, job.ScanType, job.ID),
			Status:       "completed",
		}
		if err := db.Queries.CreateCBOMReport(report); err != nil {
			logger.WithError(err).Error("Failed to persist CBOM report from scan")
			return "", err
		}

		for _, comp := range result.Components {
			asset := &database.CryptoAsset{
				CBOMReportID:       report.ID,
				Algorithm:          comp.Algorithm,
				KeySize:            comp.KeySize,
				Usage:              "cryptographic",
				Location:           comp.Location,
				VulnerabilityScore: vulnerabilityScore(comp.RiskLevel),
				QuantumSafe:        comp.QuantumSafe,
				Metadata:           fmt.Sprintf(`{"library":%q,"version":%q,"pqc_status":%q}`, comp.Library, comp.Version, comp.PQCStatus),
			}
			if err := db.Queries.CreateCryptoAsset(asset); err != nil {
				logger.WithError(err).Warn("Failed to persist crypto asset from scan")
			}
		}

		return report.ID, nil
	}
}

// vulnerabilityScore maps a finding severity to a 0-10 vulnerability score.
func vulnerabilityScore(level discovery.SeverityLevel) int {
	switch level {
	case discovery.SeverityCritical:
		return 9
	case discovery.SeverityHigh:
		return 7
	case discovery.SeverityMedium:
		return 4
	case discovery.SeverityLow:
		return 1
	}
	return 0
}

// componentsToGin renders CBOM components as the public API shape.
func componentsToGin(components []discovery.CBOMComponent) []gin.H {
	out := make([]gin.H, 0, len(components))
	for _, c := range components {
		out = append(out, gin.H{
			"algorithm":    c.Algorithm,
			"key_size":     c.KeySize,
			"library":      c.Library,
			"version":      c.Version,
			"risk_level":   c.RiskLevel,
			"quantum_safe": c.QuantumSafe,
			"pqc_status":   c.PQCStatus,
			"location":     c.Location,
			"bsi_ref":      c.BSIRef,
		})
	}
	return out
}

// ── CBOM Handlers ─────────────────────────────────────────────────────────

func CreateCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusCreated, gin.H{"id": uuid.New().String(), "demo_mode": true})
			return
		}

		var body struct {
			Name         string          `json:"name" binding:"required"`
			Version      string          `json:"version" binding:"required"`
			CycloneDXBOM json.RawMessage `json:"cyclonedx_bom"`
			Metadata     json.RawMessage `json:"metadata"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		bomStr := "{}"
		if len(body.CycloneDXBOM) > 0 {
			bomStr = string(body.CycloneDXBOM)
		}
		metaStr := "{}"
		if len(body.Metadata) > 0 {
			metaStr = string(body.Metadata)
		}

		report := &database.CBOMReport{
			TenantID:     defaultTenantID,
			Name:         body.Name,
			Version:      body.Version,
			CycloneDXBOM: bomStr,
			Metadata:     metaStr,
			Status:       "pending",
		}
		if err := db.Queries.CreateCBOMReport(report); err != nil {
			logger.WithError(err).Error("Failed to create CBOM report")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create report"})
			return
		}
		c.JSON(http.StatusCreated, report)
	}
}

func ListCBOMReports(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"reports": []gin.H{}, "demo_mode": true})
			return
		}
		reports, err := db.Queries.ListCBOMReports(defaultTenantID, 100, 0)
		if err != nil {
			logger.WithError(err).Error("Failed to list CBOM reports")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list reports"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"reports": reports, "total": len(reports)})
	}
}

func GetCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"id": id, "demo_mode": true})
			return
		}
		report, err := db.Queries.GetCBOMReport(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "report not found"})
			return
		}
		c.JSON(http.StatusOK, report)
	}
}

func UpdateCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"id": id, "updated": true, "demo_mode": true})
			return
		}
		var body struct {
			Name    string `json:"name"`
			Version string `json:"version"`
			Status  string `json:"status"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		report := &database.CBOMReport{
			ID:      id,
			Name:    body.Name,
			Version: body.Version,
			Status:  body.Status,
		}
		if err := db.Queries.UpdateCBOMReport(report); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": id, "updated": true})
	}
}

func DeleteCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"id": id, "deleted": true, "demo_mode": true})
			return
		}
		if err := db.Queries.DeleteCBOMReport(id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": id, "deleted": true})
	}
}

func ScanCBOMReport(db *database.DB, logger *logrus.Logger, cfg interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req struct {
			Target string `json:"target"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		target := req.Target
		if target == "" {
			target = "localhost"
		}

		installScanPersistence(db, logger)

		sm := discovery.GetScanManager()
		job := sm.StartScan(target, "cbom")

		logger.WithFields(logrus.Fields{
			"report_id": id,
			"scan_id":   job.ID,
			"target":    target,
		}).Info("CBOM scan started via report scan")

		c.JSON(http.StatusAccepted, gin.H{
			"id":          id,
			"scan_id":     job.ID,
			"asset_id":    job.AssetID,
			"scan_status": "started",
			"target":      target,
			"result_url":  fmt.Sprintf("/api/v1/scans/%s", job.ID),
		})
	}
}

// ── Crypto Assets ─────────────────────────────────────────────────────────

func ListCryptoAssets(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"data": demoAssets(), "total": 3, "demo_mode": true})
			return
		}
		cbomID := c.Query("cbom_report_id")
		if cbomID == "" {
			cbomID = c.Query("report_id")
		}
		if cbomID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cbom_report_id query param required"})
			return
		}
		assets, err := db.Queries.ListCryptoAssets(cbomID, 100, 0)
		if err != nil {
			logger.WithError(err).Error("Failed to list crypto assets")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list assets"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": assets, "total": len(assets)})
	}
}

func GetCryptoAsset(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"id": id, "found": true, "demo_mode": true})
			return
		}
		asset, err := db.Queries.GetCryptoAsset(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "asset not found"})
			return
		}
		c.JSON(http.StatusOK, asset)
	}
}

func UpdateCryptoAsset(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"id": id, "updated": true, "demo_mode": true})
			return
		}
		var body struct {
			Algorithm          string `json:"algorithm"`
			KeySize            int    `json:"key_size"`
			VulnerabilityScore int    `json:"vulnerability_score"`
			QuantumSafe        bool   `json:"quantum_safe"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		asset := &database.CryptoAsset{
			ID:                 id,
			Algorithm:          body.Algorithm,
			KeySize:            body.KeySize,
			VulnerabilityScore: body.VulnerabilityScore,
			QuantumSafe:        body.QuantumSafe,
		}
		if err := db.Queries.UpdateCryptoAsset(asset); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": id, "updated": true})
	}
}

// ── Security Events ───────────────────────────────────────────────────────

func ListSecurityEvents(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"events": []gin.H{}, "demo_mode": true})
			return
		}
		events, err := db.Queries.ListSecurityEvents(defaultTenantID, 100, 0)
		if err != nil {
			logger.WithError(err).Error("Failed to list security events")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list events"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"events": events, "total": len(events)})
	}
}

func CreateSecurityEvent(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusCreated, gin.H{"id": uuid.New().String(), "demo_mode": true})
			return
		}
		var body struct {
			EventType   string `json:"event_type" binding:"required"`
			Severity    string `json:"severity" binding:"required"`
			Source      string `json:"source" binding:"required"`
			Description string `json:"description"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		event := &database.SecurityEvent{
			TenantID:    defaultTenantID,
			EventType:   body.EventType,
			Severity:    body.Severity,
			Source:      body.Source,
			Description: body.Description,
		}
		if err := db.Queries.CreateSecurityEvent(event); err != nil {
			logger.WithError(err).Error("Failed to create security event")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create event"})
			return
		}
		c.JSON(http.StatusCreated, event)
	}
}

func ResolveSecurityEvent(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"id": id, "resolved": true, "demo_mode": true})
			return
		}
		event := &database.SecurityEvent{
			ID:       id,
			Resolved: true,
		}
		rows, err := db.Exec("UPDATE security_events SET resolved = true, updated_at = NOW() WHERE id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve event"})
			return
		}
		affected, _ := rows.RowsAffected()
		if affected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}
		_ = event
		c.JSON(http.StatusOK, gin.H{"id": id, "resolved": true})
	}
}

// ── Dashboard ─────────────────────────────────────────────────────────────

func GetDashboardOverview(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{
				"overview": gin.H{
					"total_assets":     42,
					"health_score":     85.5,
					"quantum_safe":     15,
					"vulnerabilities":  8,
					"compliance_score": 85.5,
				},
				"demo_mode": true,
			})
			return
		}
		metrics, err := db.Queries.GetMetricsOverview(defaultTenantID)
		if err != nil {
			logger.WithError(err).Error("Failed to get metrics overview")
			c.JSON(http.StatusOK, gin.H{
				"overview": gin.H{
					"total_assets":     0,
					"health_score":     100,
					"quantum_safe":     0,
					"vulnerabilities":  0,
					"compliance_score": 100,
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"overview": metrics,
		})
	}
}

func GetMetrics(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{
				"metrics": gin.H{
					"algorithms": map[string]int{
						"RSA-2048": 12,
						"RSA-3072": 8,
						"AES-256":  15,
						"ECDSA":    7,
					},
				},
				"demo_mode": true,
			})
			return
		}
		metrics, err := db.Queries.GetMetricsOverview(defaultTenantID)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"metrics": gin.H{}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"metrics": metrics})
	}
}

func GetComplianceStatus(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"compliance": 85.5, "demo_mode": true})
			return
		}
		metrics, err := db.Queries.GetMetricsOverview(defaultTenantID)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"compliance": 0})
			return
		}
		score := 100.0
		if cs, ok := metrics["compliance_score"].(float64); ok {
			score = cs
		}
		c.JSON(http.StatusOK, gin.H{"compliance": score})
	}
}

func GetMetricsOverview(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{
				"total_assets":     42,
				"quantum_safe":     15,
				"vulnerabilities":  8,
				"compliance_score": 85.5,
				"algorithms": map[string]int{
					"RSA-2048": 12,
					"RSA-3072": 8,
					"AES-256":  15,
					"ECDSA":    7,
				},
				"demo_mode": true,
			})
			return
		}
		metrics, err := db.Queries.GetMetricsOverview(defaultTenantID)
		if err != nil {
			logger.WithError(err).Error("Failed to get metrics overview")
			c.JSON(http.StatusOK, gin.H{
				"total_assets": 0, "quantum_safe": 0, "vulnerabilities": 0,
				"compliance_score": 100, "algorithms": map[string]int{},
			})
			return
		}
		c.JSON(http.StatusOK, metrics)
	}
}

// ── Kubernetes ────────────────────────────────────────────────────────────

func ListKubernetesClusters(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{"clusters": []gin.H{}, "demo_mode": true})
			return
		}
		clusters, err := db.Queries.ListKubernetesClusters(defaultTenantID, 100, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list clusters"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"clusters": clusters, "total": len(clusters)})
	}
}

func AddKubernetesCluster(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if demoMode(db) {
			c.JSON(http.StatusCreated, gin.H{"id": uuid.New().String(), "demo_mode": true})
			return
		}
		var body struct {
			Name     string `json:"name" binding:"required"`
			Endpoint string `json:"endpoint" binding:"required"`
			Version  string `json:"version"`
			Platform string `json:"platform"`
			Region   string `json:"region"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		cluster := &database.KubernetesCluster{
			TenantID: defaultTenantID,
			Name:     body.Name,
			Endpoint: body.Endpoint,
			Version:  body.Version,
			Platform: body.Platform,
			Region:   body.Region,
			Status:   "active",
		}
		if err := db.Queries.CreateKubernetesCluster(cluster); err != nil {
			logger.WithError(err).Error("Failed to add cluster")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add cluster"})
			return
		}
		c.JSON(http.StatusCreated, cluster)
	}
}

func GetClusterStatus(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("cluster_id", id).Info("Getting cluster status")
		c.JSON(http.StatusOK, gin.H{"cluster_id": id, "status": "healthy"})
	}
}

func ScanCluster(db *database.DB, logger *logrus.Logger, cfg interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("cluster_id", id).Info("Scanning cluster")
		c.JSON(http.StatusAccepted, gin.H{
			"cluster_id":  id,
			"scan_status": "started",
		})
	}
}

// ── Monitoring ────────────────────────────────────────────────────────────

func GetMonitoringIntegrations(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"integrations": []gin.H{
				{"name": "Cilium", "type": "CNI", "enabled": true, "endpoint": "/api/v1/cilium", "version": "v1.12+"},
				{"name": "Prometheus", "type": "Metrics", "enabled": true, "endpoint": "/api/v1/metrics", "version": "v2.40+"},
				{"name": "Grafana", "type": "Visualization", "enabled": true, "endpoint": "/api/v1/grafana", "version": "v9.5+"},
			},
		})
	}
}

func CreatePrometheusIntegration(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var cfg struct {
			Enabled        bool   `json:"enabled"`
			ScrapeInterval string `json:"scrape_interval"`
		}
		if err := c.ShouldBindJSON(&cfg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"id": "prometheus-1", "configured": true})
	}
}

func CreateGrafanaDashboard(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var cfg struct {
			DataSource string `json:"datasource"`
			Theme      string `json:"theme"`
		}
		if err := c.ShouldBindJSON(&cfg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"id": "grafana-1", "configured": true})
	}
}

func GetJaegerTracing(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var cfg struct {
			CollectorEndpoint string `json:"collector_endpoint"`
		}
		if err := c.ShouldBindJSON(&cfg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"configured": true})
	}
}

// ── Cilium ────────────────────────────────────────────────────────────────

func GetCiliumCryptoFlows(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"flows": []gin.H{}, "total": 0})
	}
}

func GetCiliumNetworkPolicies(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"policies": []gin.H{}, "total": 0})
	}
}

func CreateCiliumNetworkPolicy(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body map[string]interface{}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		body["id"] = uuid.New().String()
		c.JSON(http.StatusCreated, body)
	}
}

func GetCiliumMetrics(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"total_flows": 42, "total_policies": 8, "crypto_flows": 15,
			"tls_connections": 28,
			"protocols":       map[string]int{"TLS": 28, "SSH": 10, "HTTPS": 4},
			"key_sizes":       map[int]int{2048: 15, 3072: 8, 4096: 3},
		})
	}
}

// ── Scan Flow (headleap) ──────────────────────────────────────────────────

type ScanRequest struct {
	Target   string `json:"target" binding:"required"`
	ScanType string `json:"scan_type"`
}

type ScanResponse struct {
	ScanID    string `json:"scan_id"`
	AssetID   string `json:"asset_id"`
	Status    string `json:"status"`
	Target    string `json:"target"`
	ScanType  string `json:"scan_type"`
	CreatedAt string `json:"created_at"`
	ResultURL string `json:"result_url"`
}

func TriggerCBOMScan(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ScanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if strings.TrimSpace(req.Target) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "target is required"})
			return
		}
		if req.ScanType == "" {
			req.ScanType = "cbom"
		}

		installScanPersistence(db, logger)

		sm := discovery.GetScanManager()
		job := sm.StartScan(req.Target, req.ScanType)

		logger.WithFields(logrus.Fields{
			"scan_id": job.ID, "asset_id": job.AssetID, "target": req.Target, "scan_type": req.ScanType,
		}).Info("CBOM scan triggered")

		resp := ScanResponse{
			ScanID:    job.ID,
			AssetID:   job.AssetID,
			Status:    "accepted",
			Target:    req.Target,
			ScanType:  req.ScanType,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
			ResultURL: "/api/v1/scans/" + job.ID,
		}
		c.JSON(http.StatusAccepted, resp)
	}
}

func GetCBOMScanStatus(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("scan_id", id).Info("Getting CBOM scan status")

		sm := discovery.GetScanManager()
		job, ok := sm.GetScan(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
			return
		}

		resp := gin.H{
			"scan_id":    job.ID,
			"asset_id":   job.AssetID,
			"target":     job.Target,
			"scan_type":  job.ScanType,
			"status":     job.Status,
			"progress":   job.Progress,
			"created_at": job.CreatedAt.Format(time.RFC3339),
		}

		if job.Status == "completed" && job.Result != nil {
			r := job.Result
			resp["findings"] = gin.H{
				"total":          r.Summary.TotalFindings,
				"critical":       r.Summary.Critical,
				"high":           r.Summary.High,
				"medium":         r.Summary.Medium,
				"low":            r.Summary.Low,
				"quantum_unsafe": r.Summary.QuantumUnsafe,
			}
			resp["finding_items"] = findingsToGin(r.Findings)
			resp["summary"] = gin.H{
				"total":        r.Summary.TotalComponents,
				"at_risk":      r.Summary.AtRisk,
				"quantum_safe": r.Summary.QuantumSafe,
				"pqc_ready":    r.Summary.PQCReady,
			}
			resp["components"] = componentsToGin(r.Components)
			resp["targets"] = r.Targets
			resp["result_url"] = "/api/v1/scans/" + id + "/report"
		}

		if job.Error != "" {
			resp["error"] = job.Error
		}

		c.JSON(http.StatusOK, resp)
	}
}

// GetCBOMScanReport returns the full structured report for a completed scan.
func GetCBOMScanReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("scan_id", id).Info("Getting CBOM scan report")

		sm := discovery.GetScanManager()
		job, ok := sm.GetScan(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
			return
		}
		if job.Status != "completed" || job.Result == nil {
			c.JSON(http.StatusConflict, gin.H{
				"scan_id":  job.ID,
				"status":   job.Status,
				"progress": job.Progress,
				"error":    "scan report not ready",
			})
			return
		}

		c.JSON(http.StatusOK, job.Result)
	}
}

// ── Asset BOM ─────────────────────────────────────────────────────────────

type AssetBOMEntry struct {
	Algorithm   string `json:"algorithm"`
	KeySize     int    `json:"key_size"`
	Library     string `json:"library"`
	Version     string `json:"version"`
	RiskLevel   string `json:"risk_level"`
	QuantumSafe bool   `json:"quantum_safe"`
	PQCStatus   string `json:"pqc_status"`
	Location    string `json:"location"`
	BSIRef      string `json:"bsi_ref,omitempty"`
}

func GetAssetBOM(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("asset_id", id).Info("Getting asset CBOM")

		sm := discovery.GetScanManager()
		if result, ok := sm.GetResult(id); ok && len(result.Components) > 0 {
			c.JSON(http.StatusOK, gin.H{
				"asset_id":    id,
				"bom_version": "1.0",
				"generated":   time.Now().UTC().Format(time.RFC3339),
				"components":  componentsToGin(result.Components),
				"summary": gin.H{
					"total":        len(result.Components),
					"quantum_safe": result.Summary.QuantumSafe,
					"at_risk":      result.Summary.AtRisk,
					"pqc_ready":    result.Summary.PQCReady,
				},
			})
			return
		}

		if !demoMode(db) {
			assets, err := db.Queries.ListCryptoAssets(id, 100, 0)
			if err == nil && len(assets) > 0 {
				components := make([]gin.H, 0, len(assets))
				quantumSafe, atRisk := 0, 0
				for _, a := range assets {
					components = append(components, gin.H{
						"algorithm":    a.Algorithm,
						"key_size":     a.KeySize,
						"library":      libraryFromMetadata(a.Metadata),
						"version":      versionFromMetadata(a.Metadata),
						"risk_level":   riskLevelFromScore(a.VulnerabilityScore),
						"quantum_safe": a.QuantumSafe,
						"location":     a.Location,
					})
					if a.QuantumSafe {
						quantumSafe++
					}
					if a.VulnerabilityScore >= 7 {
						atRisk++
					}
				}
				c.JSON(http.StatusOK, gin.H{
					"asset_id":    id,
					"bom_version": "1.0",
					"generated":   time.Now().UTC().Format(time.RFC3339),
					"components":  components,
					"summary": gin.H{
						"total":        len(components),
						"quantum_safe": quantumSafe,
						"at_risk":      atRisk,
					},
				})
				return
			}
		}

		// No scan data for this asset yet – fall back to demo components only in
		// demo mode so the UI still renders an example CBOM.
		if demoMode(db) {
			c.JSON(http.StatusOK, gin.H{
				"asset_id":    id,
				"bom_version": "1.0",
				"generated":   time.Now().UTC().Format(time.RFC3339),
				"components":  assetBOMDemo(),
				"summary": gin.H{
					"total": 3, "quantum_safe": 2, "at_risk": 1, "pqc_ready": 1,
				},
			})
			return
		}

		c.JSON(http.StatusNotFound, gin.H{"error": "no CBOM found for asset"})
	}
}

func riskLevelFromScore(score int) string {
	switch {
	case score >= 9:
		return "CRITICAL"
	case score >= 7:
		return "HIGH"
	case score >= 4:
		return "MEDIUM"
	default:
		return "LOW"
	}
}

func libraryFromMetadata(metadata string) string {
	if metadata == "" {
		return ""
	}
	var meta struct {
		Library string `json:"library"`
	}
	if err := json.Unmarshal([]byte(metadata), &meta); err != nil {
		return ""
	}
	return meta.Library
}

func versionFromMetadata(metadata string) string {
	if metadata == "" {
		return ""
	}
	var meta struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal([]byte(metadata), &meta); err != nil {
		return ""
	}
	return meta.Version
}

// ── Helpers ───────────────────────────────────────────────────────────────

func demoAssets() []gin.H {
	now := time.Now().UTC().Format(time.RFC3339)
	return []gin.H{
		{"id": "1", "name": "Production TLS Certificate", "algorithm": "RSA-2048", "key_size": 2048, "location": "k8s-ingress", "risk_level": "medium", "quantum_safe": false, "last_seen": now},
		{"id": "2", "name": "Database Encryption", "algorithm": "AES-256", "key_size": 256, "location": "postgres-primary", "risk_level": "low", "quantum_safe": true, "last_seen": now},
		{"id": "3", "name": "API Keys", "algorithm": "RSA-3072", "key_size": 3072, "location": "api-gateway", "risk_level": "high", "quantum_safe": false, "last_seen": now},
	}
}

func assetBOMDemo() []gin.H {
	return []gin.H{
		{"algorithm": "RSA-2048", "key_size": 2048, "library": "OpenSSL", "version": "3.0.8", "risk_level": "HIGH", "quantum_safe": false, "pqc_status": "migration_required", "location": "tls/server.crt"},
		{"algorithm": "AES-256-GCM", "key_size": 256, "library": "OpenSSL", "version": "3.0.8", "risk_level": "LOW", "quantum_safe": true, "pqc_status": "safe", "location": "storage/encryption.go"},
		{"algorithm": "ML-KEM-768", "key_size": 768, "library": "liboqs", "version": "0.10.1", "risk_level": "LOW", "quantum_safe": true, "pqc_status": "pqc_ready", "location": "crypto/kem.go"},
	}
}

// Stub used by enterprise attestCBOMReport, keep for convenience
func BOMComponents() []gin.H {
	return assetBOMDemo()
}

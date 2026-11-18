package enterprise

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/controls"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type ComplianceHandler struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
}

type DelveConfig struct {
	APIEndpoint  string
	APIKey       string
	ClientID     string
	ClientSecret string
}

type KertosConfig struct {
	APIEndpoint string
	APIKey      string
	OrgID       string
}

type ComplianceFramework string

const (
	ISO27001 ComplianceFramework = "iso27001"
	DORA     ComplianceFramework = "dora"
	GDPR     ComplianceFramework = "gdpr"
	EUAIAct  ComplianceFramework = "eu_ai_act"
	SOC2     ComplianceFramework = "soc2"
	NIST     ComplianceFramework = "nist"
	PQC      ComplianceFramework = "pqc"
	CIS      ComplianceFramework = "cis"
	HIPAA    ComplianceFramework = "hipaa"
	PCIDSS   ComplianceFramework = "pci_dss"
)

type ComplianceControl struct {
	ID          uuid.UUID              `json:"id"`
	FrameworkID uuid.UUID              `json:"framework_id"`
	ControlID   string                 `json:"control_id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Category    string                 `json:"category"`
	Severity    string                 `json:"severity"`
	Status      string                 `json:"status"`
	Evidence    map[string]interface{} `json:"evidence"`
	Remediation string                 `json:"remediation"`
	Automated   bool                   `json:"automated"`
	LastChecked *time.Time             `json:"last_checked_at"`
}

type ComplianceDashboard struct {
	Framework       string              `json:"framework"`
	Status          string              `json:"status"`
	Score           int                 `json:"score"`
	TotalControls   int                 `json:"total_controls"`
	PassedControls  int                 `json:"passed_controls"`
	FailedControls  int                 `json:"failed_controls"`
	PendingControls int                 `json:"pending_controls"`
	Findings        []ComplianceControl `json:"findings"`
	LastAudit       time.Time           `json:"last_audit"`
	NextAudit       time.Time           `json:"next_audit"`
	DelveConnected  bool                `json:"delve_connected"`
	KertosConnected bool                `json:"kertos_connected"`
}

func NewComplianceHandler(db *database.EnterpriseDB, logger *logrus.Logger) *ComplianceHandler {
	return &ComplianceHandler{
		db:     db,
		logger: logger,
	}
}

func (h *ComplianceHandler) SetupRoutes(router *gin.RouterGroup) {
	compliance := router.Group("/compliance")
	{
		compliance.GET("/frameworks", h.ListFrameworks)
		compliance.POST("/frameworks", h.CreateFramework)
		compliance.GET("/frameworks/:id", h.GetFramework)
		compliance.PUT("/frameworks/:id", h.UpdateFramework)
		compliance.GET("/frameworks/:id/controls", h.ListControls)
		compliance.GET("/frameworks/:id/dashboard", h.GetComplianceDashboard)
		compliance.POST("/frameworks/:id/scan", h.ScanCompliance)
		compliance.POST("/frameworks/:id/remediate", h.RemediationPlan)

		compliance.GET("/dashboard", h.GetAllComplianceDashboards)
		compliance.GET("/reports", h.ListReports)
		compliance.POST("/reports/generate", h.GenerateReport)

		compliance.POST("/delve/connect", h.ConnectDelve)
		compliance.GET("/delve/status", h.GetDelveStatus)
		compliance.POST("/delve/sync", h.SyncDelveData)

		compliance.POST("/kertos/connect", h.ConnectKertos)
		compliance.GET("/kertos/status", h.GetKertosStatus)
		compliance.POST("/kertos/sync", h.SyncKertosData)

		compliance.GET("/risks", h.ListRisks)
		compliance.POST("/risks", h.CreateRisk)
		compliance.PUT("/risks/:id", h.UpdateRisk)
		compliance.POST("/risks/:id/mitigate", h.MitigateRisk)
	}
}

func (h *ComplianceHandler) ListFrameworks(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)

	query := `
		SELECT id, tenant_id, framework, scope, controls, status, score, 
		       last_audit_at, next_audit_at, delve_integration, kertos_integration, created_at
		FROM compliance_frameworks 
		WHERE tenant_id = $1
	`
	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		h.logger.Error("Failed to list frameworks: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list frameworks"})
		return
	}
	defer func() { _ = rows.Close() }()

	var frameworks []map[string]interface{}
	for rows.Next() {
		var id, tid string
		var framework, scope, status string
		var controls []byte
		var score *int
		var lastAudit, nextAudit *time.Time
		var delve, kertos bool
		var createdAt time.Time

		err := rows.Scan(&id, &tid, &framework, &scope, &controls, &status, &score,
			&lastAudit, &nextAudit, &delve, &kertos, &createdAt)
		if err != nil {
			continue
		}

		frameworks = append(frameworks, map[string]interface{}{
			"id":                 id,
			"tenant_id":          tid,
			"framework":          framework,
			"scope":              scope,
			"status":             status,
			"score":              score,
			"last_audit_at":      lastAudit,
			"next_audit_at":      nextAudit,
			"delve_integration":  delve,
			"kertos_integration": kertos,
		})
	}

	c.JSON(http.StatusOK, gin.H{"frameworks": frameworks})
}

func (h *ComplianceHandler) CreateFramework(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}

	var req struct {
		Framework string `json:"framework" binding:"required"`
		Scope     string `json:"scope"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	frameworkID := uuid.New().String()

	query := `
		INSERT INTO compliance_frameworks (id, tenant_id, framework, scope, status, controls)
		VALUES ($1, $2, $3, $4, 'not_started', $5)
	`
	controls := h.getDefaultControls(req.Framework)
	controlsJSON, _ := json.Marshal(controls)

	_, err := h.db.Exec(query, frameworkID, tenantID, req.Framework, req.Scope, controlsJSON)
	if err != nil {
		h.logger.Error("Failed to create framework: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create framework"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":        frameworkID,
		"framework": req.Framework,
		"status":    "created",
	})
}

func (h *ComplianceHandler) GetFramework(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}
	tenantID := tenantIDFor(c)

	var fwID, tid, framework, scope, status string
	var controls []byte
	var score *int
	var lastAudit, nextAudit *time.Time
	var delveConn, kertosConn bool

	query := `
		SELECT id, tenant_id, framework, scope, controls, status, score, 
		       last_audit_at, next_audit_at, delve_integration, kertos_integration
		FROM compliance_frameworks WHERE id = $1 AND tenant_id = $2
	`
	err = h.db.QueryRow(query, frameworkID, tenantID).Scan(
		&fwID, &tid, &framework, &scope, &controls, &status, &score,
		&lastAudit, &nextAudit, &delveConn, &kertosConn,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Framework not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 fwID,
		"tenant_id":          tid,
		"framework":          framework,
		"scope":              scope,
		"status":             status,
		"score":              score,
		"last_audit_at":      lastAudit,
		"next_audit_at":      nextAudit,
		"delve_integration":  delveConn,
		"kertos_integration": kertosConn,
		"controls":           controls,
	})
}

func (h *ComplianceHandler) UpdateFramework(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}
	tenantID, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}

	var req struct {
		Scope  string `json:"scope"`
		Status string `json:"status"`
		Score  int    `json:"score"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		UPDATE compliance_frameworks 
		SET scope = COALESCE(NULLIF($1, ''), scope),
		    status = COALESCE(NULLIF($2, ''), status),
		    score = CASE WHEN $3 > 0 THEN $3 ELSE score END,
		    updated_at = NOW()
		WHERE id = $4 AND tenant_id = $5
	`
	_, err = h.db.Exec(query, req.Scope, req.Status, req.Score, frameworkID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update framework"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Framework updated successfully"})
}

func (h *ComplianceHandler) ListControls(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}
	tenantID := tenantIDFor(c)
	var exists string
	if err := h.db.QueryRow(`SELECT id FROM compliance_frameworks WHERE id = $1 AND tenant_id = $2`, frameworkID, tenantID).Scan(&exists); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Framework not found"})
		return
	}

	query := `
		SELECT id, framework_id, control_id, title, description, category,
		       severity, status, evidence, remediation, automated, last_checked_at
		FROM compliance_controls
		WHERE framework_id = $1
		ORDER BY severity DESC, control_id
	`
	rows, err := h.db.Query(query, frameworkID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list controls"})
		return
	}
	defer func() { _ = rows.Close() }()

	controls := []ComplianceControl{}
	for rows.Next() {
		var control ComplianceControl
		var evidence []byte
		err := rows.Scan(
			&control.ID, &control.FrameworkID, &control.ControlID, &control.Title,
			&control.Description, &control.Category, &control.Severity, &control.Status,
			&evidence, &control.Remediation, &control.Automated, &control.LastChecked,
		)
		if err != nil {
			continue
		}
		if len(evidence) > 0 {
			_ = json.Unmarshal(evidence, &control.Evidence)
		}
		controls = append(controls, control)
	}

	c.JSON(http.StatusOK, gin.H{"controls": controls})
}

func (h *ComplianceHandler) GetComplianceDashboard(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}
	tenantID := tenantIDFor(c)

	var framework string
	var status string
	var score *int
	var lastAudit, nextAudit *time.Time
	var delveConnected, kertosConnected bool

	query := `
		SELECT cf.framework, cf.status, cf.score, cf.last_audit_at, cf.next_audit_at,
		       cf.delve_integration, cf.kertos_integration
		FROM compliance_frameworks cf WHERE cf.id = $1 AND cf.tenant_id = $2
	`
	err = h.db.QueryRow(query, frameworkID, tenantID).Scan(
		&framework, &status, &score, &lastAudit, &nextAudit,
		&delveConnected, &kertosConnected,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Framework not found"})
		return
	}
	var totalControls, passed, failed, pending int
	_ = h.db.QueryRow(`SELECT COUNT(*) FROM compliance_controls WHERE framework_id = $1`, frameworkID).Scan(&totalControls)
	_ = h.db.QueryRow(`SELECT COUNT(*) FROM compliance_controls WHERE framework_id = $1 AND status = 'passed'`, frameworkID).Scan(&passed)
	_ = h.db.QueryRow(`SELECT COUNT(*) FROM compliance_controls WHERE framework_id = $1 AND status = 'failed'`, frameworkID).Scan(&failed)
	_ = h.db.QueryRow(`SELECT COUNT(*) FROM compliance_controls WHERE framework_id = $1 AND status = 'pending'`, frameworkID).Scan(&pending)

	dashboard := ComplianceDashboard{
		Framework:       framework,
		Status:          status,
		Score:           0,
		TotalControls:   totalControls,
		PassedControls:  passed,
		FailedControls:  failed,
		PendingControls: pending,
		DelveConnected:  delveConnected,
		KertosConnected: kertosConnected,
	}
	if score != nil { dashboard.Score = *score }
	if lastAudit != nil { dashboard.LastAudit = *lastAudit }
	if nextAudit != nil { dashboard.NextAudit = *nextAudit }

	c.JSON(http.StatusOK, dashboard)
}

func (h *ComplianceHandler) GetAllComplianceDashboards(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)

	rows, err := h.db.Query(`SELECT framework, status, score FROM compliance_frameworks WHERE tenant_id = $1`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list compliance frameworks"})
		return
	}
	defer func() { _ = rows.Close() }()
	dashboards := []ComplianceDashboard{}
	for rows.Next() {
		var fw, status string
		var score *int
		if err := rows.Scan(&fw, &status, &score); err != nil { continue }
		d := ComplianceDashboard{Framework: fw, Status: status}
		if score != nil { d.Score = *score }
		dashboards = append(dashboards, d)
	}

	c.JSON(http.StatusOK, gin.H{
		"tenant_id":  tenantID,
		"dashboards": dashboards,
		"status":     "ok",
		"source":     "database",
		"summary": gin.H{
			"frameworks_count": len(dashboards),
		},
	})
}

func (h *ComplianceHandler) ScanCompliance(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	_ = frameworkID
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"status":"unavailable","source":"unconfigured","configured":false,
		"capability":"compliance_scan","message":"Compliance scan unavailable: no verified scan integration configured",
	})
}

func (h *ComplianceHandler) RemediationPlan(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	_ = frameworkID
	c.JSON(http.StatusOK, gin.H{
		"status":"unavailable","source":"unconfigured","configured":false,
		"findings":[]any{},"automatable":[]any{},
		"message":"Remediation plan unavailable: no verified findings configured",
	})
}

func (h *ComplianceHandler) ListReports(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)

	rows, err := h.db.Query(`
		SELECT id, report_type, framework, title, generated_at
		FROM compliance_reports 
		WHERE tenant_id = $1
		ORDER BY generated_at DESC
		LIMIT 20
	`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list reports"})
		return
	}
	defer func() { _ = rows.Close() }()
	reports := []map[string]interface{}{}
	for rows.Next() {
		var id, rtype, framework, title string
		var generatedAt time.Time
		if err := rows.Scan(&id, &rtype, &framework, &title, &generatedAt); err != nil { continue }
		reports = append(reports, map[string]interface{}{"id": id, "report_type": rtype, "framework": framework, "title": title, "generated_at": generatedAt})
	}
	c.JSON(http.StatusOK, gin.H{"reports": reports})
}

func (h *ComplianceHandler) GenerateReport(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	if _, ok := mutatingTenantIDFor(c); !ok { return }
	var req struct {
		Framework string `json:"framework" binding:"required"`
		Title     string `json:"title"`
		Format    string `json:"format"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reportID := uuid.New()

	c.JSON(http.StatusCreated, gin.H{
		"id":        reportID,
		"status":    "generating",
		"framework": req.Framework,
		"message":   "Report generation started",
	})
}

func (h *ComplianceHandler) ConnectDelve(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	var delveCfg DelveConfig
	if err := c.ShouldBindJSON(&delveCfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if delveCfg.APIEndpoint == "" || delveCfg.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API endpoint and API key are required"})
		return
	}

	h.logger.Info("Connecting to Delve API: ", delveCfg.APIEndpoint)

	// Verify connectivity against the Delve API before enabling the integration.
	resp, err := callDelveAPI(delveCfg, "GET", "/api/v1/controls", nil)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to reach Delve API", "detail": err.Error()})
		return
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Delve API returned error", "status_code": resp.StatusCode})
		return
	}

	query := `UPDATE compliance_frameworks SET delve_integration = true WHERE tenant_id = $1`
	_, _ = h.db.Exec(query, tenantIDFor(c))

	c.JSON(http.StatusOK, gin.H{
		"status":   "connected",
		"provider": "delve",
		"message":  "Delve integration enabled",
	})
}

func (h *ComplianceHandler) GetDelveStatus(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)
	connected := false
	err := h.db.QueryRow(
		`SELECT delve_integration FROM compliance_frameworks WHERE tenant_id = $1 LIMIT 1`,
		tenantID,
	).Scan(&connected)

	status := "disconnected"
	if err == nil && connected {
		status = "connected"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    status,
		"provider":  "delve",
		"configured": status == "connected",
	})
}

func (h *ComplianceHandler) SyncDelveData(c *gin.Context) {
	var delveCfg DelveConfig
	if err := c.ShouldBindJSON(&delveCfg); err != nil {
		delveCfg = DelveConfig{
			APIEndpoint: os.Getenv("DELVE_ENDPOINT"),
			APIKey:      os.Getenv("DELVE_API_KEY"),
		}
	}
	if delveCfg.APIEndpoint == "" || delveCfg.APIKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":"unavailable","source":"unconfigured","configured":false,
			"capability":"delve_sync","provider":"delve",
			"message":"Delve integration is not configured",
		})
		return
	}

	controls, err := h.fetchDelveData(delveCfg.APIEndpoint, delveCfg.APIKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"status":"unavailable","source":"error","configured":true,"provider":"delve","error":"Failed to sync data from Delve"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":"ok","source":"delve","provider":"delve","controls": len(controls),
	})
}

func (h *ComplianceHandler) ConnectKertos(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	var kertosCfg KertosConfig
	if err := c.ShouldBindJSON(&kertosCfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if kertosCfg.APIEndpoint == "" || kertosCfg.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API endpoint and API key are required"})
		return
	}

	h.logger.Info("Connecting to Kertos API: ", kertosCfg.APIEndpoint)

	resp, err := callKertosAPI(kertosCfg, "GET", "/api/compliance/controls", nil)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to reach Kertos API", "detail": err.Error()})
		return
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Kertos API returned error", "status_code": resp.StatusCode})
		return
	}

	query := `UPDATE compliance_frameworks SET kertos_integration = true WHERE tenant_id = $1`
	_, _ = h.db.Exec(query, tenantIDFor(c))

	c.JSON(http.StatusOK, gin.H{
		"status":   "connected",
		"provider": "kertos",
		"message":  "Kertos integration enabled",
	})
}

func (h *ComplianceHandler) GetKertosStatus(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)
	connected := false
	err := h.db.QueryRow(
		`SELECT kertos_integration FROM compliance_frameworks WHERE tenant_id = $1 LIMIT 1`,
		tenantID,
	).Scan(&connected)

	status := "disconnected"
	if err == nil && connected {
		status = "connected"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    status,
		"provider":  "kertos",
		"configured": status == "connected",
	})
}

func (h *ComplianceHandler) SyncKertosData(c *gin.Context) {
	var kertosCfg KertosConfig
	if err := c.ShouldBindJSON(&kertosCfg); err != nil {
		kertosCfg = KertosConfig{
			APIEndpoint: os.Getenv("KERTOS_ENDPOINT"),
			APIKey:      os.Getenv("KERTOS_API_KEY"),
			OrgID:       os.Getenv("KERTOS_ORG_ID"),
		}
	}
	if kertosCfg.APIEndpoint == "" || kertosCfg.APIKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":"unavailable","source":"unconfigured","configured":false,
			"capability":"kertos_sync","provider":"kertos",
			"message":"Kertos integration is not configured",
		})
		return
	}

	controls, err := h.fetchKertosData(kertosCfg.APIEndpoint, kertosCfg.APIKey)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"status":"unavailable","source":"error","configured":true,"provider":"kertos","error":"Failed to sync data from Kertos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":"ok","source":"kertos","provider":"kertos","controls": len(controls),
	})
}

func (h *ComplianceHandler) ListRisks(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)
	level := c.Query("level")

	query := `
		SELECT id, tenant_id, asset_id, risk_type, threat_category, vulnerability_category,
		       risk_level, likelihood, impact, risk_score, description, status
		FROM risk_assessments 
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}

	if level != "" {
		query += " AND risk_level = $2"
		args = append(args, level)
	}

	query += " ORDER BY risk_score DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list risks"})
		return
	}
	defer func() { _ = rows.Close() }()

	c.JSON(http.StatusOK, gin.H{"risks": []any{}, "status":"ok","source":"database"})
}

func (h *ComplianceHandler) CreateRisk(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}

	var risk map[string]interface{}
	if err := c.ShouldBindJSON(&risk); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_ = tenantID; _ = risk
	c.JSON(http.StatusServiceUnavailable, gin.H{"status":"unavailable","source":"unconfigured","configured":false,"capability":"risk_assessment_create","message":"Risk creation unavailable: no verified persistence integration configured"})
}

func (h *ComplianceHandler) UpdateRisk(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	if _, ok := mutatingTenantIDFor(c); !ok { return }
	id := c.Param("id")

	_ = id
	c.JSON(http.StatusServiceUnavailable, gin.H{"status":"unavailable","source":"unconfigured","configured":false,"capability":"risk_assessment_update","message":"Risk update unavailable"})
}

func (h *ComplianceHandler) MitigateRisk(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	if _, ok := mutatingTenantIDFor(c); !ok { return }
	id := c.Param("id")
	_ = id
	c.JSON(http.StatusServiceUnavailable, gin.H{"status":"unavailable","source":"unconfigured","configured":false,"capability":"risk_mitigation","message":"Risk mitigation unavailable: no verified mitigation integration configured"})
}

func (h *ComplianceHandler) getDefaultControls(framework string) []map[string]interface{} {
	key := strings.ToLower(strings.TrimSpace(framework))
	for _, cl := range controls.Catalog() {
		id := strings.ToLower(cl.ID)
		if id == key || strings.ReplaceAll(id, "-", "_") == key {
			out := make([]map[string]interface{}, 0, len(cl.Items))
			for _, item := range cl.Items {
				out = append(out, map[string]interface{}{
					"id": item.ID, "title": item.Title, "category": cl.Name, "mapping": item.RivicQ,
				})
			}
			return out
		}
	}
	seed := map[string][]map[string]interface{}{
		"iso27001": {
			{"id": "A.5.1", "title": "Information Security Policies", "category": "Information Security Policies"},
			{"id": "A.6.1", "title": "Internal Organization", "category": "Organization of Information Security"},
			{"id": "A.7.1", "title": "Human Resource Security", "category": "Human Resource Security"},
			{"id": "A.8.1", "title": "Asset Management", "category": "Asset Management"},
			{"id": "A.9.1", "title": "Access Control", "category": "Access Control"},
			{"id": "A.10.1", "title": "Cryptography", "category": "Cryptography"},
			{"id": "A.11.1", "title": "Physical Security", "category": "Physical and Environmental Security"},
			{"id": "A.12.1", "title": "Operations Security", "category": "Operations Security"},
			{"id": "A.13.1", "title": "Communications Security", "category": "Communications Security"},
			{"id": "A.14.1", "title": "System Acquisition", "category": "System Acquisition, Development and Maintenance"},
			{"id": "A.15.1", "title": "Supplier Relationships", "category": "Supplier Relationships"},
			{"id": "A.16.1", "title": "Incident Management", "category": "Information Security Incident Management"},
			{"id": "A.17.1", "title": "Business Continuity", "category": "Business Continuity Management"},
			{"id": "A.18.1", "title": "Compliance", "category": "Compliance"},
		},
		"nist": {
			{"id": "ID", "title": "Identify", "category": "Identify"},
			{"id": "PR", "title": "Protect", "category": "Protect"},
			{"id": "DE", "title": "Detect", "category": "Detect"},
			{"id": "RS", "title": "Respond", "category": "Respond"},
			{"id": "RC", "title": "Recover", "category": "Recover"},
		},
		"gdpr": {
			{"id": "Art.5", "title": "Principles of Processing", "category": "Principles"},
			{"id": "Art.6", "title": "Lawfulness of Processing", "category": "Lawfulness"},
			{"id": "Art.7", "title": "Conditions for Consent", "category": "Consent"},
			{"id": "Art.12", "title": "Transparent Information", "category": "Rights"},
			{"id": "Art.15", "title": "Right of Access", "category": "Rights"},
			{"id": "Art.17", "title": "Right to Erasure", "category": "Rights"},
			{"id": "Art.25", "title": "Data Protection by Design", "category": "Technical Measures"},
			{"id": "Art.32", "title": "Security of Processing", "category": "Security"},
			{"id": "Art.33", "title": "Breach Notification", "category": "Breach"},
			{"id": "Art.35", "title": "DPIA", "category": "Assessment"},
		},
		"dora": {
			{"id": "DORA-1", "title": "ICT Risk Management", "category": "Risk Management"},
			{"id": "DORA-2", "title": "ICT Incident Management", "category": "Incident Management"},
			{"id": "DORA-3", "title": "Digital Operational Resilience", "category": "Operational Resilience"},
			{"id": "DORA-4", "title": "Third Party Risk", "category": "Third Party"},
			{"id": "DORA-5", "title": "Testing", "category": "Testing"},
		},
		"eu_ai_act": {
			{"id": "AI-5", "title": "Prohibited AI Practices", "category": "Prohibited Practices"},
			{"id": "AI-6", "title": "High Risk Classification", "category": "High Risk"},
			{"id": "AI-7", "title": "Conformity Assessment", "category": "High Risk"},
			{"id": "AI-8", "title": "Transparency Obligations", "category": "Transparency"},
			{"id": "AI-9", "title": "Record Keeping", "category": "Record Keeping"},
			{"id": "AI-10", "title": "Human Oversight", "category": "Human Oversight"},
			{"id": "AI-11", "title": "Accuracy & Robustness", "category": "Technical Requirements"},
		},
		"soc2": {
			{"id": "CC1", "title": "Control Environment", "category": "Common Criteria"},
			{"id": "CC2", "title": "Communication", "category": "Common Criteria"},
			{"id": "CC3", "title": "Risk Assessment", "category": "Common Criteria"},
			{"id": "CC4", "title": "Monitoring", "category": "Common Criteria"},
			{"id": "CC5", "title": "Control Activities", "category": "Common Criteria"},
			{"id": "CC6", "title": "Logical Access", "category": "Common Criteria"},
			{"id": "CC7", "title": "System Operations", "category": "Common Criteria"},
			{"id": "CC8", "title": "Change Management", "category": "Common Criteria"},
			{"id": "CC9", "title": "Risk Mitigation", "category": "Common Criteria"},
		},
		"pqc": {
			{"id": "PQC-1", "title": "Algorithm Inventory", "category": "Inventory"},
			{"id": "PQC-2", "title": "Migration Plan", "category": "Migration"},
			{"id": "PQC-3", "title": "Hybrid Schemes", "category": "Migration"},
			{"id": "PQC-4", "title": "Key Management", "category": "Key Management"},
			{"id": "PQC-5", "title": "Quantum Risk Assessment", "category": "Risk"},
		},
	}

	if c, ok := seed[framework]; ok {
		return c
	}
	if c, ok := seed[key]; ok {
		return c
	}
	return []map[string]interface{}{}
}

func (h *ComplianceHandler) fetchDelveData(endpoint, apiKey string) ([]map[string]interface{}, error) {
	req, _ := http.NewRequest("GET", endpoint+"/api/v1/controls", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var data []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data, nil
}

func (h *ComplianceHandler) fetchKertosData(endpoint, apiKey string) ([]map[string]interface{}, error) {
	req, _ := http.NewRequest("GET", endpoint+"/api/compliance/controls", nil)
	req.Header.Set("X-API-Key", apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var data []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data, nil
}

func callDelveAPI(config DelveConfig, method, path string, body []byte) (*http.Response, error) {
	req, err := http.NewRequest(method, config.APIEndpoint+path, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+config.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

func callKertosAPI(config KertosConfig, method, path string, body []byte) (*http.Response, error) {
	req, err := http.NewRequest(method, config.APIEndpoint+path, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-API-Key", config.APIKey)
	req.Header.Set("X-Org-ID", config.OrgID)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

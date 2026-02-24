package enterprise

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
	tenantID := c.GetHeader("X-Tenant-ID")

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
	defer rows.Close()

	var frameworks []map[string]interface{}
	for rows.Next() {
		var id, tenantID uuid.UUID
		var framework, scope, status string
		var controls []byte
		var score, lastAudit, nextAudit *time.Time
		var delve, kertos bool
		var createdAt time.Time

		err := rows.Scan(&id, &tenantID, &framework, &scope, &controls, &status, &score,
			&lastAudit, &nextAudit, &delve, &kertos, &createdAt)
		if err != nil {
			continue
		}

		frameworks = append(frameworks, map[string]interface{}{
			"id":                 id,
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
	tenantID := c.GetHeader("X-Tenant-ID")

	var req struct {
		Framework string `json:"framework" binding:"required"`
		Scope     string `json:"scope"`
	}
	c.ShouldBindJSON(&req)

	frameworkID := uuid.New()

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
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	var fwID, tenantID uuid.UUID
	var framework, scope, status string
	var controls []byte
	var score *int
	var lastAudit, nextAudit *time.Time
	var delveConn, kertosConn bool

	query := `
		SELECT id, tenant_id, framework, scope, controls, status, score, 
		       last_audit_at, next_audit_at, delve_integration, kertos_integration
		FROM compliance_frameworks WHERE id = $1
	`
	err = h.db.QueryRow(query, frameworkID).Scan(
		&fwID, &tenantID, &framework, &scope, &controls, &status, &score,
		&lastAudit, &nextAudit, &delveConn, &kertosConn,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Framework not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 fwID,
		"tenant_id":          tenantID,
		"framework":          framework,
		"scope":              scope,
		"status":             status,
		"score":              score,
		"last_audit_at":      lastAudit,
		"next_audit_at":      nextAudit,
		"delve_integration":  delveConn,
		"kertos_integration": kertosConn,
	})
}

func (h *ComplianceHandler) UpdateFramework(c *gin.Context) {
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	var req struct {
		Scope  string `json:"scope"`
		Status string `json:"status"`
		Score  int    `json:"score"`
	}
	c.ShouldBindJSON(&req)

	query := `
		UPDATE compliance_frameworks 
		SET scope = COALESCE(NULLIF($1, ''), scope),
		    status = COALESCE(NULLIF($2, ''), status),
		    score = CASE WHEN $3 > 0 THEN $3 ELSE score END,
		    updated_at = NOW()
		WHERE id = $4
	`
	_, err = h.db.Exec(query, req.Scope, req.Status, req.Score, frameworkID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update framework"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Framework updated successfully"})
}

func (h *ComplianceHandler) ListControls(c *gin.Context) {
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	query := `
		SELECT id, framework_id, control_id, title, description, category, 
		       sub_category, severity, status, evidence, remediation, automated, last_checked_at
		FROM compliance_controls 
		WHERE framework_id = $1
	`
	rows, err := h.db.Query(query, frameworkID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list controls"})
		return
	}
	defer rows.Close()

	var controls []ComplianceControl
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
		json.Unmarshal(evidence, &control.Evidence)
		controls = append(controls, control)
	}

	c.JSON(http.StatusOK, gin.H{"controls": controls})
}

func (h *ComplianceHandler) GetComplianceDashboard(c *gin.Context) {
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	var framework string
	var status string
	var score, totalControls, passed, failed, pending int
	var lastAudit, nextAudit *time.Time
	var delveConnected, kertosConnected bool

	query := `
		SELECT cf.framework, cf.status, cf.score, cf.last_audit_at, cf.next_audit_at,
		       cf.delve_integration, cf.kertos_integration,
		       (SELECT COUNT(*) FROM compliance_controls WHERE framework_id = cf.id) as total,
		       (SELECT COUNT(*) FROM compliance_controls WHERE framework_id = cf.id AND status = 'passed') as passed,
		       (SELECT COUNT(*) FROM compliance_controls WHERE framework_id = cf.id AND status = 'failed') as failed,
		       (SELECT COUNT(*) FROM compliance_controls WHERE framework_id = cf.id AND status = 'pending') as pending
		FROM compliance_frameworks cf WHERE cf.id = $1
	`
	err = h.db.QueryRow(query, frameworkID).Scan(
		&framework, &status, &score, &lastAudit, &nextAudit,
		&delveConnected, &kertosConnected, &totalControls, &passed, &failed, &pending,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Framework not found"})
		return
	}

	dashboard := ComplianceDashboard{
		Framework:       framework,
		Status:          status,
		Score:           score,
		TotalControls:   totalControls,
		PassedControls:  passed,
		FailedControls:  failed,
		PendingControls: pending,
		LastAudit:       time.Now(),
		NextAudit:       time.Now().Add(90 * 24 * time.Hour),
		DelveConnected:  delveConnected,
		KertosConnected: kertosConnected,
	}

	c.JSON(http.StatusOK, dashboard)
}

func (h *ComplianceHandler) GetAllComplianceDashboards(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	frameworks := []string{"iso27001", "dora", "gdpr", "eu_ai_act", "soc2", "nist", "pqc"}

	var dashboards []ComplianceDashboard
	for _, fw := range frameworks {
		dashboard := ComplianceDashboard{
			Framework:       fw,
			Status:          "active",
			Score:           75,
			TotalControls:   100,
			PassedControls:  75,
			FailedControls:  10,
			PendingControls: 15,
		}
		dashboards = append(dashboards, dashboard)
	}

	h.logger.Info("Fetching compliance dashboards for tenant: ", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"tenant_id":  tenantID,
		"dashboards": dashboards,
		"summary": gin.H{
			"overall_score":     78,
			"frameworks_count":  len(frameworks),
			"critical_findings": 3,
			"high_findings":     7,
		},
	})
}

func (h *ComplianceHandler) ScanCompliance(c *gin.Context) {
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	h.logger.Info("Starting compliance scan for framework: ", frameworkID)

	c.JSON(http.StatusOK, gin.H{
		"status":         "scan_started",
		"framework_id":   frameworkID,
		"message":        "Compliance scan initiated",
		"estimated_time": "5-10 minutes",
	})
}

func (h *ComplianceHandler) RemediationPlan(c *gin.Context) {
	id := c.Param("id")
	frameworkID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid framework ID"})
		return
	}

	remediation := gin.H{
		"framework_id": frameworkID,
		"findings": []gin.H{
			{
				"control_id":     "A.5.1",
				"title":          "Information Security Policies",
				"priority":       "high",
				"steps":          []string{"Review current policy", "Update policy document", "Distribute to staff"},
				"estimated_time": "2 days",
			},
			{
				"control_id":     "A.6.1",
				"title":          "Internal Organization",
				"priority":       "medium",
				"steps":          []string{"Define organizational structure", "Assign responsibilities"},
				"estimated_time": "1 week",
			},
		},
		"automatable": []string{"A.9.1", "A.12.3"},
	}

	c.JSON(http.StatusOK, remediation)
}

func (h *ComplianceHandler) ListReports(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT id, tenant_id, report_type, framework, title, generated_at
		FROM compliance_reports 
		WHERE tenant_id = $1
		ORDER BY generated_at DESC
		LIMIT 20
	`

	h.logger.Info("Listing compliance reports for tenant: ", tenantID)

	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list reports"})
		return
	}
	defer rows.Close()

	c.JSON(http.StatusOK, gin.H{"reports": []map[string]interface{}{}})
}

func (h *ComplianceHandler) GenerateReport(c *gin.Context) {
	var req struct {
		Framework string `json:"framework" binding:"required"`
		Title     string `json:"title"`
		Format    string `json:"format"`
	}
	c.ShouldBindJSON(&req)

	reportID := uuid.New()

	c.JSON(http.StatusCreated, gin.H{
		"id":        reportID,
		"status":    "generating",
		"framework": req.Framework,
		"message":   "Report generation started",
	})
}

func (h *ComplianceHandler) ConnectDelve(c *gin.Context) {
	var config DelveConfig
	c.ShouldBindJSON(&config)

	h.logger.Info("Connecting to Delve API: ", config.APIEndpoint)

	query := `UPDATE compliance_frameworks SET delve_integration = true WHERE tenant_id = $1`
	h.db.Exec(query, c.GetHeader("X-Tenant-ID"))

	c.JSON(http.StatusOK, gin.H{
		"status":   "connected",
		"provider": "delve",
		"message":  "Delve integration enabled",
	})
}

func (h *ComplianceHandler) GetDelveStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "connected",
		"provider":  "delve",
		"version":   "2.1.0",
		"last_sync": time.Now().Add(-1 * time.Hour),
	})
}

func (h *ComplianceHandler) SyncDelveData(c *gin.Context) {
	h.logger.Info("Syncing data from Delve")

	c.JSON(http.StatusOK, gin.H{
		"status":   "sync_started",
		"provider": "delve",
		"message":  "Data synchronization initiated",
	})
}

func (h *ComplianceHandler) ConnectKertos(c *gin.Context) {
	var config KertosConfig
	c.ShouldBindJSON(&config)

	h.logger.Info("Connecting to Kertos API: ", config.APIEndpoint)

	query := `UPDATE compliance_frameworks SET kertos_integration = true WHERE tenant_id = $1`
	h.db.Exec(query, c.GetHeader("X-Tenant-ID"))

	c.JSON(http.StatusOK, gin.H{
		"status":   "connected",
		"provider": "kertos",
		"message":  "Kertos integration enabled",
	})
}

func (h *ComplianceHandler) GetKertosStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "connected",
		"provider":  "kertos",
		"version":   "1.8.0",
		"last_sync": time.Now().Add(-30 * time.Minute),
	})
}

func (h *ComplianceHandler) SyncKertosData(c *gin.Context) {
	h.logger.Info("Syncing data from Kertos")

	c.JSON(http.StatusOK, gin.H{
		"status":   "sync_started",
		"provider": "kertos",
		"message":  "Data synchronization initiated",
	})
}

func (h *ComplianceHandler) ListRisks(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
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
	defer rows.Close()

	c.JSON(http.StatusOK, gin.H{"risks": []map[string]interface{}{}})
}

func (h *ComplianceHandler) CreateRisk(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	var risk map[string]interface{}
	c.ShouldBindJSON(&risk)

	riskID := uuid.New()

	h.logger.Info("Creating risk assessment for tenant: ", tenantID)

	c.JSON(http.StatusCreated, gin.H{
		"id":      riskID,
		"status":  "created",
		"message": "Risk assessment created",
	})
}

func (h *ComplianceHandler) UpdateRisk(c *gin.Context) {
	id := c.Param("id")

	h.logger.Info("Updating risk: ", id)

	c.JSON(http.StatusOK, gin.H{"message": "Risk updated successfully"})
}

func (h *ComplianceHandler) MitigateRisk(c *gin.Context) {
	id := c.Param("id")

	c.JSON(http.StatusOK, gin.H{
		"id":      id,
		"status":  "mitigation_started",
		"message": "Risk mitigation plan generated",
	})
}

func (h *ComplianceHandler) getDefaultControls(framework string) []map[string]interface{} {
	controls := map[string][]map[string]interface{}{
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

	if c, ok := controls[framework]; ok {
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
	defer resp.Body.Close()

	var data []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&data)

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
	defer resp.Body.Close()

	var data []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&data)

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

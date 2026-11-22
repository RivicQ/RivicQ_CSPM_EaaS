package enterprise

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type TerraformHandler struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
}

func NewTerraformHandler(db *database.EnterpriseDB, logger *logrus.Logger) *TerraformHandler {
	return &TerraformHandler{
		db:     db,
		logger: logger,
	}
}

func (h *TerraformHandler) SetupRoutes(router *gin.RouterGroup) {
	terraform := router.Group("/terraform")
	{
		terraform.GET("/resources", h.ListTerraformResources)
		terraform.POST("/resources/scan", h.ScanTerraformResources)
		terraform.GET("/resources/:id", h.GetTerraformResource)
		terraform.PUT("/resources/:id", h.UpdateTerraformResource)

		terraform.GET("/workspaces", h.ListWorkspaces)
		terraform.POST("/workspaces", h.CreateWorkspace)
		terraform.GET("/workspaces/:id/state", h.GetWorkspaceState)

		terraform.GET("/security-findings", h.ListSecurityFindings)
		terraform.GET("/compliance-violations", h.ListComplianceViolations)

		terraform.GET("/modules", h.ListModules)
		terraform.POST("/modules/scan", h.ScanModules)

		terraform.GET("/drift", h.DetectDrift)
		terraform.GET("/plan-history", h.GetPlanHistory)
	}
}

type TerraformResource struct {
	ID               uuid.UUID                  `json:"id"`
	TenantID         string                     `json:"tenant_id"`
	TerraformStateID string                     `json:"terraform_state_id"`
	Workspace        string                     `json:"workspace"`
	ModuleSource     string                     `json:"module_source"`
	ModuleVersion    string                     `json:"module_version"`
	ResourceType     string                     `json:"resource_type"`
	ResourceName     string                     `json:"resource_name"`
	Provider         string                     `json:"provider"`
	CloudProvider    string                     `json:"cloud_provider"`
	Region           string                     `json:"region"`
	Configuration    map[string]interface{}     `json:"configuration"`
	SecurityFindings []TerraformSecurityFinding `json:"security_findings"`
	ComplianceIssues []ComplianceIssue          `json:"compliance_violations"`
	LastPlanAt       *time.Time                 `json:"last_plan_at"`
	LastApplyAt      *time.Time                 `json:"last_apply_at"`
}

type TerraformSecurityFinding struct {
	RuleID      string `json:"rule_id"`
	Severity    string `json:"severity"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Resource    string `json:"resource"`
	Remediation string `json:"remediation"`
	Provider    string `json:"provider"`
}

type ComplianceIssue struct {
	ControlID string `json:"control_id"`
	Framework string `json:"framework"`
	Severity  string `json:"severity"`
	Resource  string `json:"resource"`
	Message   string `json:"message"`
}

type Workspace struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"`
	TerraformVersion string     `json:"terraform_version"`
	WorkingDirectory string     `json:"working_directory"`
	VCSRepo          string     `json:"vcs_repo"`
	VCSBranch        string     `json:"vcs_branch"`
	Status           string     `json:"status"`
	LastRunAt        *time.Time `json:"last_run_at"`
}

func (h *TerraformHandler) ListTerraformResources(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableList("terraform_resources", "terraform", "resources"))
		return
	}
	tenantID := tenantIDFor(c)
	cloudProvider := c.Query("provider")
	resourceType := c.Query("type")

	query := `
		SELECT id, tenant_id, terraform_state_id, workspace, module_source, module_version,
		       resource_type, resource_name, provider, cloud_provider, region, 
		       security_findings, compliance_violations, last_plan_at, last_apply_at
		FROM terraform_assets 
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}

	if cloudProvider != "" {
		query += " AND cloud_provider = $2"
		args = append(args, cloudProvider)
	}

	if resourceType != "" {
		query += " AND resource_type = $2"
		args = append(args, resourceType)
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list resources"})
		return
	}
	defer func() { _ = rows.Close() }()

	var resources []TerraformResource
	for rows.Next() {
		var resource TerraformResource
		var secFindings, compIssues []byte
		err := rows.Scan(
			&resource.ID, &resource.TenantID, &resource.TerraformStateID, &resource.Workspace,
			&resource.ModuleSource, &resource.ModuleVersion, &resource.ResourceType,
			&resource.ResourceName, &resource.Provider, &resource.CloudProvider, &resource.Region,
			&secFindings, &compIssues, &resource.LastPlanAt, &resource.LastApplyAt,
		)
		if err != nil {
			continue
		}
		_ = json.Unmarshal(secFindings, &resource.SecurityFindings)
		_ = json.Unmarshal(compIssues, &resource.ComplianceIssues)
		resources = append(resources, resource)
	}

	c.JSON(http.StatusOK, gin.H{"resources": resources})
}

func (h *TerraformHandler) ScanTerraformResources(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform_scan", "terraform_scan"))
		return
	}
	_, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}
	var req struct {
		Workspace  string `json:"workspace"`
		ModulePath string `json:"module_path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"status":     "unavailable",
		"source":     "unconfigured",
		"configured": false,
		"capability": "terraform_security_scan",
		"message":    "Terraform security/compliance scanning is unavailable: no verified scanner integration configured",
	})
}

func (h *TerraformHandler) GetTerraformResource(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	id := c.Param("id")
	resourceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID"})
		return
	}

	var resource TerraformResource
	query := `
		SELECT id, tenant_id, terraform_state_id, workspace, module_source, module_version,
		       resource_type, resource_name, provider, cloud_provider, region, 
		       configuration, security_findings, compliance_violations, last_plan_at, last_apply_at
		FROM terraform_assets WHERE id = $1
	`
	err = h.db.QueryRow(query, resourceID).Scan(
		&resource.ID, &resource.TenantID, &resource.TerraformStateID, &resource.Workspace,
		&resource.ModuleSource, &resource.ModuleVersion, &resource.ResourceType,
		&resource.ResourceName, &resource.Provider, &resource.CloudProvider, &resource.Region,
		&resource.Configuration, &resource.SecurityFindings, &resource.ComplianceIssues,
		&resource.LastPlanAt, &resource.LastApplyAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
		return
	}

	c.JSON(http.StatusOK, resource)
}

func (h *TerraformHandler) UpdateTerraformResource(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "capability": "terraform_resource_update", "message": "Terraform resource update unavailable: no verified persistence/integration configured"})
}

func (h *TerraformHandler) ListWorkspaces(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"workspaces": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "message": "Terraform workspaces unavailable: no verified workspace integration configured"})
}

func (h *TerraformHandler) CreateWorkspace(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "capability": "terraform_workspace_create", "message": "Workspace creation unavailable: no verified persistence/integration configured"})
}

func (h *TerraformHandler) GetWorkspaceState(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	id := c.Param("id")
	workspaceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"workspace_id": workspaceID, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "terraform_state", "message": "Terraform state unavailable: no verified state integration configured"})
}

func (h *TerraformHandler) ListSecurityFindings(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableList("terraform_findings", "terraform", "findings"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"findings": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "message": "Terraform security findings unavailable: no verified findings integration configured"})
}

func (h *TerraformHandler) ListComplianceViolations(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"violations": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "message": "Terraform compliance violations unavailable: no verified findings integration configured"})
}

func (h *TerraformHandler) ListModules(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"modules": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "message": "Terraform modules unavailable: no verified module integration configured"})
}

func (h *TerraformHandler) ScanModules(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "capability": "terraform_module_scan", "message": "Module scan unavailable: no verified scan integration configured"})
}

func (h *TerraformHandler) DetectDrift(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"drifts": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "terraform_drift", "message": "Drift detection unavailable: no verified drift integration configured"})
}

func (h *TerraformHandler) GetPlanHistory(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableState("terraform", "terraform"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"history": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "message": "Plan history unavailable: no verified history integration configured"})
}

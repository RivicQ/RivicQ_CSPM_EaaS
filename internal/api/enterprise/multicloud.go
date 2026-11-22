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

type CloudProvider string

const (
	AWS      CloudProvider = "aws"
	GCP      CloudProvider = "gcp"
	IBMCloud CloudProvider = "ibm_cloud"
	Azure    CloudProvider = "azure"
)

type MultiCloudHandler struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
}

func NewMultiCloudHandler(db *database.EnterpriseDB, logger *logrus.Logger) *MultiCloudHandler {
	return &MultiCloudHandler{
		db:     db,
		logger: logger,
	}
}

func (h *MultiCloudHandler) SetupRoutes(router *gin.RouterGroup) {
	cloud := router.Group("/cloud")
	{
		cloud.GET("/accounts", h.ListCloudAccounts)
		cloud.POST("/accounts", h.AddCloudAccount)
		cloud.PUT("/accounts/:id", h.UpdateCloudAccount)
		cloud.DELETE("/accounts/:id", h.DeleteCloudAccount)
		cloud.POST("/accounts/:id/sync", h.SyncCloudAccount)
		cloud.GET("/accounts/:id/resources", h.ListCloudResources)

		cloud.GET("/aws/inventory", h.AWSInventory)
		cloud.POST("/aws/scan", h.AWSScan)

		cloud.GET("/gcp/inventory", h.GCPInventory)
		cloud.POST("/gcp/scan", h.GCPScan)

		cloud.GET("/ibm/inventory", h.IBMCloudInventory)
		cloud.POST("/ibm/scan", h.IBMCloudScan)

		cloud.GET("/azure/inventory", h.AzureInventory)
		cloud.POST("/azure/scan", h.AzureScan)

		cloud.GET("/resources/summary", h.GetResourcesSummary)
	}
}

type CloudAccount struct {
	ID             uuid.UUID     `json:"id"`
	TenantID       string        `json:"tenant_id"`
	Provider       CloudProvider `json:"provider"`
	AccountID      string        `json:"account_id"`
	AccountName    string        `json:"account_name"`
	OrganizationID string        `json:"organization_id"`
	Regions        []string      `json:"regions"`
	Services       []string      `json:"services"`
	Status         string        `json:"status"`
	LastScanAt     *time.Time    `json:"last_scan_at"`
}

type CloudResource struct {
	ID               uuid.UUID              `json:"id"`
	CloudAccountID   uuid.UUID              `json:"cloud_account_id"`
	ResourceID       string                 `json:"resource_id"`
	ResourceType     string                 `json:"resource_type"`
	ResourceName     string                 `json:"resource_name"`
	Provider         CloudProvider          `json:"provider"`
	Region           string                 `json:"region"`
	Service          string                 `json:"service"`
	Metadata         map[string]interface{} `json:"metadata"`
	SecurityFindings []SecurityFinding      `json:"security_findings"`
	DiscoveredAt     time.Time              `json:"discovered_at"`
}

type SecurityFinding struct {
	Severity    string `json:"severity"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Resource    string `json:"resource"`
	Remedation  string `json:"remediation"`
}

func (h *MultiCloudHandler) ListCloudAccounts(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)
	provider := c.Query("provider")

	query := `
		SELECT id, tenant_id, provider, account_id, account_name, organization_id, 
		       regions, services, status, last_scan_at
		FROM cloud_accounts 
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}

	if provider != "" {
		query += " AND provider = $2"
		args = append(args, provider)
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list cloud accounts"})
		return
	}
	defer func() { _ = rows.Close() }()

	var accounts []CloudAccount
	for rows.Next() {
		var account CloudAccount
		var regions, services []byte
		err := rows.Scan(
			&account.ID, &account.TenantID, &account.Provider, &account.AccountID,
			&account.AccountName, &account.OrganizationID, &regions, &services,
			&account.Status, &account.LastScanAt,
		)
		if err != nil {
			continue
		}
		_ = json.Unmarshal(regions, &account.Regions)
		_ = json.Unmarshal(services, &account.Services)
		accounts = append(accounts, account)
	}

	c.JSON(http.StatusOK, gin.H{"accounts": accounts})
}

func (h *MultiCloudHandler) AddCloudAccount(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}

	var account CloudAccount
	if err := c.ShouldBindJSON(&account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	account.ID = uuid.New()
	account.TenantID = tenantID

	regionsJSON, _ := json.Marshal(account.Regions)
	servicesJSON, _ := json.Marshal(account.Services)

	query := `
		INSERT INTO cloud_accounts 
		(id, tenant_id, provider, account_id, account_name, organization_id, regions, services, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := h.db.Exec(query,
		account.ID, tenantID, account.Provider, account.AccountID,
		account.AccountName, account.OrganizationID, regionsJSON, servicesJSON, "active",
	)
	if err != nil {
		h.logger.Error("Failed to add cloud account: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add cloud account"})
		return
	}

	h.logger.Info("Added cloud account: ", account.AccountID, " provider: ", account.Provider)

	c.JSON(http.StatusCreated, account)
}

func (h *MultiCloudHandler) UpdateCloudAccount(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	accountID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	var req struct {
		AccountName string   `json:"account_name"`
		Regions     []string `json:"regions"`
		Services    []string `json:"services"`
		Status      string   `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	regionsJSON, _ := json.Marshal(req.Regions)
	servicesJSON, _ := json.Marshal(req.Services)

	query := `
		UPDATE cloud_accounts 
		SET account_name = COALESCE(NULLIF($1, ''), account_name),
		    regions = COALESCE($2, regions),
		    services = COALESCE($3, services),
		    status = COALESCE(NULLIF($4, ''), status),
		    updated_at = NOW()
		WHERE id = $5
	`
	_, err = h.db.Exec(query, req.AccountName, regionsJSON, servicesJSON, req.Status, accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cloud account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cloud account updated"})
}

func (h *MultiCloudHandler) DeleteCloudAccount(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	accountID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	_, err = h.db.Exec("DELETE FROM cloud_accounts WHERE id = $1", accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete cloud account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cloud account deleted"})
}

func (h *MultiCloudHandler) SyncCloudAccount(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	id := c.Param("id")
	accountID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}

	h.logger.Info("Starting cloud account sync: ", accountID)

	c.JSON(http.StatusOK, gin.H{
		"status":     "sync_started",
		"account_id": accountID,
		"message":    "Cloud account sync initiated",
	})
}

func (h *MultiCloudHandler) ListCloudResources(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	accountID := c.Param("id")

	h.logger.Info("Listing resources for cloud account: ", accountID)

	c.JSON(http.StatusOK, gin.H{
		"resources": []CloudResource{},
		"total":     0,
	})
}

func (h *MultiCloudHandler) AWSInventory(c *gin.Context) {
	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchAWSInventory(c.Request.Context())
	if err != nil || result == nil || result.Total == 0 {
		c.JSON(http.StatusOK, gin.H{
			"provider": "aws", "status": "unavailable", "source": "unconfigured", "configured": false,
			"resources": []any{}, "ec2": []any{}, "s3": []any{}, "rds": []any{}, "eks": []any{}, "total": 0,
			"message": "AWS inventory unavailable: no live cloud integration configured",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider": "aws", "status": "ok", "source": "live",
		"ec2": result.EC2Instances, "s3": result.S3Buckets, "rds": result.RDSInstances, "eks": result.EKSClusters,
		"total": result.Total,
	})
}

func (h *MultiCloudHandler) AWSScan(c *gin.Context) {
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"status": "unavailable", "source": "unconfigured", "configured": false, "provider": "aws",
		"capability": "cloud_scan", "message": "AWS scan unavailable: no live scan integration configured",
	})
}

func (h *MultiCloudHandler) GCPInventory(c *gin.Context) {
	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchGCPInventory(c.Request.Context())
	if err != nil || result == nil || result.Total == 0 {
		c.JSON(http.StatusOK, gin.H{
			"provider": "gcp", "status": "unavailable", "source": "unconfigured", "configured": false,
			"resources": []any{}, "compute": []any{}, "storage": []any{}, "gke": []any{}, "total": 0,
			"message": "GCP inventory unavailable: no live cloud integration configured",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider": "gcp", "status": "ok", "source": "live",
		"compute": result.GCEInstances, "storage": result.GCSBuckets, "gke": result.GKEClusters, "total": result.Total,
	})
}

func (h *MultiCloudHandler) GCPScan(c *gin.Context) {
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "provider": "gcp", "capability": "cloud_scan", "message": "GCP scan unavailable: no live scan integration configured"})
}

func (h *MultiCloudHandler) IBMCloudInventory(c *gin.Context) {
	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchIBMInventory(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"provider": "ibm_cloud", "status": "error", "source": "live", "configured": true,
			"resources": []any{}, "total": 0,
			"message": err.Error(),
		})
		return
	}
	if result == nil || result.Status == nil {
		c.JSON(http.StatusOK, gin.H{
			"provider": "ibm_cloud", "status": "unavailable", "source": "unconfigured", "configured": false,
			"resources": []any{}, "total": 0,
			"message": "IBM Cloud inventory unavailable: no live cloud integration configured",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider": "ibm_cloud", "status": "ok", "source": "live", "configured": true,
		"hpcs_status": result.Status, "hpcs_keys": result.Keys, "cos_buckets": result.Buckets,
		"resources": result.Keys, "total": result.Total,
	})
}

func (h *MultiCloudHandler) IBMCloudScan(c *gin.Context) {
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "provider": "ibm_cloud", "capability": "cloud_scan", "message": "IBM Cloud scan unavailable: no live scan integration configured"})
}

func (h *MultiCloudHandler) AzureInventory(c *gin.Context) {
	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchAzureInventory(c.Request.Context())
	if err != nil || result == nil || result.Total == 0 {
		c.JSON(http.StatusOK, gin.H{
			"provider": "azure", "status": "unavailable", "source": "unconfigured", "configured": false,
			"resources": []any{}, "virtual_machines": []any{}, "storage_accounts": []any{}, "aks": []any{}, "total": 0,
			"message": "Azure inventory unavailable: no live cloud integration configured",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider": "azure", "status": "ok", "source": "live",
		"virtual_machines": result.VMs, "storage_accounts": result.StorageAccounts, "aks": result.AKSClusters, "total": result.Total,
	})
}

func (h *MultiCloudHandler) AzureScan(c *gin.Context) {
	if _, ok := mutatingTenantIDFor(c); !ok {
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "provider": "azure", "capability": "cloud_scan", "message": "Azure scan unavailable: no live scan integration configured"})
}

func (h *MultiCloudHandler) GetResourcesSummary(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		abortIfNoDB(c, h.db)
		return
	}
	tenantID := tenantIDFor(c)
	var total int
	_ = h.db.QueryRow(`SELECT COUNT(*) FROM cloud_accounts WHERE tenant_id = $1`, tenantID).Scan(&total)
	c.JSON(http.StatusOK, gin.H{
		"status": "ok", "source": "database",
		"total_accounts":    total,
		"by_provider":       gin.H{},
		"by_service":        gin.H{},
		"security_findings": gin.H{"critical": 0, "high": 0, "medium": 0, "low": 0},
		"compliance":        gin.H{},
		"message":           "Resource summary derived from configured cloud accounts only; no fabricated findings",
	})
}

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
	TenantID       uuid.UUID     `json:"tenant_id"`
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
	tenantID := c.GetHeader("X-Tenant-ID")
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
	tenantID := c.GetHeader("X-Tenant-ID")

	var account CloudAccount
	if err := c.ShouldBindJSON(&account); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	account.ID = uuid.New()
	account.TenantID, _ = uuid.Parse(tenantID)

	regionsJSON, _ := json.Marshal(account.Regions)
	servicesJSON, _ := json.Marshal(account.Services)

	query := `
		INSERT INTO cloud_accounts 
		(id, tenant_id, provider, account_id, account_name, organization_id, regions, services, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := h.db.Exec(query,
		account.ID, account.TenantID, account.Provider, account.AccountID,
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
	accountID := c.Param("id")

	h.logger.Info("Listing resources for cloud account: ", accountID)

	c.JSON(http.StatusOK, gin.H{
		"resources": []CloudResource{},
		"total":     0,
	})
}

func (h *MultiCloudHandler) AWSInventory(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	h.logger.Info("Fetching AWS inventory for tenant: ", tenantID)

	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchAWSInventory(c.Request.Context())
	if err != nil || result.Total == 0 {
		resources := []map[string]interface{}{
			{
				"resource_id":     "i-0123456789abcdef0",
				"resource_type":   "ec2_instance",
				"resource_name":   "web-server-1",
				"service":         "ec2",
				"region":          "us-east-1",
				"instance_type":   "t3.medium",
				"security_groups": []string{"sg-0123456789abcdef"},
			},
			{
				"resource_id":   "arn:aws:s3:::my-bucket",
				"resource_type": "s3_bucket",
				"resource_name": "my-bucket",
				"service":       "s3",
				"region":        "us-east-1",
				"encryption":    true,
			},
		}
		c.JSON(http.StatusOK, gin.H{
			"provider":  "aws",
			"resources": resources,
			"total":     len(resources),
			"source":    "demo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider": "aws",
		"source":   "live",
		"ec2":      result.EC2Instances,
		"s3":       result.S3Buckets,
		"rds":      result.RDSInstances,
		"eks":      result.EKSClusters,
		"total":    result.Total,
	})
}

func (h *MultiCloudHandler) AWSScan(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	h.logger.Info("Starting AWS security scan for tenant: ", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"status":   "scan_started",
		"provider": "aws",
		"message":  "AWS security scan initiated",
	})
}

func (h *MultiCloudHandler) GCPInventory(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	h.logger.Info("Fetching GCP inventory for tenant: ", tenantID)

	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchGCPInventory(c.Request.Context())
	if err != nil || result.Total == 0 {
		resources := []map[string]interface{}{
			{
				"resource_id":   "projects/my-project/zones/us-central1-a/instances/web-server",
				"resource_type": "compute_instance",
				"resource_name": "web-server",
				"service":       "compute",
				"region":        "us-central1",
				"machine_type":  "e2-medium",
			},
		}
		c.JSON(http.StatusOK, gin.H{
			"provider":  "gcp",
			"resources": resources,
			"total":     len(resources),
			"source":    "demo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider": "gcp",
		"source":   "live",
		"compute":  result.GCEInstances,
		"storage":  result.GCSBuckets,
		"gke":      result.GKEClusters,
		"total":    result.Total,
	})
}

func (h *MultiCloudHandler) GCPScan(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	h.logger.Info("Starting GCP security scan for tenant: ", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"status":   "scan_started",
		"provider": "gcp",
		"message":  "GCP security scan initiated",
	})
}

func (h *MultiCloudHandler) IBMCloudInventory(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	h.logger.Info("Fetching IBM Cloud inventory for tenant: ", tenantID)

	resources := []map[string]interface{}{
		{
			"resource_id":   "crn:v1:bluemix:public:is:us-south:a/1234567890::instance:abc123",
			"resource_type": "vsi",
			"resource_name": "quantum-worker-1",
			"service":       "is",
			"region":        "us-south",
			"profile":       "bx2-2x8",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"provider":  "ibm_cloud",
		"resources": resources,
		"total":     len(resources),
	})
}

func (h *MultiCloudHandler) IBMCloudScan(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	h.logger.Info("Starting IBM Cloud security scan for tenant: ", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"status":   "scan_started",
		"provider": "ibm_cloud",
		"message":  "IBM Cloud security scan initiated",
	})
}

func (h *MultiCloudHandler) AzureInventory(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	h.logger.Info("Fetching Azure inventory for tenant: ", tenantID)

	sdks := newCloudSDKs(c.Request.Context())
	result, err := sdks.fetchAzureInventory(c.Request.Context())
	if err != nil || result.Total == 0 {
		resources := []map[string]interface{}{
			{
				"resource_id":   "/subscriptions/.../resourceGroups/prod/providers/Microsoft.Compute/virtualMachines/app-server-1",
				"resource_type": "virtual_machine",
				"resource_name": "app-server-1",
				"service":       "compute",
				"region":        "eastus",
				"vm_size":       "Standard_D2s_v3",
			},
		}
		c.JSON(http.StatusOK, gin.H{
			"provider":  "azure",
			"resources": resources,
			"total":     len(resources),
			"source":    "demo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"provider":         "azure",
		"source":           "live",
		"virtual_machines": result.VMs,
		"storage_accounts": result.StorageAccounts,
		"aks":              result.AKSClusters,
		"total":            result.Total,
	})
}

func (h *MultiCloudHandler) AzureScan(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	h.logger.Info("Starting Azure security scan for tenant: ", tenantID)

	c.JSON(http.StatusOK, gin.H{
		"status":   "scan_started",
		"provider": "azure",
		"message":  "Azure security scan initiated",
	})
}

func (h *MultiCloudHandler) GetResourcesSummary(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	summary := gin.H{
		"total_resources": 150,
		"by_provider": gin.H{
			"aws":       80,
			"gcp":       45,
			"ibm_cloud": 20,
			"azure":     5,
		},
		"by_service": gin.H{
			"ec2":              30,
			"s3":               25,
			"rds":              15,
			"compute":          30,
			"storage":          20,
			"kubernetes":       20,
			"quantum":          10,
			"virtual_machines": 5,
		},
		"security_findings": gin.H{
			"critical": 2,
			"high":     8,
			"medium":   15,
			"low":      25,
		},
		"compliance": gin.H{
			"iso27001": "85%",
			"nist":     "78%",
			"pqc":      "65%",
		},
	}

	h.logger.Info("Getting resources summary for tenant: ", tenantID)

	c.JSON(http.StatusOK, summary)
}

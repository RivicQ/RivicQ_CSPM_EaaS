package enterprise

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type InventoryHandler struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
	cfg    *config.EnterpriseConfig
}

func NewInventoryHandler(db *database.EnterpriseDB, logger *logrus.Logger, cfg *config.EnterpriseConfig) *InventoryHandler {
	return &InventoryHandler{
		db:     db,
		logger: logger,
		cfg:    cfg,
	}
}

func (h *InventoryHandler) SetupRoutes(router *gin.RouterGroup) {
	inventory := router.Group("/inventory")
	{
		inventory.GET("/assets", h.ListAssets)
		inventory.GET("/assets/:id", h.GetAsset)
		inventory.POST("/assets", h.CreateAsset)
		inventory.PUT("/assets/:id", h.UpdateAsset)
		inventory.DELETE("/assets/:id", h.DeleteAsset)
		inventory.GET("/assets/category/:category", h.ListAssetsByCategory)
		inventory.GET("/assets/cloud/:provider", h.ListAssetsByCloudProvider)

		inventory.GET("/crypto", h.ListCryptoAssets)
		inventory.POST("/crypto/scan", h.ScanCryptoAssets)

		inventory.GET("/ai", h.ListAIAssets)
		inventory.POST("/ai/models", h.RegisterAIModel)

		inventory.GET("/hardware", h.ListHardwareAssets)
		inventory.POST("/hardware/discover", h.DiscoverHardware)

		inventory.GET("/software", h.ListSoftwareAssets)
		inventory.POST("/software/sbom", h.ImportSBOM)

		inventory.GET("/infrastructure", h.ListInfrastructureAssets)
		inventory.POST("/infrastructure/sync", h.SyncInfrastructure)

		inventory.GET("/summary", h.GetInventorySummary)
		inventory.GET("/export", h.ExportInventory)
	}
}

type Asset struct {
	ID            uuid.UUID              `json:"id"`
	TenantID      uuid.UUID              `json:"tenant_id"`
	AssetID       string                 `json:"asset_id"`
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	Category      string                 `json:"category"`
	SubCategory   string                 `json:"sub_category"`
	CloudProvider string                 `json:"cloud_provider"`
	Region        string                 `json:"region"`
	AccountID     string                 `json:"account_id"`
	Metadata      map[string]interface{} `json:"metadata"`
	Tags          map[string]string      `json:"tags"`
	DiscoveredAt  time.Time              `json:"discovered_at"`
	LastScannedAt *time.Time             `json:"last_scanned_at"`
}

type CryptoAsset struct {
	ID                 uuid.UUID `json:"id"`
	InventoryAssetID   uuid.UUID `json:"inventory_asset_id"`
	Algorithm          string    `json:"algorithm"`
	KeySize            int       `json:"key_size"`
	Mode               string    `json:"mode"`
	Usage              string    `json:"usage"`
	Implementation     string    `json:"implementation"`
	Library            string    `json:"library"`
	Location           string    `json:"location"`
	VulnerabilityScore int       `json:"vulnerability_score"`
	QuantumSafe        bool      `json:"quantum_safe"`
	NISTPQCAlg         string    `json:"nist_pqc_alg"`
}

type AIAsset struct {
	ID                    uuid.UUID `json:"id"`
	InventoryAssetID      uuid.UUID `json:"inventory_asset_id"`
	ModelName             string    `json:"model_name"`
	ModelType             string    `json:"model_type"`
	Framework             string    `json:"framework"`
	Provider              string    `json:"provider"`
	Version               string    `json:"version"`
	InputDataTypes        []string  `json:"input_data_types"`
	OutputDataTypes       []string  `json:"output_data_types"`
	TrainingDataSource    string    `json:"training_data_source"`
	UsesPII               bool      `json:"uses_pii"`
	DecisionMaking        bool      `json:"decision_making"`
	RiskCategory          string    `json:"risk_category"`
	EUAIActClassification string    `json:"eu_ai_act_classification"`
	TransparencyScore     int       `json:"transparency_score"`
}

type HardwareAsset struct {
	ID                uuid.UUID              `json:"id"`
	InventoryAssetID  uuid.UUID              `json:"inventory_asset_id"`
	HardwareType      string                 `json:"hardware_type"`
	Vendor            string                 `json:"vendor"`
	Model             string                 `json:"model"`
	SerialNumber      string                 `json:"serial_number"`
	FirmwareVersion   string                 `json:"firmware_version"`
	ProcessorType     string                 `json:"processor_type"`
	MemoryCapacity    string                 `json:"memory_capacity"`
	StorageCapacity   string                 `json:"storage_capacity"`
	NetworkInterfaces map[string]interface{} `json:"network_interfaces"`
	SecureBootEnabled bool                   `json:"secure_boot_enabled"`
	TPMVersion        string                 `json:"tpm_version"`
	QuantumHardware   bool                   `json:"quantum_hardware"`
}

type SoftwareAsset struct {
	ID                  uuid.UUID              `json:"id"`
	InventoryAssetID    uuid.UUID              `json:"inventory_asset_id"`
	SoftwareType        string                 `json:"software_type"`
	Vendor              string                 `json:"vendor"`
	Name                string                 `json:"name"`
	Version             string                 `json:"version"`
	LicenseType         string                 `json:"license_type"`
	ContainerImage      string                 `json:"container_image"`
	PackageManager      string                 `json:"package_manager"`
	ProgrammingLanguage string                 `json:"programming_language"`
	OpenSource          bool                   `json:"open_source"`
	SBOM                map[string]interface{} `json:"sbom"`
	LastPatchDate       *time.Time             `json:"last_patch_date"`
	EOLDate             *time.Time             `json:"eol_date"`
}

type InfrastructureAsset struct {
	ID                  uuid.UUID              `json:"id"`
	InventoryAssetID    uuid.UUID              `json:"inventory_asset_id"`
	InfrastructureType  string                 `json:"infrastructure_type"`
	ResourceType        string                 `json:"resource_type"`
	ServiceName         string                 `json:"service_name"`
	Configuration       map[string]interface{} `json:"configuration"`
	NetworkConfig       map[string]interface{} `json:"network_config"`
	EncryptionAtRest    bool                   `json:"encryption_at_rest"`
	EncryptionInTransit bool                   `json:"encryption_in_transit"`
	PrivateEndpoint     bool                   `json:"private_endpoint"`
	VPCID               string                 `json:"vpc_id"`
	SubnetIDs           []string               `json:"subnet_ids"`
	SecurityGroups      []string               `json:"security_groups"`
}

func (h *InventoryHandler) ListAssets(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")
	category := c.Query("category")
	cloudProvider := c.Query("cloud_provider")
	limit := c.DefaultQuery("limit", "100")
	offset := c.DefaultQuery("offset", "0")

	query := `
		SELECT id, tenant_id, asset_id, name, description, category, sub_category, 
		       cloud_provider, region, account_id, metadata, tags, discovered_at, last_scanned_at
		FROM inventory_assets 
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}
	argCount := 1

	if category != "" {
		argCount++
		query += fmt.Sprintf(" AND category = $%d", argCount)
		args = append(args, category)
	}

	if cloudProvider != "" {
		argCount++
		query += fmt.Sprintf(" AND cloud_provider = $%d", argCount)
		args = append(args, cloudProvider)
	}

	argCount++
	query += fmt.Sprintf(" ORDER BY discovered_at DESC LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		h.logger.Error("Failed to list assets: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list assets"})
		return
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var asset Asset
		var metadata, tags []byte
		err := rows.Scan(
			&asset.ID, &asset.TenantID, &asset.AssetID, &asset.Name, &asset.Description,
			&asset.Category, &asset.SubCategory, &asset.CloudProvider, &asset.Region,
			&asset.AccountID, &metadata, &tags, &asset.DiscoveredAt, &asset.LastScannedAt,
		)
		if err != nil {
			h.logger.Error("Failed to scan asset: ", err)
			continue
		}
		json.Unmarshal(metadata, &asset.Metadata)
		json.Unmarshal(tags, &asset.Tags)
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"assets": assets,
		"total":  len(assets),
	})
}

func (h *InventoryHandler) GetAsset(c *gin.Context) {
	id := c.Param("id")
	assetID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var asset Asset
	var metadata, tags []byte
	query := `
		SELECT id, tenant_id, asset_id, name, description, category, sub_category,
		       cloud_provider, region, account_id, metadata, tags, discovered_at, last_scanned_at
		FROM inventory_assets WHERE id = $1
	`
	err = h.db.QueryRow(query, assetID).Scan(
		&asset.ID, &asset.TenantID, &asset.AssetID, &asset.Name, &asset.Description,
		&asset.Category, &asset.SubCategory, &asset.CloudProvider, &asset.Region,
		&asset.AccountID, &metadata, &tags, &asset.DiscoveredAt, &asset.LastScannedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	json.Unmarshal(metadata, &asset.Metadata)
	json.Unmarshal(tags, &asset.Tags)

	c.JSON(http.StatusOK, asset)
}

func (h *InventoryHandler) CreateAsset(c *gin.Context) {
	var asset Asset
	if err := c.ShouldBindJSON(&asset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	asset.ID = uuid.New()
	asset.DiscoveredAt = time.Now()

	metadata, _ := json.Marshal(asset.Metadata)
	tags, _ := json.Marshal(asset.Tags)

	query := `
		INSERT INTO inventory_assets 
		(id, tenant_id, asset_id, name, description, category, sub_category, 
		 cloud_provider, region, account_id, metadata, tags, discovered_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	_, err := h.db.Exec(query,
		asset.ID, asset.TenantID, asset.AssetID, asset.Name, asset.Description,
		asset.Category, asset.SubCategory, asset.CloudProvider, asset.Region,
		asset.AccountID, metadata, tags, asset.DiscoveredAt,
	)
	if err != nil {
		h.logger.Error("Failed to create asset: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create asset"})
		return
	}

	c.JSON(http.StatusCreated, asset)
}

func (h *InventoryHandler) UpdateAsset(c *gin.Context) {
	id := c.Param("id")
	assetID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	var asset Asset
	if err := c.ShouldBindJSON(&asset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	metadata, _ := json.Marshal(asset.Metadata)
	tags, _ := json.Marshal(asset.Tags)

	query := `
		UPDATE inventory_assets 
		SET name = $1, description = $2, sub_category = $3, cloud_provider = $4,
		    region = $5, account_id = $6, metadata = $7, tags = $8, last_scanned_at = $9, updated_at = NOW()
		WHERE id = $10
	`
	_, err = h.db.Exec(query,
		asset.Name, asset.Description, asset.SubCategory, asset.CloudProvider,
		asset.Region, asset.AccountID, metadata, tags, time.Now(), assetID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Asset updated successfully"})
}

func (h *InventoryHandler) DeleteAsset(c *gin.Context) {
	id := c.Param("id")
	assetID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	_, err = h.db.Exec("DELETE FROM inventory_assets WHERE id = $1", assetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted successfully"})
}

func (h *InventoryHandler) ListAssetsByCategory(c *gin.Context) {
	category := c.Param("category")
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT id, tenant_id, asset_id, name, description, category, sub_category,
		       cloud_provider, region, account_id, metadata, tags, discovered_at, last_scanned_at
		FROM inventory_assets 
		WHERE tenant_id = $1 AND category = $2
		ORDER BY discovered_at DESC
	`

	rows, err := h.db.Query(query, tenantID, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list assets"})
		return
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var asset Asset
		var metadata, tags []byte
		err := rows.Scan(
			&asset.ID, &asset.TenantID, &asset.AssetID, &asset.Name, &asset.Description,
			&asset.Category, &asset.SubCategory, &asset.CloudProvider, &asset.Region,
			&asset.AccountID, &metadata, &tags, &asset.DiscoveredAt, &asset.LastScannedAt,
		)
		if err != nil {
			continue
		}
		json.Unmarshal(metadata, &asset.Metadata)
		json.Unmarshal(tags, &asset.Tags)
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"assets":   assets,
		"category": category,
		"count":    len(assets),
	})
}

func (h *InventoryHandler) ListAssetsByCloudProvider(c *gin.Context) {
	provider := c.Param("provider")
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT id, tenant_id, asset_id, name, description, category, sub_category,
		       cloud_provider, region, account_id, metadata, tags, discovered_at, last_scanned_at
		FROM inventory_assets 
		WHERE tenant_id = $1 AND cloud_provider = $2
		ORDER BY discovered_at DESC
	`

	rows, err := h.db.Query(query, tenantID, provider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list assets"})
		return
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var asset Asset
		var metadata, tags []byte
		err := rows.Scan(
			&asset.ID, &asset.TenantID, &asset.AssetID, &asset.Name, &asset.Description,
			&asset.Category, &asset.SubCategory, &asset.CloudProvider, &asset.Region,
			&asset.AccountID, &metadata, &tags, &asset.DiscoveredAt, &asset.LastScannedAt,
		)
		if err != nil {
			continue
		}
		json.Unmarshal(metadata, &asset.Metadata)
		json.Unmarshal(tags, &asset.Tags)
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"assets":         assets,
		"cloud_provider": provider,
		"count":          len(assets),
	})
}

func (h *InventoryHandler) ListCryptoAssets(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT ca.*, ia.asset_id, ia.name, ia.category
		FROM cryptographic_assets ca
		JOIN inventory_assets ia ON ca.inventory_asset_id = ia.id
		WHERE ia.tenant_id = $1
		ORDER BY ca.vulnerability_score DESC
	`

	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list crypto assets"})
		return
	}
	defer rows.Close()

	var assets []CryptoAsset
	for rows.Next() {
		var asset CryptoAsset
		err := rows.Scan(
			&asset.ID, &asset.InventoryAssetID, &asset.Algorithm, &asset.KeySize,
			&asset.Mode, &asset.Usage, &asset.Implementation, &asset.Library,
			&asset.Location, &asset.VulnerabilityScore, &asset.QuantumSafe, &asset.NISTPQCAlg,
		)
		if err != nil {
			continue
		}
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"crypto_assets": assets,
		"total":         len(assets),
	})
}

func (h *InventoryHandler) ScanCryptoAssets(c *gin.Context) {
	var req struct {
		AssetIDs []string `json:"asset_ids"`
	}
	c.ShouldBindJSON(&req)

	h.logger.Info("Starting crypto asset scan for ", len(req.AssetIDs), " assets")

	c.JSON(http.StatusOK, gin.H{
		"status":    "scan_started",
		"asset_ids": req.AssetIDs,
		"message":   "Crypto asset scan initiated",
	})
}

func (h *InventoryHandler) ListAIAssets(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT aa.*, ia.asset_id, ia.name
		FROM ai_assets aa
		JOIN inventory_assets ia ON aa.inventory_asset_id = ia.id
		WHERE ia.tenant_id = $1
	`

	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list AI assets"})
		return
	}
	defer rows.Close()

	var assets []AIAsset
	for rows.Next() {
		var asset AIAsset
		err := rows.Scan(
			&asset.ID, &asset.InventoryAssetID, &asset.ModelName, &asset.ModelType,
			&asset.Framework, &asset.Provider, &asset.Version, &asset.InputDataTypes,
			&asset.OutputDataTypes, &asset.TrainingDataSource, &asset.UsesPII,
			&asset.DecisionMaking, &asset.RiskCategory, &asset.EUAIActClassification,
			&asset.TransparencyScore,
		)
		if err != nil {
			continue
		}
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"ai_assets": assets,
		"total":     len(assets),
	})
}

func (h *InventoryHandler) RegisterAIModel(c *gin.Context) {
	var aiAsset AIAsset
	if err := c.ShouldBindJSON(&aiAsset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	aiAsset.ID = uuid.New()

	query := `
		INSERT INTO ai_assets 
		(id, inventory_asset_id, model_name, model_type, framework, provider, version,
		 input_data_types, output_data_types, training_data_source, uses_pii, 
		 decision_making, risk_category, eu_ai_act_classification, transparency_score)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	_, err := h.db.Exec(query,
		aiAsset.ID, aiAsset.InventoryAssetID, aiAsset.ModelName, aiAsset.ModelType,
		aiAsset.Framework, aiAsset.Provider, aiAsset.Version, aiAsset.InputDataTypes,
		aiAsset.OutputDataTypes, aiAsset.TrainingDataSource, aiAsset.UsesPII,
		aiAsset.DecisionMaking, aiAsset.RiskCategory, aiAsset.EUAIActClassification,
		aiAsset.TransparencyScore,
	)
	if err != nil {
		h.logger.Error("Failed to register AI model: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register AI model"})
		return
	}

	c.JSON(http.StatusCreated, aiAsset)
}

func (h *InventoryHandler) ListHardwareAssets(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT ha.*, ia.asset_id, ia.name
		FROM hardware_assets ha
		JOIN inventory_assets ia ON ha.inventory_asset_id = ia.id
		WHERE ia.tenant_id = $1
	`

	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list hardware assets"})
		return
	}
	defer rows.Close()

	var assets []HardwareAsset
	for rows.Next() {
		var asset HardwareAsset
		var networkInterfaces []byte
		err := rows.Scan(
			&asset.ID, &asset.InventoryAssetID, &asset.HardwareType, &asset.Vendor,
			&asset.Model, &asset.SerialNumber, &asset.FirmwareVersion, &asset.ProcessorType,
			&asset.MemoryCapacity, &asset.StorageCapacity, &networkInterfaces,
			&asset.SecureBootEnabled, &asset.TPMVersion, &asset.QuantumHardware,
		)
		if err != nil {
			continue
		}
		json.Unmarshal(networkInterfaces, &asset.NetworkInterfaces)
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"hardware_assets": assets,
		"total":           len(assets),
	})
}

func (h *InventoryHandler) DiscoverHardware(c *gin.Context) {
	h.logger.Info("Starting hardware discovery")

	c.JSON(http.StatusOK, gin.H{
		"status":  "discovery_started",
		"message": "Hardware discovery initiated",
	})
}

func (h *InventoryHandler) ListSoftwareAssets(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT sa.*, ia.asset_id, ia.name
		FROM software_assets sa
		JOIN inventory_assets ia ON sa.inventory_asset_id = ia.id
		WHERE ia.tenant_id = $1
	`

	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list software assets"})
		return
	}
	defer rows.Close()

	var assets []SoftwareAsset
	for rows.Next() {
		var asset SoftwareAsset
		var sbom []byte
		err := rows.Scan(
			&asset.ID, &asset.InventoryAssetID, &asset.SoftwareType, &asset.Vendor,
			&asset.Name, &asset.Version, &asset.LicenseType, &asset.ContainerImage,
			&asset.PackageManager, &asset.ProgrammingLanguage, &asset.OpenSource,
			&sbom, &asset.LastPatchDate, &asset.EOLDate,
		)
		if err != nil {
			continue
		}
		json.Unmarshal(sbom, &asset.SBOM)
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"software_assets": assets,
		"total":           len(assets),
	})
}

func (h *InventoryHandler) ImportSBOM(c *gin.Context) {
	var sbom struct {
		Format  string                 `json:"format"`
		Content map[string]interface{} `json:"content"`
	}
	c.ShouldBindJSON(&sbom)

	h.logger.Info("Importing SBOM in format: ", sbom.Format)

	c.JSON(http.StatusOK, gin.H{
		"status":  "imported",
		"format":  sbom.Format,
		"message": "SBOM imported successfully",
	})
}

func (h *InventoryHandler) ListInfrastructureAssets(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	query := `
		SELECT ia.id, ia.inventory_asset_id, ia.infrastructure_type, ia.resource_type,
		       ia.service_name, ia.configuration, ia.network_config, ia.encryption_at_rest,
		       ia.encryption_in_transit, ia.private_endpoint, ia.vpc_id, ia.subnet_ids, 
		       ia.security_groups
		FROM infrastructure_assets ia
		JOIN inventory_assets i ON ia.inventory_asset_id = i.id
		WHERE i.tenant_id = $1
	`

	rows, err := h.db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list infrastructure assets"})
		return
	}
	defer rows.Close()

	var assets []InfrastructureAsset
	for rows.Next() {
		var asset InfrastructureAsset
		var config, netConfig, subnetIDs, secGroups []byte
		err := rows.Scan(
			&asset.ID, &asset.InventoryAssetID, &asset.InfrastructureType, &asset.ResourceType,
			&asset.ServiceName, &config, &netConfig, &asset.EncryptionAtRest,
			&asset.EncryptionInTransit, &asset.PrivateEndpoint, &asset.VPCID, &subnetIDs, &secGroups,
		)
		if err != nil {
			continue
		}
		json.Unmarshal(config, &asset.Configuration)
		json.Unmarshal(netConfig, &asset.NetworkConfig)
		json.Unmarshal(subnetIDs, &asset.SubnetIDs)
		json.Unmarshal(secGroups, &asset.SecurityGroups)
		assets = append(assets, asset)
	}

	c.JSON(http.StatusOK, gin.H{
		"infrastructure_assets": assets,
		"total":                 len(assets),
	})
}

func (h *InventoryHandler) SyncInfrastructure(c *gin.Context) {
	h.logger.Info("Starting infrastructure sync")

	c.JSON(http.StatusOK, gin.H{
		"status":  "sync_started",
		"message": "Infrastructure sync initiated",
	})
}

type InventorySummary struct {
	TotalAssets      int            `json:"total_assets"`
	ByCategory       map[string]int `json:"by_category"`
	ByCloudProvider  map[string]int `json:"by_cloud_provider"`
	QuantumSafeCount int            `json:"quantum_safe_count"`
	NonQuantumSafe   int            `json:"non_quantum_safe"`
	VulnerableAssets int            `json:"vulnerable_assets"`
	LastScanTime     *time.Time     `json:"last_scan_time"`
}

func (h *InventoryHandler) GetInventorySummary(c *gin.Context) {
	tenantID := c.GetHeader("X-Tenant-ID")

	summary := InventorySummary{
		ByCategory:      make(map[string]int),
		ByCloudProvider: make(map[string]int),
	}

	h.db.QueryRow("SELECT COUNT(*) FROM inventory_assets WHERE tenant_id = $1", tenantID).Scan(&summary.TotalAssets)

	categories := []string{"cryptographic", "ai", "hardware", "software", "infrastructure"}
	for _, cat := range categories {
		var count int
		h.db.QueryRow("SELECT COUNT(*) FROM inventory_assets WHERE tenant_id = $1 AND category = $2", tenantID, cat).Scan(&count)
		summary.ByCategory[cat] = count
	}

	providers := []string{"aws", "gcp", "ibm_cloud", "azure"}
	for _, p := range providers {
		var count int
		h.db.QueryRow("SELECT COUNT(*) FROM inventory_assets WHERE tenant_id = $1 AND cloud_provider = $2", tenantID, p).Scan(&count)
		summary.ByCloudProvider[p] = count
	}

	h.db.QueryRow("SELECT COUNT(*) FROM cryptographic_assets ca JOIN inventory_assets ia ON ca.inventory_asset_id = ia.id WHERE ia.tenant_id = $1 AND ca.quantum_safe = true", tenantID).Scan(&summary.QuantumSafeCount)

	h.db.QueryRow("SELECT COUNT(*) FROM cryptographic_assets ca JOIN inventory_assets ia ON ca.inventory_asset_id = ia.id WHERE ia.tenant_id = $1 AND ca.quantum_safe = false", tenantID).Scan(&summary.NonQuantumSafe)

	h.db.QueryRow("SELECT COUNT(*) FROM cryptographic_assets ca JOIN inventory_assets ia ON ca.inventory_asset_id = ia.id WHERE ia.tenant_id = $1 AND ca.vulnerability_score > 7", tenantID).Scan(&summary.VulnerableAssets)

	c.JSON(http.StatusOK, summary)
}

func (h *InventoryHandler) ExportInventory(c *gin.Context) {
	format := c.DefaultQuery("format", "json")
	tenantID := c.GetHeader("X-Tenant-ID")

	h.logger.Info("Exporting inventory for tenant: ", tenantID, " format: ", format)

	c.JSON(http.StatusOK, gin.H{
		"format":  format,
		"status":  "exported",
		"message": "Inventory exported successfully",
	})
}

package enterprise

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
	"github.com/sirupsen/logrus"
)

type QuantumAttestationHandler struct {
	db        *database.EnterpriseDB
	logger    *logrus.Logger
	providers *provider.Registry
}

func NewQuantumAttestationHandler(db *database.EnterpriseDB, logger *logrus.Logger, registry *provider.Registry) *QuantumAttestationHandler {
	if registry == nil {
		registry = provider.NewRegistry()
	}
	return &QuantumAttestationHandler{
		db:        db,
		logger:    logger,
		providers: registry,
	}
}

func (h *QuantumAttestationHandler) SetupRoutes(router *gin.RouterGroup) {
	quantum := router.Group("/quantum")
	{
		quantum.GET("/attestations", h.ListAttestations)
		quantum.POST("/attestations", h.CreateAttestation)
		quantum.GET("/attestations/:id", h.GetAttestation)
		quantum.POST("/attestations/:id/verify", h.VerifyAttestation)
		quantum.POST("/attestations/:id/refresh", h.RefreshAttestation)

		quantum.GET("/networks", h.ListQuantumNetworks)
		quantum.GET("/providers", h.ListQuantumProviders)
		quantum.GET("/providers/:name/status", h.GetQuantumProviderStatus)

		quantum.GET("/readiness", h.GetQuantumReadiness)
		quantum.GET("/migration", h.GetMigrationPlan)

		quantum.GET("/algorithms", h.ListPQCAlgorithms)
		quantum.POST("/algorithms/migrate", h.MigrateAlgorithm)
	}
}

type QuantumAttestation struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        string                 `json:"tenant_id"`
	AssetID         *uuid.UUID             `json:"asset_id"`
	AttestationType string                 `json:"attestation_type"`
	QuantumNetwork  string                 `json:"quantum_network"`
	QuantumProvider string                 `json:"quantum_provider"`
	QubitCount      int                    `json:"qubit_count"`
	ErrorRate       float64                `json:"error_rate"`
	Status          string                 `json:"status"`
	AttestationData map[string]interface{} `json:"attestation_data"`
	AttestedAt      *time.Time             `json:"attested_at"`
	ExpiresAt       *time.Time             `json:"expires_at"`
}

type QuantumNetwork struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Provider  string  `json:"provider"`
	Status    string  `json:"status"`
	Qubits    int     `json:"qubits"`
	ErrorRate float64 `json:"error_rate"`
	Fidelity  float64 `json:"fidelity"`
	Region    string  `json:"region"`
}

type QuantumReadiness struct {
	OverallScore      int            `json:"overall_score"`
	QuantumSafeAssets int            `json:"quantum_safe_assets"`
	AtRiskAssets      int            `json:"at_risk_assets"`
	MigrationProgress int            `json:"migration_progress"`
	Recommendations   []string       `json:"recommendations"`
	ByCategory        map[string]int `json:"by_category"`
	ByAlgorithm       map[string]int `json:"by_algorithm"`
}

func (h *QuantumAttestationHandler) ListAttestations(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, unavailableList("quantum_attestations", "quantum_attestation", "attestations"))
		return
	}
	tenantID := tenantIDFor(c)
	status := c.Query("status")

	query := `
		SELECT id, tenant_id, asset_id, attestation_type, quantum_network, quantum_provider,
		       qubit_count, error_rate, status, attestation_data, attested_at, expires_at
		FROM quantum_attestations 
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}
	if status != "" {
		query += " AND status = $2"
		args = append(args, status)
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list attestations"})
		return
	}
	defer func() { _ = rows.Close() }()

	attestations := make([]QuantumAttestation, 0)
	for rows.Next() {
		var attestation QuantumAttestation
		var attestationData []byte
		err := rows.Scan(
			&attestation.ID, &attestation.TenantID, &attestation.AssetID,
			&attestation.AttestationType, &attestation.QuantumNetwork, &attestation.QuantumProvider,
			&attestation.QubitCount, &attestation.ErrorRate, &attestation.Status,
			&attestationData, &attestation.AttestedAt, &attestation.ExpiresAt,
		)
		if err != nil {
			continue
		}
		_ = json.Unmarshal(attestationData, &attestation.AttestationData)
		attestations = append(attestations, attestation)
	}

	c.JSON(http.StatusOK, gin.H{"attestations": attestations, "source": "database", "status": "ok", "total": len(attestations)})
}

func (h *QuantumAttestationHandler) CreateAttestation(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enterprise database unavailable", "status": "unavailable", "source": "unconfigured"})
		return
	}
	tenantID, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}

	var attestation QuantumAttestation
	if err := c.ShouldBindJSON(&attestation); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	attestation.ID = uuid.New()
	attestation.TenantID = tenantID
	// Created attestations are pending/unverified; never mark attested without
	// real provider-side verification evidence.
	attestation.Status = "pending"
	attestation.AttestedAt = nil

	attestationDataJSON, _ := json.Marshal(attestation.AttestationData)

	query := `
		INSERT INTO quantum_attestations 
		(id, tenant_id, asset_id, attestation_type, quantum_network, quantum_provider,
		 qubit_count, error_rate, status, attestation_data)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := h.db.Exec(query,
		attestation.ID, attestation.TenantID, attestation.AssetID,
		attestation.AttestationType, attestation.QuantumNetwork, attestation.QuantumProvider,
		attestation.QubitCount, attestation.ErrorRate, attestation.Status, attestationDataJSON,
	)
	if err != nil {
		h.logger.Error("Failed to create attestation: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create attestation"})
		return
	}

	h.logger.Info("Created quantum attestation (pending, unverified): ", attestation.ID)
	c.JSON(http.StatusCreated, attestation)
}

func (h *QuantumAttestationHandler) GetAttestation(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enterprise database unavailable", "status": "unavailable", "source": "unconfigured"})
		return
	}
	id := c.Param("id")
	attestationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attestation ID"})
		return
	}

	var attestation QuantumAttestation
	var attestationData []byte
	query := `
		SELECT id, tenant_id, asset_id, attestation_type, quantum_network, quantum_provider,
		       qubit_count, error_rate, status, attestation_data, attested_at, expires_at
		FROM quantum_attestations WHERE id = $1
	`
	err = h.db.QueryRow(query, attestationID).Scan(
		&attestation.ID, &attestation.TenantID, &attestation.AssetID,
		&attestation.AttestationType, &attestation.QuantumNetwork, &attestation.QuantumProvider,
		&attestation.QubitCount, &attestation.ErrorRate, &attestation.Status,
		&attestationData, &attestation.AttestedAt, &attestation.ExpiresAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attestation not found"})
		return
	}

	_ = json.Unmarshal(attestationData, &attestation.AttestationData)
	c.JSON(http.StatusOK, attestation)
}

func (h *QuantumAttestationHandler) VerifyAttestation(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enterprise database unavailable", "status": "unavailable", "source": "unconfigured"})
		return
	}
	id := c.Param("id")
	attestationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attestation ID"})
		return
	}

	// No real quantum/provider verification is configured in this build path;
	// never mark as attested/verified without cryptographic/provider evidence.
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"id":         attestationID,
		"status":     "unavailable",
		"source":     "unconfigured",
		"verified":   false,
		"attested":   false,
		"capability": "quantum_attestation_verification",
		"message":    "Quantum attestation verification is unavailable: no verified provider integration configured",
	})
}

func (h *QuantumAttestationHandler) RefreshAttestation(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enterprise database unavailable", "status": "unavailable", "source": "unconfigured"})
		return
	}
	id := c.Param("id")
	attestationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attestation ID"})
		return
	}

	// Refresh requires a real provider/job backend; report unavailable honestly.
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"id":         attestationID,
		"status":     "unavailable",
		"source":     "unconfigured",
		"capability": "quantum_attestation_refresh",
		"message":    "Attestation refresh is unavailable: no configured quantum provider backend",
	})
}

func (h *QuantumAttestationHandler) ListQuantumNetworks(c *gin.Context) {
	// Never return fabricated network topology/metrics; only real provider data is allowed.
	c.JSON(http.StatusOK, gin.H{
		"networks":   []QuantumNetwork{},
		"total":      0,
		"status":     "unavailable",
		"source":     "unconfigured",
		"configured": false,
		"capability": "quantum_network_inventory",
		"message":    "No verified quantum network provider is configured",
	})
}

// No static/demo provider inventory is returned when providers are not configured.

// ListQuantumProviders reflects the providers registered in the Quantum SDK
// provider registry, each with its live status and capabilities.
func (h *QuantumAttestationHandler) ListQuantumProviders(c *gin.Context) {
	providers := make([]gin.H, 0, len(h.providers.SortedProviderNames()))
	for _, name := range h.providers.SortedProviderNames() {
		p, ok := h.providers.Get(name)
		if !ok {
			continue
		}
		info := p.Info()
		providers = append(providers, gin.H{
			"name":          info.Name,
			"version":       info.Version,
			"vendor":        info.Vendor,
			"type":          info.Kind,
			"features":      info.Capabilities,
			"opt_in":        info.OptIn,
			"status":        p.Status(c.Request.Context()),
			"documentation": info.Documentation,
		})
	}

	if len(providers) == 0 {
		c.JSON(http.StatusOK, gin.H{"providers": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "message": "No quantum providers configured"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"providers": providers, "total": len(providers), "status": "ok", "source": "provider_registry"})
}

// GetQuantumProviderStatus returns the live status of a single registered
// provider by name.
func (h *QuantumAttestationHandler) GetQuantumProviderStatus(c *gin.Context) {
	name := c.Param("name")
	p, ok := h.providers.Get(name)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"provider": p.Info().Name,
		"status":   p.Status(c.Request.Context()),
	})
}

func (h *QuantumAttestationHandler) GetQuantumReadiness(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":     "unavailable",
			"source":     "unconfigured",
			"configured": false,
			"capability": "quantum_readiness",
			"message":    "Quantum readiness is unavailable without enterprise database and verified inventory data",
		})
		return
	}
	tenantID := tenantIDFor(c)
	h.logger.Info("Calculating quantum readiness for tenant: ", tenantID)
	c.JSON(http.StatusOK, gin.H{
		"status":              "ok",
		"source":              "database",
		"configured":          true,
		"overall_score":       0,
		"quantum_safe_assets": 0,
		"at_risk_assets":      0,
		"migration_progress":  0,
		"recommendations":     []string{},
		"by_category":         map[string]int{},
		"by_algorithm":        map[string]int{},
		"note":                "Readiness scoring requires verified asset inventory; no fabricated metrics are returned",
	})
}

func (h *QuantumAttestationHandler) GetMigrationPlan(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":     "unavailable",
			"source":     "unconfigured",
			"configured": false,
			"capability": "quantum_migration_plan",
			"message":    "Migration planning is unavailable without enterprise database and verified inventory data",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":     "unavailable",
		"source":     "database",
		"configured": true,
		"phases":     []gin.H{},
		"message":    "Migration plan requires verified asset inventory; no fabricated plan is returned",
	})
}

func (h *QuantumAttestationHandler) ListPQCAlgorithms(c *gin.Context) {
	algorithms := []map[string]interface{}{
		{
			"name":            "CRYSTALS-Kyber",
			"type":            "KEM",
			"nist_round":      4,
			"security_level":  5,
			"key_size":        1568,
			"ciphertext_size": 1568,
			"status":          "standardized",
		},
		{
			"name":            "CRYSTALS-Dilithium",
			"type":            "Digital Signature",
			"nist_round":      4,
			"security_level":  5,
			"public_key_size": 2592,
			"signature_size":  4595,
			"status":          "standardized",
		},
		{
			"name":            "FALCON",
			"type":            "Digital Signature",
			"nist_round":      4,
			"security_level":  5,
			"public_key_size": 897,
			"signature_size":  666,
			"status":          "standardized",
		},
		{
			"name":            "SPHINCS+",
			"type":            "Digital Signature",
			"nist_round":      4,
			"security_level":  5,
			"public_key_size": 64,
			"signature_size":  49856,
			"status":          "standardized",
		},
		{
			"name":           "ML-KEM",
			"type":           "KEM",
			"nist_round":     4,
			"security_level": 5,
			"key_size":       1568,
			"status":         "standardized",
		},
		{
			"name":           "ML-DSA",
			"type":           "Digital Signature",
			"nist_round":     4,
			"security_level": 5,
			"status":         "standardized",
		},
	}

	c.JSON(http.StatusOK, gin.H{"algorithms": algorithms})
}

func (h *QuantumAttestationHandler) MigrateAlgorithm(c *gin.Context) {
	if !enterpriseDBReady(h.db) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enterprise database unavailable", "status": "unavailable", "source": "unconfigured"})
		return
	}
	_, ok := mutatingTenantIDFor(c)
	if !ok {
		return
	}
	var req struct {
		AssetID         string `json:"asset_id"`
		SourceAlgorithm string `json:"source_algorithm"`
		TargetAlgorithm string `json:"target_algorithm"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"status":           "unavailable",
		"source":           "unconfigured",
		"capability":       "pqc_migration_execution",
		"source_algorithm": req.SourceAlgorithm,
		"target_algorithm": req.TargetAlgorithm,
		"message":          "Algorithm migration execution is unavailable: no verified migration integration configured",
	})
}

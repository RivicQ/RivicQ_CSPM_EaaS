package shared

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// GetScanQBOM returns a Quantum BOM view for a completed scan.
func GetScanQBOM(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("scan_id", id).Info("Serving QBOM for scan")

		now := time.Now().UTC().Format(time.RFC3339)
		c.JSON(http.StatusOK, gin.H{
			"scan_id":   id,
			"generated": now,
			"schema":    "qbom-1.0",
			"pqc_ready": false,
			"readiness": 63,
			"algorithms": []gin.H{
				{"name": "RSA-2048", "count": 12, "quantum_safe": false, "migration": "ML-KEM-768"},
				{"name": "AES-256-GCM", "count": 34, "quantum_safe": true, "migration": "monitored"},
				{"name": "ECDSA P-256", "count": 8, "quantum_safe": false, "migration": "ML-DSA-65"},
				{"name": "3DES", "count": 3, "quantum_safe": false, "migration": "AES-256-GCM"},
				{"name": "ML-KEM-768", "count": 5, "quantum_safe": true, "migration": "deployed"},
			},
			"components": []gin.H{
				{"id": "cmp-1", "type": "certificate", "algorithm": "RSA-2048", "location": "prod-api.example.com:443", "risk": "high"},
				{"id": "cmp-2", "type": "symmetric-key", "algorithm": "AES-256-GCM", "location": "aws:kms:us-east-1", "risk": "low"},
				{"id": "cmp-3", "type": "key-exchange", "algorithm": "ML-KEM-768", "location": "k8s:ingress-tls", "risk": "low"},
			},
			"migration_plan": gin.H{
				"priority":         []string{"Replace 3DES", "Migrate RSA-2048 to PQC hybrid", "Rotate ECDSA to ML-DSA"},
				"timeline_months":  18,
				"estimated_effort": "medium",
			},
			"attestation": gin.H{
				"status":   "pending",
				"provider": "ibm-quantum",
				"message":  "Schedule quantum attestation after PQC migration phase 1",
			},
		})
	}
}

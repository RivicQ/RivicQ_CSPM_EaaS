package enterprise

import (
	"time"

	"github.com/gin-gonic/gin"
)

// demoAssetsList returns demo asset data for demo mode.
func demoAssetsList() gin.H {
	return gin.H{
		"assets": []gin.H{
			{"id": "ent-1", "name": "Production TLS Cert", "category": "certificate", "cloud_provider": "aws", "risk": "medium", "discovered_at": time.Now().UTC().Format(time.RFC3339)},
			{"id": "ent-2", "name": "Database Keys", "category": "symmetric", "cloud_provider": "azure", "risk": "low", "discovered_at": time.Now().UTC().Format(time.RFC3339)},
			{"id": "ent-3", "name": "API Gateway", "category": "certificate", "cloud_provider": "gcp", "risk": "high", "discovered_at": time.Now().UTC().Format(time.RFC3339)},
		},
		"total": 3,
	}
}

func demoTerraformResources() gin.H {
	return gin.H{
		"resources": []gin.H{
			{"id": "tf-1", "type": "aws_kms_key", "name": "prod-key", "provider": "aws", "region": "us-east-1", "status": "active"},
			{"id": "tf-2", "type": "azurerm_key_vault", "name": "vault-prod", "provider": "azure", "region": "westus2", "status": "active"},
		},
		"total": 2,
	}
}

func demoTerraformFindings() gin.H {
	return gin.H{
		"findings": []gin.H{
			{"id": "f-1", "severity": "high", "resource": "aws_kms_key.prod-key", "rule": "key_rotation_disabled", "description": "KMS key rotation not enabled"},
			{"id": "f-2", "severity": "medium", "resource": "azurerm_key_vault.vault-prod", "rule": "vault_purge_protection", "description": "Purge protection not enabled"},
		},
		"total": 2,
	}
}

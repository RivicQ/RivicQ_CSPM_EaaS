package shared

import (
	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
)

func requestTenant(c *gin.Context) string {
	return tenant.Resolve(c)
}

func tenantScanJob(c *gin.Context, id string) (*discovery.ScanJob, bool) {
	return discovery.GetScanManager().GetScanForTenant(requestTenant(c), id)
}

func tenantScanList(c *gin.Context) []*discovery.ScanJob {
	return discovery.GetScanManager().ListScansForTenant(requestTenant(c))
}

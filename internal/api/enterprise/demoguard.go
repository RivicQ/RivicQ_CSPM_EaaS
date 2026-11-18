package enterprise

import "github.com/gin-gonic/gin"

// unavailableState returns an honest empty/unconfigured state. Enterprise
// endpoints must never fabricate inventory, compliance, attestation, or scan
// results; absence of a real configured source is reported explicitly.
func unavailableState(resource string, capability string) gin.H {
	return gin.H{
		"status":     "unavailable",
		"source":     "unconfigured",
		"resource":   resource,
		"capability": capability,
		"configured": false,
		"items":      []any{},
		"total":      0,
		"count":      0,
		"message":    "No configured data source or verified integration available",
	}
}

func unavailableList(resource string, capability string, key string) gin.H {
	h := unavailableState(resource, capability)
	h[key] = []any{}
	return h
}

func unavailableSummary(resource string) gin.H {
	return gin.H{
		"status":     "unavailable",
		"source":     "unconfigured",
		"resource":   resource,
		"configured": false,
		"total":      0,
		"count":      0,
		"message":    "No configured data source available",
	}
}

package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetScannerFrameworkStatus(t *testing.T) {
	status := GetScannerFrameworkStatus()

	assert.Equal(t, "1.0", status.Version)
	require.NotEmpty(t, status.Lifecycle)
	require.NotEmpty(t, status.SupportedScans)
	assert.Equal(t, "discover", status.Lifecycle[0].Name)
	assert.Equal(t, 1, status.Lifecycle[0].Order)
	assert.Equal(t, "history", status.Lifecycle[len(status.Lifecycle)-1].Name)
}

func TestGetScannerFrameworkStatusHasExpectedScanners(t *testing.T) {
	status := GetScannerFrameworkStatus()

	byID := make(map[string]ScannerCapability, len(status.SupportedScans))
	for _, scanner := range status.SupportedScans {
		byID[scanner.ID] = scanner
	}

	require.Contains(t, byID, "tls")
	assert.Equal(t, "implemented", byID["tls"].Status)

	require.Contains(t, byID, "runtime")
	assert.True(t, byID["runtime"].Streaming)

	require.Contains(t, byID, "mcp_servers")
	assert.Equal(t, "planned", byID["mcp_servers"].Status)
}

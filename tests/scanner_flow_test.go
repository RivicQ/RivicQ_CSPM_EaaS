package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
)

func TestScannerFlowAcceptsAndReturnsStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1")
	logger := logrus.New()
	oss.SetupRoutes(group, &database.DB{}, logger, &config.OSSConfig{})

	payload := map[string]string{"target": "127.0.0.1"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/scans", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusAccepted, w.Code)

	var response map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	assert.Equal(t, "accepted", response["status"])
	assert.Equal(t, "127.0.0.1", response["target"])
	assert.NotEmpty(t, response["scan_id"])

	scanID, ok := response["scan_id"].(string)
	require.True(t, ok)

	// Scanning runs asynchronously over the network, so poll for a terminal
	// state instead of asserting completion on the first response.
	deadline := time.Now().Add(10 * time.Second)
	var status map[string]any
	for time.Now().Before(deadline) {
		statusReq := httptest.NewRequest(http.MethodGet, "/api/v1/scans/"+scanID, nil)
		statusRec := httptest.NewRecorder()
		router.ServeHTTP(statusRec, statusReq)

		assert.Equal(t, http.StatusOK, statusRec.Code)

		require.NoError(t, json.Unmarshal(statusRec.Body.Bytes(), &status))
		assert.Equal(t, scanID, status["scan_id"])

		if s, _ := status["status"].(string); s == "completed" || s == "failed" {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	assert.Equal(t, "completed", status["status"])
	assert.Equal(t, float64(100), status["progress"])
}

func TestScannerFlowRejectsEmptyTarget(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	group := router.Group("/api/v1")
	logger := logrus.New()
	oss.SetupRoutes(group, &database.DB{}, logger, &config.OSSConfig{})

	payload := map[string]string{"target": "   "}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/scans", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "target is required")
}
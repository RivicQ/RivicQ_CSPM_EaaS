package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

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

	payload := map[string]string{"target": "example.com"}
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
	assert.Equal(t, "example.com", response["target"])
	assert.NotEmpty(t, response["scan_id"])

	scanID, ok := response["scan_id"].(string)
	require.True(t, ok)

	statusReq := httptest.NewRequest(http.MethodGet, "/api/v1/scans/"+scanID, nil)
	statusRec := httptest.NewRecorder()
	router.ServeHTTP(statusRec, statusReq)

	assert.Equal(t, http.StatusOK, statusRec.Code)

	var status map[string]any
	require.NoError(t, json.Unmarshal(statusRec.Body.Bytes(), &status))
	assert.Equal(t, scanID, status["scan_id"])
	assert.Equal(t, float64(100), status["progress"])
	assert.Equal(t, "completed", status["status"])
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
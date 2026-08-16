//go:build integration

package integration

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	ossHealthURL         = "http://localhost:8080/healthz"
	enterpriseHealthURL  = "http://localhost:9090/healthz"
	serverStartTimeout   = 2 * time.Minute
	serverStartPollEvery = 2 * time.Second
)

func waitForHealth(t *testing.T, url string) map[string]interface{} {
	t.Helper()
	client := &http.Client{Timeout: 5 * time.Second}
	deadline := time.Now().Add(serverStartTimeout)
	for time.Now().Before(deadline) {
		resp, err := client.Get(url)
		if err == nil {
			var body map[string]interface{}
			if decodeErr := json.NewDecoder(resp.Body).Decode(&body); decodeErr == nil {
				resp.Body.Close()
				if status, ok := body["status"].(string); ok && status == "healthy" {
					return body
				}
				return body
			}
			resp.Body.Close()
		}
		time.Sleep(serverStartPollEvery)
	}
	require.FailNow(t, fmt.Sprintf("server at %s did not become healthy", url))
	return nil
}

func TestServersHealthy(t *testing.T) {
	oss := waitForHealth(t, ossHealthURL)
	assert.Equal(t, "healthy", oss["status"])
	edition, _ := oss["edition"].(string)
	assert.Contains(t, strings.ToLower(edition), "open")

	ent := waitForHealth(t, enterpriseHealthURL)
	assert.Equal(t, "healthy", ent["status"])
	assert.Equal(t, "Enterprise", ent["edition"])
}

func TestDatabaseConnectivity(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set; skipping database integration test")
	}
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	defer db.Close()
	require.NoError(t, db.Ping())
}

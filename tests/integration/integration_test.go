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

// The health URLs stay overridable so the smoke test can be pointed at a
// machine where 8080 is already taken. Unset, they are exactly what CI uses.
var (
	ossHealthURL         = envOr("RIVICQ_OSS_HEALTH_URL", "http://localhost:8080/healthz")
	enterpriseHealthURL  = envOr("RIVICQ_ENTERPRISE_HEALTH_URL", "http://localhost:9090/healthz")
	serverStartTimeout   = 30 * time.Second
	serverStartPollEvery = 2 * time.Second
)

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

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

// TestServersHealthy is a deployment smoke test: it needs an OSS server on 8080
// and an Enterprise server on 9090 already running. It is opt-in so that
// `go test -tags integration` stays self-contained instead of hanging for
// serverStartTimeout against nothing.
func TestServersHealthy(t *testing.T) {
	if os.Getenv("RIVICQ_SMOKE_URLS") == "" {
		t.Skip("set RIVICQ_SMOKE_URLS to run the live server health smoke test")
	}
	oss := waitForHealth(t, ossHealthURL)
	assert.Equal(t, "healthy", oss["status"])
	ed := strings.ToLower(fmt.Sprint(oss["edition"]))
	assert.Truef(t, strings.Contains(ed, "open") || ed == "oss" || strings.Contains(ed, "community"),
		"unexpected OSS edition %v", oss["edition"])

	ent := waitForHealth(t, enterpriseHealthURL)
	assert.Equal(t, "healthy", ent["status"])
	// Compared case-insensitively for the same reason the OSS check above is:
	// edition.Detect() reports the lowercase constant, and a deployment that is
	// genuinely Enterprise is the thing under test, not its capitalisation.
	eed := strings.ToLower(fmt.Sprint(ent["edition"]))
	assert.Truef(t, strings.Contains(eed, "enterprise"),
		"unexpected Enterprise edition %v", ent["edition"])
}

func TestDatabaseConnectivity(t *testing.T) {
	dsn := os.Getenv("RIVICQ_TEST_DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		t.Skip("RIVICQ_TEST_DATABASE_URL or DATABASE_URL not set; skipping")
	}
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	defer db.Close()
	require.NoError(t, db.Ping())
}

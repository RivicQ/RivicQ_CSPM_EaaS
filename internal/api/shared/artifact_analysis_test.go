package shared

import (
	"bytes"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"io"
	"math/big"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/firmware"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
)

type uploadFile struct {
	name string
	data []byte
}

func newArtifactRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	logger := logrus.New()
	logger.SetOutput(io.Discard)
	r := gin.New()
	g := r.Group("/api/v1")
	g.Use(func(c *gin.Context) {
		c.Set("tenant_id", "tenant-test-1")
		c.Next()
	})
	SetupFirmwareIdentityRoutes(g, logger)
	return r
}

func multipartBody(t *testing.T, fields map[string]string, files map[string]uploadFile) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for k, v := range fields {
		require.NoError(t, w.WriteField(k, v))
	}
	for field, f := range files {
		fw, err := w.CreateFormFile(field, f.name)
		require.NoError(t, err)
		_, err = fw.Write(f.data)
		require.NoError(t, err)
	}
	require.NoError(t, w.Close())
	return &buf, w.FormDataContentType()
}

func fixture(t *testing.T, rel string) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "fixtures", rel))
	require.NoError(t, err, "fixture %s must exist", rel)
	return data
}

func postMultipart(t *testing.T, r *gin.Engine, path string, fields map[string]string, files map[string]uploadFile) *httptest.ResponseRecorder {
	t.Helper()
	body, ct := multipartBody(t, fields, files)
	req := httptest.NewRequest(http.MethodPost, path, body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func postJSON(t *testing.T, r *gin.Engine, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	data, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func TestFirmwareAnalyzeMultipart(t *testing.T) {
	r := newArtifactRouter()
	rec := postMultipart(t, r, "/api/v1/firmware/analyze",
		map[string]string{"profile": "embedded/infineon", "device_lifetime": "10y+"},
		map[string]uploadFile{"file": {"firmware.bin", fixture(t, "partners/infineon/classical-mcu/firmware.bin")}})

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Report struct {
			ProfileID      string `json:"profile_id"`
			TenantID       string `json:"tenant_id"`
			DeviceLifetime string `json:"expected_device_lifetime"`
			CBOM           []any  `json:"cbom"`
		} `json:"report"`
		Decision artifactDecision `json:"decision"`
		Engine   string           `json:"engine"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, "embedded/infineon", resp.Report.ProfileID)
	require.Equal(t, "tenant-test-1", resp.Report.TenantID, "tenant must come from the auth context")
	require.Equal(t, "10+ years", resp.Report.DeviceLifetime)
	require.NotEmpty(t, resp.Report.CBOM)
	require.Equal(t, "BLOCK", resp.Decision.Decision)
	require.Equal(t, "firmware-static", resp.Engine)
	require.Contains(t, rec.Body.String(), "never executed")
}

func TestFirmwareAnalyzeJSONBase64(t *testing.T) {
	r := newArtifactRouter()
	data := fixture(t, "partners/infineon/classical-mcu/firmware.bin")
	rec := postJSON(t, r, "/api/v1/firmware/analyze", map[string]any{
		"file_name":       "fw.bin",
		"content_base64":  base64.StdEncoding.EncodeToString(data),
		"profile":         "embedded/infineon",
		"device_lifetime": "2-5y",
	})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Report struct {
			FileName  string `json:"file_name"`
			ProfileID string `json:"profile_id"`
		} `json:"report"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, "fw.bin", resp.Report.FileName)
	require.Equal(t, "embedded/infineon", resp.Report.ProfileID)
}

func TestFirmwareAnalyzeUnknownProfileFallsBack(t *testing.T) {
	r := newArtifactRouter()
	rec := postMultipart(t, r, "/api/v1/firmware/analyze",
		map[string]string{"profile": "does/not/exist"},
		map[string]uploadFile{"file": {"fw.bin", fixture(t, "partners/infineon/classical-mcu/firmware.bin")}})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Report struct {
			ProfileID string `json:"profile_id"`
		} `json:"report"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, "embedded/generic", resp.Report.ProfileID, "unknown profile must fall back to the domain generic profile")
}

func TestFirmwareAnalyzeMissingArtifactIsBadRequest(t *testing.T) {
	r := newArtifactRouter()
	rec := postJSON(t, r, "/api/v1/firmware/analyze", map[string]any{"profile": "embedded/infineon"})
	require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
}

func TestFirmwareCompareMultipart(t *testing.T) {
	r := newArtifactRouter()
	rec := postMultipart(t, r, "/api/v1/firmware/compare",
		map[string]string{"profile": "embedded/infineon"},
		map[string]uploadFile{
			"from": {"v1.bin", fixture(t, "partners/infineon/firmware-diff/v1.bin")},
			"to":   {"v2.bin", fixture(t, "partners/infineon/firmware-diff/v2.bin")},
		})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Diff firmware.Diff `json:"diff"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, "v1.bin", resp.Diff.From)
	require.Equal(t, "v2.bin", resp.Diff.To)
}

func TestIdentityAnalyzeCertificate(t *testing.T) {
	r := newArtifactRouter()
	rec := postMultipart(t, r, "/api/v1/identity/analyze",
		map[string]string{"profile": "identity/gd"},
		map[string]uploadFile{"file": {"device-rsa2048.pem", fixture(t, "partners/gd/certificate/device-rsa2048.pem")}})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Report struct {
			Format       string `json:"format"`
			Certificates []struct {
				Risk struct {
					QuantumStatus string `json:"quantum_status"`
				} `json:"risk"`
			} `json:"certificates"`
		} `json:"report"`
		Decision artifactDecision `json:"decision"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, "certificate", resp.Report.Format)
	require.Len(t, resp.Report.Certificates, 1)
	require.Equal(t, "BLOCK", resp.Decision.Decision)
}

func TestIdentityNeverEmitsPrivateKey(t *testing.T) {
	certPEM, keyPEM := selfSignedRSA(t)
	artifact := append(append([]byte{}, certPEM...), keyPEM...)

	r := newArtifactRouter()
	rec := postMultipart(t, r, "/api/v1/identity/analyze", nil,
		map[string]uploadFile{"file": {"identity.pem", artifact}})
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	body := rec.Body.String()
	require.NotContains(t, body, "PRIVATE KEY", "the API must never echo private key material")
	require.NotContains(t, body, "BEGIN RSA")
	require.Contains(t, body, "device.example", "the certificate subject should still be reported")
}

func TestArtifactProfilesAndLimits(t *testing.T) {
	r := newArtifactRouter()

	fw := httptest.NewRecorder()
	r.ServeHTTP(fw, httptest.NewRequest(http.MethodGet, "/api/v1/firmware/profiles", nil))
	require.Equal(t, http.StatusOK, fw.Code)
	require.Contains(t, fw.Body.String(), "embedded/infineon")
	require.Contains(t, fw.Body.String(), "embedded/generic")

	id := httptest.NewRecorder()
	r.ServeHTTP(id, httptest.NewRequest(http.MethodGet, "/api/v1/identity/profiles", nil))
	require.Equal(t, http.StatusOK, id.Code)
	require.Contains(t, id.Body.String(), "identity/gd")

	lim := httptest.NewRecorder()
	r.ServeHTTP(lim, httptest.NewRequest(http.MethodGet, "/api/v1/firmware/limits", nil))
	require.Equal(t, http.StatusOK, lim.Code)
	require.Contains(t, lim.Body.String(), "max_file_bytes")
}

func TestCheckArtifactSize(t *testing.T) {
	require.NoError(t, checkArtifactSize(uploadedArtifact{Data: make([]byte, 10)}, 10))
	require.ErrorIs(t, checkArtifactSize(uploadedArtifact{Data: make([]byte, 11)}, 10), errTooLarge)
}

func TestNormalizeLifetime(t *testing.T) {
	cases := map[string]string{
		"":         "unknown",
		"unknown":  "unknown",
		"<2y":      "<2 years",
		"2-5y":     "2-5 years",
		"5-10y":    "5-10 years",
		"10y+":     "10+ years",
		"whatever": "whatever",
	}
	for in, want := range cases {
		require.Equal(t, want, normalizeLifetime(in), "input %q", in)
	}
}

func TestWriteUploadErrorTooLarge(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	writeUploadError(c, errTooLarge)
	require.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)
}

func selfSignedRSA(t *testing.T) (certPEM, keyPEM []byte) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	tmpl := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "device.example"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(24 * time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	require.NoError(t, err)
	certPEM = pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyDER, err := x509.MarshalPKCS8PrivateKey(key)
	require.NoError(t, err)
	keyPEM = pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER})
	return certPEM, keyPEM
}

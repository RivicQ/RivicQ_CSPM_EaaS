package shared

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/firmware"
	"github.com/rivic-q/cryptobom-saas/internal/identity"
	"github.com/rivic-q/cryptobom-saas/internal/profile"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
	"github.com/sirupsen/logrus"
)

// The firmware/identity analysis API exposes the P0 static engines (internal/
// firmware, internal/identity) over HTTP so the CLI and the platform share one
// implementation. The routes are mounted on the same /api/v1 group as every
// other scanner route and inherit the deny-by-default auth gate, the RBAC
// permission model, tenant resolution and the audit middleware.
//
// Uploaded artifacts are untrusted input. The body is hard-capped with
// http.MaxBytesReader before parsing, every artifact is size-checked against the
// engine limit, and the engines never execute the artifact or extract secrets.

const (
	// firmwareBodyCap allows one default-limit firmware file (64 MiB) plus
	// multipart framing overhead.
	firmwareBodyCap = int64(68 << 20)
	// identityBodyCap allows one default-limit identity artifact (32 MiB).
	identityBodyCap = int64(36 << 20)
	// multipartMemory is the in-memory threshold before spilling to temp files.
	multipartMemory = int64(8 << 20)
)

var errNoArtifact = errors.New("no artifact provided; supply a multipart file field or JSON content_base64")

// uploadedArtifact is one in-memory artifact (never written to disk by us).
type uploadedArtifact struct {
	Name string
	Data []byte
}

// artifactRequest is a parsed analysis request.
type artifactRequest struct {
	Artifact       uploadedArtifact
	Second         *uploadedArtifact // present for compare
	Profile        string
	DeviceLifetime string
}

// artifactDecision is the shared CI-style gate outcome for an analysis.
type artifactDecision struct {
	Decision   string   `json:"decision"` // PASS | WARN | BLOCK
	BlockCount int      `json:"block_count"`
	WarnCount  int      `json:"warn_count"`
	Blocked    []string `json:"blocked,omitempty"`
	Warned     []string `json:"warned,omitempty"`
}

// jsonUpload is the JSON-body upload shape (base64-encoded artifacts).
type jsonUpload struct {
	FileName       string `json:"file_name"`
	ContentBase64  string `json:"content_base64"`
	Profile        string `json:"profile"`
	DeviceLifetime string `json:"device_lifetime"`

	FromFileName      string `json:"from_file_name"`
	FromContentBase64 string `json:"from_content_base64"`
	ToFileName        string `json:"to_file_name"`
	ToContentBase64   string `json:"to_content_base64"`
}

// SetupFirmwareIdentityRoutes registers the firmware and identity analysis
// endpoints. It is edition-agnostic and is called from both OSS and Enterprise
// route setup.
func SetupFirmwareIdentityRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	fw := router.Group("/firmware")
	{
		fw.POST("/analyze", AnalyzeFirmware(logger))
		fw.POST("/compare", CompareFirmware(logger))
		fw.GET("/profiles", ListArtifactProfiles(profile.DomainEmbedded, logger))
		fw.GET("/limits", ArtifactLimitsHandler(profile.DomainEmbedded, logger))
	}

	id := router.Group("/identity")
	{
		id.POST("/analyze", AnalyzeIdentity(logger))
		id.GET("/profiles", ListArtifactProfiles(profile.DomainIdentity, logger))
		id.GET("/limits", ArtifactLimitsHandler(profile.DomainIdentity, logger))
	}
}

// AnalyzeFirmware statically analyzes an uploaded firmware artifact.
func AnalyzeFirmware(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		limits := firmware.DefaultLimits()
		req, err := parseSingle(c, firmwareBodyCap)
		if err != nil {
			writeUploadError(c, err)
			return
		}
		if err := checkArtifactSize(req.Artifact, limits.MaxFileBytes); err != nil {
			writeUploadError(c, err)
			return
		}

		prof := profile.Resolve(profile.Default(), req.Profile, profile.DomainEmbedded)
		opts := firmware.Options{TenantID: tenant.Resolve(c), DeviceLifetime: normalizeLifetime(req.DeviceLifetime)}

		rep, err := firmware.AnalyzeBytes(c.Request.Context(), req.Artifact.Name, req.Artifact.Data, prof, limits, opts)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}

		logger.WithFields(logrus.Fields{
			"file": rep.FileName, "profile": rep.ProfileID, "tenant": rep.TenantID,
			"algorithms": len(rep.Algorithms), "certificates": len(rep.Certificates),
		}).Info("Analyzed firmware artifact")

		c.JSON(http.StatusOK, gin.H{
			"report":    rep,
			"decision":  decisionFromFirmware(rep),
			"engine":    "firmware-static",
			"tenant_id": rep.TenantID,
			"edition":   edition.Detect().Edition,
			"note":      "Static metadata analysis of untrusted firmware. The artifact is never executed and no keys are extracted.",
		})
	}
}

// CompareFirmware diffs two uploaded firmware artifacts.
func CompareFirmware(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		limits := firmware.DefaultLimits()
		req, err := parseCompare(c, firmwareBodyCap)
		if err != nil {
			writeUploadError(c, err)
			return
		}
		if err := checkArtifactSize(req.Artifact, limits.MaxFileBytes); err != nil {
			writeUploadError(c, err)
			return
		}
		if err := checkArtifactSize(*req.Second, limits.MaxFileBytes); err != nil {
			writeUploadError(c, err)
			return
		}

		prof := profile.Resolve(profile.Default(), req.Profile, profile.DomainEmbedded)
		opts := firmware.Options{TenantID: tenant.Resolve(c), DeviceLifetime: normalizeLifetime(req.DeviceLifetime)}
		ctx := c.Request.Context()

		from, err := firmware.AnalyzeBytes(ctx, req.Artifact.Name, req.Artifact.Data, prof, limits, opts)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "from: " + err.Error()})
			return
		}
		to, err := firmware.AnalyzeBytes(ctx, req.Second.Name, req.Second.Data, prof, limits, opts)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "to: " + err.Error()})
			return
		}
		diff := firmware.Compare(from, to)

		logger.WithFields(logrus.Fields{
			"from": from.FileName, "to": to.FileName, "changed": diff.Changed,
		}).Info("Compared firmware artifacts")

		c.JSON(http.StatusOK, gin.H{
			"diff":      diff,
			"engine":    "firmware-static",
			"tenant_id": tenant.Resolve(c),
			"edition":   edition.Detect().Edition,
			"note":      "Static metadata diff. The artifacts are never executed.",
		})
	}
}

// AnalyzeIdentity statically analyzes an uploaded identity/connectivity artifact.
func AnalyzeIdentity(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		limits := identity.DefaultLimits()
		req, err := parseSingle(c, identityBodyCap)
		if err != nil {
			writeUploadError(c, err)
			return
		}
		if err := checkArtifactSize(req.Artifact, limits.MaxFileBytes); err != nil {
			writeUploadError(c, err)
			return
		}

		prof := profile.Resolve(profile.Default(), req.Profile, profile.DomainIdentity)
		opts := identity.Options{TenantID: tenant.Resolve(c), DeviceLifetime: normalizeLifetime(req.DeviceLifetime)}

		rep, err := identity.AnalyzeBytes(c.Request.Context(), req.Artifact.Name, req.Artifact.Data, prof, limits, opts)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}

		logger.WithFields(logrus.Fields{
			"file": rep.FileName, "profile": rep.ProfileID, "tenant": rep.TenantID,
			"certificates": len(rep.Certificates), "identities": len(rep.Identities),
		}).Info("Analyzed identity artifact")

		c.JSON(http.StatusOK, gin.H{
			"report":    rep,
			"decision":  decisionFromIdentity(rep),
			"engine":    "identity-static",
			"tenant_id": rep.TenantID,
			"edition":   edition.Detect().Edition,
			"note":      "Static metadata analysis of identity artifacts. No private keys, credentials, SIM secrets or secure-element secrets are read or emitted.",
		})
	}
}

// ListArtifactProfiles lists the data-driven profiles for a domain.
func ListArtifactProfiles(domain profile.Domain, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		all := profile.Default().List()
		out := make([]profile.Profile, 0, len(all))
		for _, p := range all {
			if p.Domain == domain {
				out = append(out, p)
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"domain":          domain,
			"profiles":        out,
			"default_profile": profile.Resolve(profile.Default(), "", domain).ID,
			"note":            "Profiles are data-driven detection rule sets; partner and generic profiles are ordinary entries.",
		})
	}
}

// ArtifactLimitsHandler reports the hard safety limits applied to artifacts.
func ArtifactLimitsHandler(domain profile.Domain, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if domain == profile.DomainIdentity {
			c.JSON(http.StatusOK, gin.H{"domain": domain, "limits": identity.DefaultLimits()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"domain": domain, "limits": firmware.DefaultLimits()})
	}
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

func parseSingle(c *gin.Context, bodyCap int64) (*artifactRequest, error) {
	if isMultipart(c) {
		arts, prof, life, err := parseMultipart(c, bodyCap, "file")
		if err != nil {
			return nil, err
		}
		return &artifactRequest{Artifact: arts[0], Profile: prof, DeviceLifetime: life}, nil
	}
	body, err := parseJSONUpload(c, bodyCap)
	if err != nil {
		return nil, err
	}
	art, err := decodeBase64Artifact(body.ContentBase64, defaultName(body.FileName, "artifact"))
	if err != nil {
		return nil, err
	}
	return &artifactRequest{Artifact: art, Profile: body.Profile, DeviceLifetime: body.DeviceLifetime}, nil
}

func parseCompare(c *gin.Context, bodyCap int64) (*artifactRequest, error) {
	if isMultipart(c) {
		arts, prof, life, err := parseMultipart(c, bodyCap, "from", "to")
		if err != nil {
			return nil, err
		}
		return &artifactRequest{Artifact: arts[0], Second: &arts[1], Profile: prof, DeviceLifetime: life}, nil
	}
	body, err := parseJSONUpload(c, bodyCap)
	if err != nil {
		return nil, err
	}
	from, err := decodeBase64Artifact(body.FromContentBase64, defaultName(body.FromFileName, "from"))
	if err != nil {
		return nil, err
	}
	to, err := decodeBase64Artifact(body.ToContentBase64, defaultName(body.ToFileName, "to"))
	if err != nil {
		return nil, err
	}
	return &artifactRequest{Artifact: from, Second: &to, Profile: body.Profile, DeviceLifetime: body.DeviceLifetime}, nil
}

func isMultipart(c *gin.Context) bool {
	return strings.HasPrefix(c.ContentType(), "multipart/form-data")
}

func parseMultipart(c *gin.Context, bodyCap int64, fields ...string) ([]uploadedArtifact, string, string, error) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bodyCap)
	if err := c.Request.ParseMultipartForm(multipartMemory); err != nil {
		return nil, "", "", err
	}
	if c.Request.MultipartForm != nil {
		defer c.Request.MultipartForm.RemoveAll()
	}
	arts := make([]uploadedArtifact, 0, len(fields))
	for _, field := range fields {
		art, err := readFormFile(c, field)
		if err != nil {
			return nil, "", "", err
		}
		arts = append(arts, art)
	}
	return arts, strings.TrimSpace(c.PostForm("profile")), strings.TrimSpace(c.PostForm("device_lifetime")), nil
}

func readFormFile(c *gin.Context, field string) (uploadedArtifact, error) {
	fh, err := c.FormFile(field)
	if err != nil {
		return uploadedArtifact{}, errNoArtifact
	}
	f, err := fh.Open()
	if err != nil {
		return uploadedArtifact{}, err
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		return uploadedArtifact{}, err
	}
	return uploadedArtifact{Name: defaultName(fh.Filename, field), Data: data}, nil
}

func parseJSONUpload(c *gin.Context, bodyCap int64) (*jsonUpload, error) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bodyCap)
	var body jsonUpload
	if err := json.NewDecoder(c.Request.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body, nil
}

func decodeBase64Artifact(value, name string) (uploadedArtifact, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return uploadedArtifact{}, errNoArtifact
	}
	data, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		if raw, rawErr := base64.RawStdEncoding.DecodeString(value); rawErr == nil {
			data = raw
		} else {
			return uploadedArtifact{}, errors.New("content_base64 is not valid base64")
		}
	}
	return uploadedArtifact{Name: name, Data: data}, nil
}

func checkArtifactSize(a uploadedArtifact, max int64) error {
	if int64(len(a.Data)) > max {
		return errTooLarge
	}
	return nil
}

var errTooLarge = errors.New("artifact exceeds size limit")

func writeUploadError(c *gin.Context, err error) {
	var maxErr *http.MaxBytesError
	switch {
	case errors.As(err, &maxErr):
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "request body exceeds size limit", "max_bytes": maxErr.Limit})
	case errors.Is(err, errNoArtifact):
		c.JSON(http.StatusBadRequest, gin.H{"error": errNoArtifact.Error()})
	case errors.Is(err, errTooLarge):
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": errTooLarge.Error()})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
	}
}

func defaultName(name, fallback string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return fallback
	}
	return filepath.Base(name)
}

func normalizeLifetime(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "", "unknown":
		return "unknown"
	case "<2y", "<2":
		return "<2 years"
	case "2-5y":
		return "2-5 years"
	case "5-10y":
		return "5-10 years"
	case "10y+", "10+", "10y":
		return "10+ years"
	default:
		return v
	}
}

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

func decisionFromFirmware(rep *firmware.Report) artifactDecision {
	var vulnerable []string
	for _, cf := range rep.Certificates {
		if cf.Risk.QuantumStatus == "quantum_vulnerable" {
			vulnerable = append(vulnerable, "certificate:"+cf.Metadata.Subject)
		}
	}
	return artifactDecisionFrom(rep.Algorithms, vulnerable)
}

func decisionFromIdentity(rep *identity.Report) artifactDecision {
	var vulnerable []string
	for _, cf := range rep.Certificates {
		if cf.Risk.QuantumStatus == "quantum_vulnerable" {
			vulnerable = append(vulnerable, "certificate:"+cf.Metadata.Subject)
		}
	}
	return artifactDecisionFrom(rep.Algorithms, vulnerable)
}

func artifactDecisionFrom(algs []cryptoscan.AlgorithmFinding, vulnerableCerts []string) artifactDecision {
	blocked := map[string]bool{}
	warned := map[string]bool{}
	for _, a := range algs {
		switch a.PQCStatus {
		case "migration_required", "broken_classical":
			blocked[a.Algorithm] = true
		case "migration_recommended":
			warned[a.Algorithm] = true
		}
	}
	for _, name := range vulnerableCerts {
		blocked[name] = true
	}
	d := artifactDecision{
		Decision:   "PASS",
		Blocked:    sortedKeys(blocked),
		Warned:     sortedKeys(warned),
		BlockCount: len(blocked),
		WarnCount:  len(warned),
	}
	switch {
	case d.BlockCount > 0:
		d.Decision = "BLOCK"
	case d.WarnCount > 0:
		d.Decision = "WARN"
	}
	return d
}

func sortedKeys(m map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

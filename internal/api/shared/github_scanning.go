package shared

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
	"github.com/sirupsen/logrus"
)

type GHRepo struct {
	FullName      string `json:"full_name"`
	CloneURL      string `json:"clone_url"`
	DefaultBranch string `json:"default_branch"`
	Private       bool   `json:"private"`
	Description   string `json:"description"`
	Language      string `json:"language"`
	UpdatedAt     string `json:"updated_at"`
}

type GHScanRequest struct {
	Repos    []string `json:"repos" binding:"required"`
	ScanType string   `json:"scan_type"`
	DeepScan bool     `json:"deep_scan"`
}

type GHScanResult struct {
	ScanID string `json:"scan_id"`
	Repo   string `json:"repo"`
	// EngineVersion pins the detector rule set that produced these findings.
	EngineVersion   string        `json:"engine_version,omitempty"`
	TaxonomyVersion string        `json:"pqc_taxonomy_version,omitempty"`
	Status          string        `json:"status"`
	CryptoFindings  []GHFinding   `json:"crypto_findings,omitempty"`
	Summary         GHSummary     `json:"summary,omitempty"`
	ScannedAt       string        `json:"scanned_at"`
	CommitSHA       string        `json:"commit_sha,omitempty"`
	DefaultBranch   string        `json:"default_branch,omitempty"`
	Languages       []string      `json:"languages,omitempty"`
	Stages          []GHScanStage `json:"stages,omitempty"`
	SBOM            []GHComponent `json:"sbom,omitempty"`
	CBOM            []GHComponent `json:"cbom,omitempty"`
	PQCReadiness    int           `json:"pqc_readiness,omitempty"`
	FileCount       int           `json:"file_count,omitempty"`
	Error           string        `json:"error,omitempty"`
	Demo            bool          `json:"demo,omitempty"`
}

type GHFinding struct {
	ID          string `json:"id"`
	Fingerprint string `json:"fingerprint"`
	RuleID      string `json:"rule_id"`
	// Confidence is 0..1 and reflects evidence strength, not severity:
	// a pattern match is weaker than an exact version-to-advisory match.
	Confidence  float64  `json:"confidence"`
	FilePath    string   `json:"file_path"`
	LineNumber  int      `json:"line_number"`
	FindingType string   `json:"finding_type"`
	Algorithm   string   `json:"algorithm"`
	KeyLength   int      `json:"key_length,omitempty"`
	Severity    string   `json:"severity"`
	Description string   `json:"description"`
	Remediation string   `json:"remediation"`
	QuantumSafe bool     `json:"quantum_safe"`
	OWASP       string   `json:"owasp,omitempty"`
	CWE         string   `json:"cwe,omitempty"`
	Evidence    string   `json:"evidence,omitempty"`
	Tool        string   `json:"tool,omitempty"`
	CVE         string   `json:"cve,omitempty"`
	Compliance  []string `json:"compliance,omitempty"`
	Demo        bool     `json:"demo,omitempty"`
}

type GHSummary struct {
	TotalFindings int `json:"total_findings"`
	Critical      int `json:"critical"`
	High          int `json:"high"`
	Medium        int `json:"medium"`
	Low           int `json:"low"`
	QuantumUnsafe int `json:"quantum_unsafe"`
}

func GitHubScanHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := os.Getenv("GITHUB_TOKEN")
		if token == "" && !demoModeEnabled() {
			c.JSON(http.StatusBadGateway, gin.H{"error": "GitHub token not configured. Set GITHUB_TOKEN or enable DEMO_MODE for the synthetic fixture repository."})
			return
		}

		var req GHScanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.ScanType == "" {
			req.ScanType = "crypto"
		}

		jobID := uuid.New().String()
		storeGHScanJob(&ghScanJob{
			ID:       jobID,
			TenantID: requestTenant(c),
			Status:   "queued",
			Stage:    "queued",
			Stages:   []GHScanStage{{ID: "queued", Label: "Queued", Status: "completed"}},
			Demo:     token == "" && demoModeEnabled(),
		})

		go runGitHubScanJob(jobID, token, req.Repos, req.ScanType, req.DeepScan, logger)

		c.JSON(http.StatusAccepted, gin.H{
			"scan_id": jobID,
			"repos":   []GHScanResult{},
			"total":   len(req.Repos),
			"status":  "queued",
			"stage":   "queued",
			"source":  "github_content",
			"demo":    token == "" && demoModeEnabled(),
		})
	}
}

func runGitHubScanJob(jobID, token string, repos []string, scanType string, deep bool, logger *logrus.Logger) {
	updateGHScanJob(jobID, func(job *ghScanJob) {
		job.Status = "running"
		job.Stage = "fetching"
		job.Stages = append(job.Stages, GHScanStage{ID: "fetching", Label: "Connecting to GitHub", Status: "completed"})
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	results := make([]GHScanResult, 0, len(repos))
	for _, repo := range repos {
		scanResult := scanGitHubRepo(ctx, token, repo, scanType, deep, logger)
		results = append(results, scanResult)
	}

	status := "completed"
	errMsg := ""
	for _, r := range results {
		if r.Status == "failed" {
			status = "failed"
			errMsg = r.Error
			break
		}
		if r.Status == "partial" {
			status = "completed_with_warnings"
		}
	}

	updateGHScanJob(jobID, func(job *ghScanJob) {
		job.Status = status
		job.Stage = status
		job.Results = results
		job.Error = errMsg
		if len(results) > 0 && len(results[0].Stages) > 0 {
			job.Stages = results[0].Stages
		}
		job.Demo = len(results) > 0 && results[0].Demo
	})
}

func GitHubRepoListHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := os.Getenv("GITHUB_TOKEN")
		if token == "" {
			if demoModeEnabled() {
				c.JSON(http.StatusOK, gin.H{
					"repos": []GHRepo{{
						FullName:      "rivicq/demo-vulnerable-app",
						CloneURL:      "https://github.com/rivicq/demo-vulnerable-app.git",
						DefaultBranch: "main",
						Private:       false,
						Description:   "SYNTHETIC DEMO repository fixture used to prove the content scanner (not production data)",
						Language:      "Go",
						UpdatedAt:     time.Now().UTC().Format(time.RFC3339),
					}},
					"total": 1,
					"demo":  true,
				})
				return
			}
			c.JSON(http.StatusBadGateway, gin.H{"error": "GitHub token not configured"})
			return
		}

		org := c.DefaultQuery("org", "")
		url := "https://api.github.com/user/repos?per_page=100&sort=updated&type=all"
		if org != "" {
			url = fmt.Sprintf("https://api.github.com/orgs/%s/repos?per_page=100&sort=updated", org)
		}

		client := &http.Client{Timeout: 15 * time.Second}
		req, _ := http.NewRequestWithContext(c.Request.Context(), "GET", url, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/vnd.github.v3+json")

		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("GitHub API request failed: %v", err)})
			return
		}
		defer func() { _ = resp.Body.Close() }()

		if resp.StatusCode != http.StatusOK {
			c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("GitHub API returned status %d", resp.StatusCode)})
			return
		}

		var ghRepos []GHRepo
		var rawRepos []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&rawRepos); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse GitHub response"})
			return
		}

		for _, r := range rawRepos {
			name, _ := r["full_name"].(string)
			cloneURL, _ := r["clone_url"].(string)
			defaultBranch, _ := r["default_branch"].(string)
			private, _ := r["private"].(bool)
			desc, _ := r["description"].(string)
			lang, _ := r["language"].(string)
			updated, _ := r["updated_at"].(string)

			if name != "" {
				ghRepos = append(ghRepos, GHRepo{
					FullName:      name,
					CloneURL:      cloneURL,
					DefaultBranch: defaultBranch,
					Private:       private,
					Description:   desc,
					Language:      lang,
					UpdatedAt:     updated,
				})
			}
		}

		c.JSON(http.StatusOK, gin.H{"repos": ghRepos, "total": len(ghRepos)})
	}
}

func GitHubScanStatusHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if job, ok := getGHScanJobForTenant(requestTenant(c), id); ok {
			c.JSON(http.StatusOK, gin.H{
				"scan_id": job.ID,
				"status":  job.Status,
				"stage":   job.Stage,
				"stages":  flattenJobStages(job),
				"repos":   job.Results,
				"error":   job.Error,
				"demo":    job.Demo,
			})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{
			"scan_id": id,
			"status":  "not_found",
			"error":   "scan not found — trigger POST /github/scan first",
		})
	}
}

func GitHubScanListHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		jobs := listGHScanJobsForTenant(requestTenant(c))
		out := make([]gin.H, 0, len(jobs))
		for _, job := range jobs {
			findings := 0
			repo := ""
			if len(job.Results) > 0 {
				findings = job.Results[0].Summary.TotalFindings
				repo = job.Results[0].Repo
			}
			out = append(out, gin.H{
				"scan_id":  job.ID,
				"status":   job.Status,
				"stage":    job.Stage,
				"repo":     repo,
				"findings": findings,
				"demo":     job.Demo,
				"error":    job.Error,
			})
		}
		c.JSON(http.StatusOK, gin.H{"scans": out, "total": len(out)})
	}
}

func GitHubScanCompareHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		tid := requestTenant(c)
		current, ok := getGHScanJobForTenant(tid, c.Param("id"))
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
			return
		}
		against, ok := getGHScanJobForTenant(tid, c.Query("against"))
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "comparison scan not found"})
			return
		}
		c.JSON(http.StatusOK, compareGHScans(current, against))
	}
}

// WebhookSecretFromEnv returns the configured shared secret for GitHub
// webhooks. An empty result means the endpoint cannot be used safely.
func WebhookSecretFromEnv() string {
	for _, key := range []string{"RIVICQ_GITHUB_WEBHOOK_SECRET", "GITHUB_WEBHOOK_SECRET"} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	return ""
}

// verifyGitHubSignature checks the X-Hub-Signature-256 header using a
// constant-time comparison.
//
// GitHub signs the raw request body with HMAC-SHA256 keyed by the webhook
// secret and sends it as "sha256=<base64>".
func verifyGitHubSignature(secret string, payload []byte, header string) error {
	if secret == "" {
		return fmt.Errorf("webhook secret is not configured")
	}
	if header == "" {
		return fmt.Errorf("missing X-Hub-Signature-256 header")
	}
	const prefix = "sha256="
	if !strings.HasPrefix(header, prefix) {
		return fmt.Errorf("unsupported signature algorithm")
	}
	provided, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(header, prefix))
	if err != nil {
		return fmt.Errorf("malformed signature encoding")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	if _, err := mac.Write(payload); err != nil {
		return err
	}
	if !hmac.Equal(provided, mac.Sum(nil)) {
		return fmt.Errorf("signature mismatch")
	}
	return nil
}

// DefaultWebhookBodyBytes caps the delivery body.
//
// The limit is applied before the body is read, not after, so an oversized
// payload costs one rejected connection instead of the memory it would have
// occupied. GitHub push payloads for large repositories comfortably exceed a
// megabyte, so this is generous for real deliveries while still bounding the
// damage from an attacker who has replayed a captured body.
const DefaultWebhookBodyBytes int64 = 8 << 20 // 8 MiB

// DefaultWebhookReplayTTL is how long a delivery ID is remembered.
const DefaultWebhookReplayTTL = 30 * time.Minute

// maxWebhookBodyBytes returns the configured body ceiling, falling back to the
// default when the value is unset or nonsensical. A limit of zero or negative
// would reject every delivery, so it is ignored rather than honoured.
func maxWebhookBodyBytes() int64 {
	if v, err := strconv.ParseInt(strings.TrimSpace(os.Getenv("RIVICQ_GITHUB_WEBHOOK_MAX_BYTES")), 10, 64); err == nil && v > 0 {
		return v
	}
	return DefaultWebhookBodyBytes
}

// webhookReplayTTL returns the configured replay window.
func webhookReplayTTL() time.Duration {
	if v, err := strconv.ParseInt(strings.TrimSpace(os.Getenv("RIVICQ_WEBHOOK_REPLAY_TTL_SECONDS")), 10, 64); err == nil && v > 0 {
		return time.Duration(v) * time.Second
	}
	return DefaultWebhookReplayTTL
}

// webhookScanConcurrency bounds scans started from webhook deliveries.
//
// Each delivery used to start an unbounded goroutine, so replaying one captured
// push could exhaust memory and outbound GitHub API quota.
var webhookScanConcurrency = make(chan struct{}, 4)

// webhookScanTimeout caps a single delivery-triggered scan. Without it a scan
// that never completes keeps its goroutine and file descriptors forever.
const webhookScanTimeout = 10 * time.Minute

// githubDeliveries remembers recently accepted deliveries to reject replays.
// The TTL is read per request so it can be tuned without a restart; the cache
// itself is process-local.
var githubDeliveries = newDeliveryCache(DefaultWebhookReplayTTL, 20000)

// GitHubWebhookHandler accepts push and pull_request deliveries.
//
// The payload is authenticated with an HMAC signature before it is parsed, and
// the repository name comes only from the signed body. An unsigned or
// incorrectly signed delivery is rejected outright; when no secret is
// configured the endpoint is disabled rather than open.
func GitHubWebhookHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		event := c.GetHeader("X-GitHub-Event")
		delivery := c.GetHeader("X-GitHub-Delivery")

		secret := WebhookSecretFromEnv()
		if secret == "" {
			logger.Error("GitHub webhook received but no webhook secret is configured; refusing delivery")
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":   "webhook_disabled",
				"message": "GitHub webhook secret is not configured",
			})
			return
		}

		// Bound the body before reading it. An unbounded read here would let an
		// unauthenticated caller exhaust memory before we ever check a signature.
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxWebhookBodyBytes())
		payload, err := io.ReadAll(c.Request.Body)
		if err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				logger.WithField("delivery", delivery).Warn("Rejected oversized GitHub webhook delivery")
				c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "payload_too_large"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read payload"})
			return
		}

		if err := verifyGitHubSignature(secret, payload, c.GetHeader("X-Hub-Signature-256")); err != nil {
			logger.WithError(err).WithField("delivery", delivery).Warn("Rejected GitHub webhook delivery")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
			return
		}

		// The signature proves the body is authentic, not that it is new. A
		// captured delivery replays byte for byte, so the delivery ID is
		// checked separately.
		if !githubDeliveries.rememberFor(delivery, webhookReplayTTL()) {
			logger.WithField("delivery", delivery).Warn("Rejected replayed GitHub webhook delivery")
			c.JSON(http.StatusConflict, gin.H{"error": "duplicate_delivery"})
			return
		}

		logger.WithFields(logrus.Fields{
			"event":    event,
			"delivery": delivery,
		}).Info("GitHub webhook received")

		// Only the events that represent new code need a scan.
		if event != "push" && event != "pull_request" {
			c.JSON(http.StatusOK, gin.H{
				"status":   "ignored",
				"event":    event,
				"delivery": delivery,
			})
			return
		}

		var eventData map[string]interface{}
		if err := json.Unmarshal(payload, &eventData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "malformed payload"})
			return
		}
		repo, _ := eventData["repository"].(map[string]interface{})
		fullName, _ := repo["full_name"].(string)
		if strings.TrimSpace(fullName) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "repository.full_name is required"})
			return
		}

		owner, _, ok := strings.Cut(fullName, "/")
		if !ok || owner == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "repository.full_name is malformed"})
			return
		}

		logger.WithField("repo", fullName).Info("Webhook for repository")
		token := os.Getenv("GITHUB_TOKEN")

		// Queue the scan instead of starting it inline: a burst of deliveries
		// must not turn into a burst of outbound GitHub calls. The slot is
		// released when the scan finishes, however long it takes.
		select {
		case webhookScanConcurrency <- struct{}{}:
		default:
			logger.WithField("repo", fullName).Warn("Webhook scan queue is saturated; delivery accepted without scanning")
			c.JSON(http.StatusAccepted, gin.H{
				"status":   "queued_later",
				"event":    event,
				"delivery": delivery,
			})
			return
		}

		go func(name string) {
			defer func() { <-webhookScanConcurrency }()

			// Bound the work: context.Background() left every stuck scan running
			// for the lifetime of the process.
			ctx, cancel := context.WithTimeout(context.Background(), webhookScanTimeout)
			defer cancel()

			result := scanGitHubRepo(ctx, token, name, "crypto", false, logger)
			storeGHScanJob(&ghScanJob{
				ID: result.ScanID, TenantID: tenant.PublicTenantID, Status: result.Status, Stage: "completed",
				Results: []GHScanResult{result}, Demo: result.Demo,
			})
		}(fullName)

		c.JSON(http.StatusOK, gin.H{
			"status":   "accepted",
			"event":    event,
			"delivery": delivery,
		})
	}
}

func flattenJobStages(job *ghScanJob) []GHScanStage {
	if len(job.Results) > 0 && len(job.Results[0].Stages) > 0 {
		return job.Results[0].Stages
	}
	return job.Stages
}

func demoModeEnabled() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("DEMO_MODE")))
	return v == "" || v == "true" || v == "1" || v == "yes"
}

func githubAPIBase() string {
	if v := strings.TrimSpace(os.Getenv("GITHUB_API_BASE")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "https://api.github.com"
}

func scanGitHubRepo(ctx context.Context, token, repo, scanType string, deep bool, logger *logrus.Logger) GHScanResult {
	_ = scanType
	if token == "" {
		files := loadDemoRepoFiles()
		result := AnalyzeRepositoryFiles(repo, files, true)
		result.DefaultBranch = "main"
		result.CommitSHA = "demo-fixture"
		logger.WithField("repo", repo).Info("GitHub scan used synthetic demo fixture (DEMO_MODE, no GITHUB_TOKEN)")
		return result
	}

	owner, name, ok := splitRepo(repo)
	if !ok {
		return GHScanResult{ScanID: uuid.New().String(), Repo: repo, Status: "failed", Error: "invalid repository (expected owner/name)", ScannedAt: time.Now().UTC().Format(time.RFC3339)}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	meta, err := githubGET(ctx, client, token, fmt.Sprintf("%s/repos/%s/%s", githubAPIBase(), owner, name))
	if err != nil {
		return GHScanResult{ScanID: uuid.New().String(), Repo: repo, Status: "failed", Error: err.Error(), ScannedAt: time.Now().UTC().Format(time.RFC3339)}
	}
	branch, _ := meta["default_branch"].(string)
	if branch == "" {
		branch = "main"
	}

	treeURL := fmt.Sprintf("%s/repos/%s/%s/git/trees/%s?recursive=1", githubAPIBase(), owner, name, branch)
	tree, err := githubGET(ctx, client, token, treeURL)
	if err != nil {
		return GHScanResult{ScanID: uuid.New().String(), Repo: repo, Status: "failed", Error: err.Error(), DefaultBranch: branch, ScannedAt: time.Now().UTC().Format(time.RFC3339)}
	}

	sha, _ := tree["sha"].(string)
	rawTree, _ := tree["tree"].([]interface{})
	paths := make([]string, 0)
	for _, item := range rawTree {
		m, _ := item.(map[string]interface{})
		p, _ := m["path"].(string)
		typ, _ := m["type"].(string)
		if typ != "blob" || p == "" || !isInterestingPath(p) {
			continue
		}
		paths = append(paths, p)
		limit := 40
		if deep {
			limit = 80
		}
		if len(paths) >= limit {
			break
		}
	}

	files := make([]RepoFile, 0, len(paths))
	for _, p := range paths {
		content, ferr := githubFileContent(ctx, client, token, owner, name, p)
		if ferr != nil {
			logger.WithError(ferr).WithField("path", p).Debug("skip file")
			continue
		}
		files = append(files, RepoFile{Path: p, Content: content})
	}

	result := AnalyzeRepositoryFiles(repo, files, false)
	result.DefaultBranch = branch
	result.CommitSHA = sha
	logger.WithFields(logrus.Fields{"repo": repo, "files": len(files), "findings": result.Summary.TotalFindings}).Info("GitHub content scan completed")
	return result
}

func splitRepo(repo string) (string, string, bool) {
	repo = strings.TrimSpace(strings.TrimPrefix(repo, "https://github.com/"))
	repo = strings.TrimSuffix(repo, ".git")
	parts := strings.Split(repo, "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func githubGET(ctx context.Context, client *http.Client, token, url string) (map[string]interface{}, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API %s returned %d", url, resp.StatusCode)
	}
	var out map[string]interface{}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func githubFileContent(ctx context.Context, client *http.Client, token, owner, name, path string) (string, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/contents/%s", githubAPIBase(), owner, name, path)
	payload, err := githubGET(ctx, client, token, url)
	if err != nil {
		return "", err
	}
	encoded, _ := payload["content"].(string)
	if encoded == "" {
		return "", fmt.Errorf("empty content")
	}
	encoded = strings.ReplaceAll(encoded, "\n", "")
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	if len(raw) > 512*1024 {
		raw = raw[:512*1024]
	}
	return string(raw), nil
}

func SetupGitHubScanningRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	ghGroup := router.Group("/github")
	{
		ghGroup.POST("/scan", GitHubScanHandler(logger))
		ghGroup.GET("/repos", GitHubRepoListHandler(logger))
		ghGroup.GET("/scans", GitHubScanListHandler(logger))
		ghGroup.GET("/scans/:id", GitHubScanStatusHandler(logger))
		ghGroup.GET("/scans/:id/compare", GitHubScanCompareHandler(logger))
		ghGroup.POST("/webhook", GitHubWebhookHandler(logger))
	}
}

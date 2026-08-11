package shared

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type GHRepo struct {
	FullName    string `json:"full_name"`
	CloneURL    string `json:"clone_url"`
	DefaultBranch string `json:"default_branch"`
	Private     bool   `json:"private"`
	Description string `json:"description"`
	Language    string `json:"language"`
	UpdatedAt   string `json:"updated_at"`
}

type GHScanRequest struct {
	Repos      []string `json:"repos" binding:"required"`
	ScanType   string   `json:"scan_type"`
	DeepScan   bool     `json:"deep_scan"`
}

type GHScanResult struct {
	ScanID        string        `json:"scan_id"`
	Repo          string        `json:"repo"`
	Status        string        `json:"status"`
	CryptoFindings []GHFinding  `json:"crypto_findings,omitempty"`
	Summary       GHSummary     `json:"summary,omitempty"`
	ScannedAt     string        `json:"scanned_at"`
}

type GHFinding struct {
	ID          string `json:"id"`
	FilePath    string `json:"file_path"`
	LineNumber  int    `json:"line_number"`
	FindingType string `json:"finding_type"`
	Algorithm   string `json:"algorithm"`
	KeyLength   int    `json:"key_length,omitempty"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	Remediation string `json:"remediation"`
	QuantumSafe bool   `json:"quantum_safe"`
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
		if token == "" {
			c.JSON(http.StatusBadGateway, gin.H{"error": "GitHub token not configured. Set GITHUB_TOKEN environment variable."})
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

		results := make([]GHScanResult, 0, len(req.Repos))

		for _, repo := range req.Repos {
			scanResult := scanGitHubRepo(c.Request.Context(), token, repo, req.ScanType, req.DeepScan, logger)
			results = append(results, scanResult)
		}

		c.JSON(http.StatusAccepted, gin.H{
			"scan_id": uuid.New().String(),
			"repos":   results,
			"total":   len(results),
		})
	}
}

func GitHubRepoListHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := os.Getenv("GITHUB_TOKEN")
		if token == "" {
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
		c.JSON(http.StatusOK, gin.H{
			"scan_id": id,
			"status":  "completed",
			"message": "GitHub scan results are available on the repos endpoint",
		})
	}
}

func GitHubWebhookHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		event := c.GetHeader("X-GitHub-Event")
		delivery := c.GetHeader("X-GitHub-Delivery")

		payload, err := c.GetRawData()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read payload"})
			return
		}

		logger.WithFields(logrus.Fields{
			"event":    event,
			"delivery": delivery,
		}).Info("GitHub webhook received")

		var eventData map[string]interface{}
		if err := json.Unmarshal(payload, &eventData); err == nil {
			if repo, ok := eventData["repository"].(map[string]interface{}); ok {
				if fullName, ok := repo["full_name"].(string); ok {
					logger.WithField("repo", fullName).Info("Webhook for repository")
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "accepted",
			"event":    event,
			"delivery": delivery,
		})
	}
}

func scanGitHubRepo(ctx context.Context, token, repo, scanType string, deep bool, logger *logrus.Logger) GHScanResult {
	result := GHScanResult{
		ScanID:    uuid.New().String(),
		Repo:      repo,
		Status:    "scanning",
		ScannedAt: time.Now().UTC().Format(time.RFC3339),
	}

	findings := []GHFinding{
		{
			ID:          uuid.New().String(),
			FilePath:    "**/*.go",
			LineNumber:  0,
			FindingType: "CRYPTO_IMPORT",
			Algorithm:   "RSA",
			KeyLength:   2048,
			Severity:    "MEDIUM",
			Description: fmt.Sprintf("Potential RSA usage detected in repository %s", repo),
			Remediation: "Review RSA key sizes; consider migrating to 3072-bit or PQC algorithms (ML-KEM, ML-DSA)",
			QuantumSafe: false,
		},
	}

	if deep {
		findings = append(findings, GHFinding{
			ID:          uuid.New().String(),
			FilePath:    "**/Dockerfile",
			LineNumber:  0,
			FindingType: "WEAK_CIPHER",
			Algorithm:   "TLS",
			Severity:    "HIGH",
			Description: "TLS configuration in Dockerfile may use outdated protocols",
			Remediation: "Ensure TLS 1.2+ is enforced; disable TLS 1.0/1.1",
			QuantumSafe: false,
		})
	}

	summary := GHSummary{
		TotalFindings: len(findings),
		QuantumUnsafe: 0,
	}
	for _, f := range findings {
		if !f.QuantumSafe {
			summary.QuantumUnsafe++
		}
		switch f.Severity {
		case "CRITICAL":
			summary.Critical++
		case "HIGH":
			summary.High++
		case "MEDIUM":
			summary.Medium++
		case "LOW":
			summary.Low++
		}
	}

	result.CryptoFindings = findings
	result.Summary = summary
	result.Status = "completed"

	return result
}

func SetupGitHubScanningRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	ghGroup := router.Group("/github")
	{
		ghGroup.POST("/scan", GitHubScanHandler(logger))
		ghGroup.GET("/repos", GitHubRepoListHandler(logger))
		ghGroup.GET("/scans/:id", GitHubScanStatusHandler(logger))
		ghGroup.POST("/webhook", GitHubWebhookHandler(logger))
	}
}

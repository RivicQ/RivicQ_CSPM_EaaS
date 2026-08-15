package shared

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAnalyzeRepositoryFiles_DemoFixtureProducesEvidence(t *testing.T) {
	files := loadDemoRepoFiles()
	require.Greater(t, len(files), 3, "demo fixture files must be embedded")

	result := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", files, true)
	require.Equal(t, "completed", result.Status)
	require.True(t, result.Demo)
	require.Greater(t, result.Summary.TotalFindings, 0)
	require.NotEmpty(t, result.Stages)
	require.Greater(t, result.PQCReadiness, -1)

	found := map[string]bool{}
	for _, f := range result.CryptoFindings {
		require.NotEmpty(t, f.FilePath)
		require.NotEmpty(t, f.FindingType)
		require.NotEmpty(t, f.Tool)
		require.True(t, f.Demo)
		if f.FindingType == "SECRET" {
			require.NotContains(t, f.Evidence, "wJalrXUtnFEMI")
		}
		found[f.FindingType] = true
		if f.Algorithm != "" {
			found[f.Algorithm] = true
		}
	}

	require.True(t, found["SECRET"], "must detect synthetic secrets from fixture files")
	require.True(t, found["MD5"] || found["WEAK_HASH"] || found["CRYPTO_IMPORT"], "must detect crypto from source")
	require.True(t, found["IAC"] || found["CONTAINER"], "must detect IaC or container issues from fixture")
	require.NotEmpty(t, result.SBOM, "package.json dependencies must produce SBOM components")
	require.NotEmpty(t, result.CBOM, "crypto usage must produce CBOM components")
	require.True(t, found["SCA"], "lodash@4.17.20 must map to a published CVE overlay")
	require.True(t, found["API"], "openapi.yaml must be discovered")
	require.NotEmpty(t, result.CryptoFindings[0].Compliance)
}

func TestAnalyzeRepositoryFiles_EmptyRepo(t *testing.T) {
	result := AnalyzeRepositoryFiles("empty/repo", nil, false)
	require.Equal(t, "completed", result.Status)
	require.Equal(t, 0, result.Summary.TotalFindings)
	require.Equal(t, 100, result.PQCReadiness)
	require.False(t, result.Demo)
}

func TestMaskSecret(t *testing.T) {
	require.Equal(t, "********", maskSecret("short"))
	masked := maskSecret("ghp_demoSyntheticTokenNotReal000000000000")
	require.True(t, len(masked) > 8)
	require.NotContains(t, masked, "demoSynthetic")
}

func TestSplitRepo(t *testing.T) {
	owner, name, ok := splitRepo("https://github.com/rivicq/demo-vulnerable-app.git")
	require.True(t, ok)
	require.Equal(t, "rivicq", owner)
	require.Equal(t, "demo-vulnerable-app", name)
	_, _, ok = splitRepo("invalid")
	require.False(t, ok)
}

func TestCompareGHScans_DetectsNewFinding(t *testing.T) {
	baseFiles := loadDemoRepoFiles()
	first := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", baseFiles, true)
	second := AnalyzeRepositoryFiles("rivicq/demo-vulnerable-app", append(baseFiles, RepoFile{
		Path:    "extra.go",
		Content: `package extra; import "crypto/md5"`,
	}), true)
	diff := compareGHScans(
		&ghScanJob{ID: "b", Results: []GHScanResult{second}},
		&ghScanJob{ID: "a", Results: []GHScanResult{first}},
	)
	require.GreaterOrEqual(t, diff.Counts.New, 1)
	require.Equal(t, "b", diff.CurrentScan)
}

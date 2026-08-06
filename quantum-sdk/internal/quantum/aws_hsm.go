package quantum

import "context"

// HSMEntropyResult holds the result of an HSM entropy generation operation.
type HSMEntropyResult struct {
	// ResultHex is the hex-encoded random bytes from the HSM.
	ResultHex string
}

// AWSHSMClient is a minimal client for AWS CloudHSM entropy generation.
// It is used optionally by PQCService; if nil, software-only mode is used.
type AWSHSMClient struct {
	Region    string
	ClusterID string
}

// GenerateHSMEntropy requests random bytes from the HSM cluster.
func (c *AWSHSMClient) GenerateHSMEntropy(_ context.Context, size int) (*HSMEntropyResult, error) {
	// In production this would call the AWS CloudHSM SDK.
	// Returning nil here causes the caller to fall back to crypto/rand.
	return nil, nil
}

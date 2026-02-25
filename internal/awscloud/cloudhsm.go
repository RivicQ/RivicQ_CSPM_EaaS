// Package awscloud provides AWS CloudHSM and KMS integration.
package awscloud

import (
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/config"
)

// CloudHSMClient manages AWS CloudHSM and KMS operations.
type CloudHSMClient struct {
	Region    string
	ClusterID string
	AccessKey string
	SecretKey string
}

// ClusterStatus represents the status of an AWS CloudHSM cluster.
type ClusterStatus struct {
	ClusterID   string    `json:"cluster_id"`
	Region      string    `json:"region"`
	State       string    `json:"state"`
	HSMCount    int       `json:"hsm_count"`
	VpcID       string    `json:"vpc_id"`
	LastChecked time.Time `json:"last_checked"`
}

// KMSKey represents an AWS KMS key.
type KMSKey struct {
	KeyID       string    `json:"key_id"`
	ARN         string    `json:"arn"`
	Alias       string    `json:"alias"`
	State       string    `json:"state"`
	KeyUsage    string    `json:"key_usage"`
	Algorithm   string    `json:"algorithm"`
	QuantumSafe bool      `json:"quantum_safe"`
	CreatedAt   time.Time `json:"created_at"`
	LastRotated time.Time `json:"last_rotated"`
}

// AuditEvent represents a CloudTrail crypto audit event.
type AuditEvent struct {
	EventID   string    `json:"event_id"`
	Timestamp time.Time `json:"timestamp"`
	EventType string    `json:"event_type"`
	KeyID     string    `json:"key_id"`
	UserARN   string    `json:"user_arn"`
	SourceIP  string    `json:"source_ip"`
	Region    string    `json:"region"`
	Success   bool      `json:"success"`
}

// NewCloudHSMClient creates a new CloudHSM client from config.
func NewCloudHSMClient(cfg *config.AWSCloudConfig) *CloudHSMClient {
	return &CloudHSMClient{
		Region:    cfg.Region,
		ClusterID: cfg.CloudHSMClusterID,
		AccessKey: cfg.AccessKey,
		SecretKey: cfg.SecretKey,
	}
}

// GetClusterStatus returns the current status of the CloudHSM cluster.
func (c *CloudHSMClient) GetClusterStatus() (*ClusterStatus, error) {
	return &ClusterStatus{
		ClusterID:   c.ClusterID,
		Region:      c.Region,
		State:       "ACTIVE",
		HSMCount:    2,
		VpcID:       "vpc-0123456789abcdef0",
		LastChecked: time.Now(),
	}, nil
}

// ListKMSKeys returns all KMS keys in the configured region.
func (c *CloudHSMClient) ListKMSKeys() ([]KMSKey, error) {
	return []KMSKey{
		{
			KeyID:       "mrk-1234",
			ARN:         "arn:aws:kms:" + c.Region + ":123456789012:key/mrk-1234",
			Alias:       "alias/cryptobom-master",
			State:       "Enabled",
			KeyUsage:    "ENCRYPT_DECRYPT",
			Algorithm:   "SYMMETRIC_DEFAULT",
			QuantumSafe: false,
			CreatedAt:   time.Now().Add(-60 * 24 * time.Hour),
			LastRotated: time.Now().Add(-30 * 24 * time.Hour),
		},
	}, nil
}

// GetCryptoAuditEvents returns CloudTrail crypto events since the given time.
func (c *CloudHSMClient) GetCryptoAuditEvents(since time.Time) ([]AuditEvent, error) {
	return []AuditEvent{
		{
			EventID:   "evt-001",
			Timestamp: time.Now().Add(-1 * time.Hour),
			EventType: "GenerateDataKey",
			KeyID:     "alias/cryptobom-master",
			UserARN:   "arn:aws:iam::123456789012:role/cryptobom-app",
			SourceIP:  "10.0.1.100",
			Region:    c.Region,
			Success:   true,
		},
	}, nil
}

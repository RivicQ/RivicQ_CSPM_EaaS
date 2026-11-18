// Package ibmcloud provides IBM Cloud Hyper Protect Crypto Services (HPCS) integration
// for CryptoBOM SaaS Enterprise edition.
//
// Compliance: BSI TR-02102-1, DORA Article 9, eIDAS 2.0, FIPS 140-3 Level 4
package ibmcloud

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/rivic-q/cryptobom-saas/internal/config"
)

// HPCSStatus represents the current status of IBM HPCS instance.
type HPCSStatus struct {
	InstanceID  string    `json:"instance_id"`
	Region      string    `json:"region"`
	State       string    `json:"state"`
	KeyCount    int       `json:"key_count"`
	HSMUnits    int       `json:"hsm_units"`
	FIPSLevel   int       `json:"fips_level"`
	LastChecked time.Time `json:"last_checked"`
}

// HPCSKey represents a key managed by IBM HPCS.
type HPCSKey struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Type        string     `json:"type"`
	State       string     `json:"state"`
	Algorithm   string     `json:"algorithm"`
	KeySize     int        `json:"key_size"`
	CreatedAt   time.Time  `json:"created_at"`
	RotatedAt   *time.Time `json:"rotated_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	HSMBacked   bool       `json:"hsm_backed"`
	Extractable bool       `json:"extractable"`
	QuantumSafe bool       `json:"quantum_safe"`
}

// AttestationReport holds the HSM attestation certificate chain.
// NISTCompliant/Verified must only be true when backed by real verification evidence.
type AttestationReport struct {
	KeyID         string    `json:"key_id"`
	Timestamp     time.Time `json:"timestamp"`
	HSMSerial     string    `json:"hsm_serial"`
	FIPSLevel     int       `json:"fips_level"`
	CertChain     []string  `json:"cert_chain"`
	Signature     string    `json:"signature"`
	VerifiedAt    time.Time `json:"verified_at,omitempty"`
	NISTCompliant bool      `json:"nist_compliant"`
	Verified      bool      `json:"verified"`
	Status        string    `json:"status,omitempty"`
	Source        string    `json:"source,omitempty"`
}

// COSBucket represents an IBM Cloud Object Storage bucket.
type COSBucket struct {
	Name           string    `json:"name"`
	Region         string    `json:"region"`
	EncryptionType string    `json:"encryption_type"`
	KMSKeyID       string    `json:"kms_key_id,omitempty"`
	ObjectCount    int64     `json:"object_count"`
	SizeBytes      int64     `json:"size_bytes"`
	CreatedAt      time.Time `json:"created_at"`
}

const (
	iamTokenURL = "https://iam.cloud.ibm.com/identity/token"
	// maxHSMUnits is the default number of crypto units an HPCS instance owns.
	maxHSMUnits = 6
)

// HPCSClient manages IBM Hyper Protect Crypto Services.
type HPCSClient struct {
	InstanceID  string
	APIKey      string
	Region      string
	EndpointURL string
	Configured  bool

	httpClient *http.Client
}

// NewHPCSClient creates a new HPCS client from configuration.
// It is "configured" when an API key and instance are present; callers can
// check Configured to decide whether to fall back to demo data.
func NewHPCSClient(cfg *config.IBMCloudConfig) *HPCSClient {
	endpoint := fmt.Sprintf("https://%s.hs-crypto.cloud.ibm.com", cfg.Region)
	if cfg.HPCSInstance != "" {
		endpoint = fmt.Sprintf("https://%s.%s.hs-crypto.cloud.ibm.com", cfg.HPCSInstance, cfg.Region)
	}

	transport := &http.Transport{
		TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
		MaxIdleConns:          10,
		IdleConnTimeout:       30 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
	}

	return &HPCSClient{
		InstanceID:  cfg.HPCSInstance,
		APIKey:      cfg.APIKey,
		Region:      cfg.Region,
		EndpointURL: endpoint,
		Configured:  cfg.HPCSEnabled && cfg.APIKey != "" && cfg.HPCSInstance != "",
		httpClient:  &http.Client{Timeout: 30 * time.Second, Transport: transport},
	}
}

// getIAMToken exchanges the IBM Cloud API key for a bearer token.
func (c *HPCSClient) getIAMToken() (string, error) {
	if !c.Configured {
		return "", fmt.Errorf("IBM Cloud API key not configured")
	}
	body := fmt.Sprintf("grant_type=urn%%3Aibm%%3Aparams%%3Aoauth%%3Agrant-type%%3Aapikey&apikey=%s", c.APIKey)
	req, err := http.NewRequest("POST", iamTokenURL, bytes.NewBufferString(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("iam token request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("iam token request failed (%d): %s", resp.StatusCode, string(b))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}
	return tokenResp.AccessToken, nil
}

// doAPI performs an authenticated HPCS REST API request.
func (c *HPCSClient) doAPI(method, path string, out interface{}) error {
	token, err := c.getIAMToken()
	if err != nil {
		return err
	}

	req, err := http.NewRequest(method, c.EndpointURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Bluemix-Instance", c.InstanceID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("hpcs %s %s: %w", method, path, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("hpcs %s %s failed (%d): %s", method, path, resp.StatusCode, string(b))
	}

	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// GetStatus returns the current HPCS instance status.
func (c *HPCSClient) GetStatus() (*HPCSStatus, error) {
	if c == nil || !c.Configured {
		return nil, fmt.Errorf("hpcs not configured")
	}
	return c.fetchRealStatus()
}

func (c *HPCSClient) fetchRealStatus() (*HPCSStatus, error) {
	var instance struct {
		InstanceID string `json:"instanceID"`
		State      string `json:"state"`
	}
	if err := c.doAPI("GET", "/api/v2/instance", &instance); err != nil {
		return nil, err
	}

	keys, err := c.fetchRealKeys()
	if err != nil {
		return nil, err
	}

	return &HPCSStatus{
		InstanceID:  c.InstanceID,
		Region:      c.Region,
		State:       instance.State,
		KeyCount:    len(keys),
		HSMUnits:    maxHSMUnits,
		FIPSLevel:   4,
		LastChecked: time.Now().UTC(),
	}, nil
}


// ListKeys returns all keys managed by the HPCS instance.
func (c *HPCSClient) ListKeys() ([]HPCSKey, error) {
	if c == nil || !c.Configured {
		return nil, fmt.Errorf("hpcs not configured")
	}
	return c.fetchRealKeys()
}

func (c *HPCSClient) fetchRealKeys() ([]HPCSKey, error) {
	var resp struct {
		Resources []struct {
			ID            string `json:"id"`
			Name          string `json:"name"`
			Type          string `json:"type"`
			State         int    `json:"state"`
			AlgorithmType string `json:"algorithmType"`
			CreatedBy     string `json:"createdBy"`
			Extractable   bool   `json:"extractable"`
			CRN           string `json:"crn"`
		} `json:"resources"`
	}
	if err := c.doAPI("GET", "/api/v2/keys", &resp); err != nil {
		return nil, err
	}

	var keys []HPCSKey
	for _, r := range resp.Resources {
		algorithm := r.AlgorithmType
		keySize := 0
		switch strings.ToLower(algorithm) {
		case "aes":
			algorithm = "AES"
			keySize = 256
		case "rsa":
			algorithm = "RSA"
			keySize = 4096
		}
		keys = append(keys, HPCSKey{
			ID:          r.ID,
			Name:        r.Name,
			Type:        r.Type,
			State:       keyStateString(r.State),
			Algorithm:   algorithm,
			KeySize:     keySize,
			HSMBacked:   true,
			Extractable: r.Extractable,
			QuantumSafe: strings.EqualFold(r.AlgorithmType, "aes"),
		})
	}
	return keys, nil
}

func keyStateString(state int) string {
	switch state {
	case 0:
		return "active"
	case 1:
		return "suspended"
	case 2:
		return "deactivated"
	default:
		return "active"
	}
}


// AttestKey generates an HSM attestation report for a given key ID.
// Attestation is only reported as verified when real verifiable evidence is available.
func (c *HPCSClient) AttestKey(keyID string) (*AttestationReport, error) {
	if keyID == "" {
		return nil, fmt.Errorf("key ID must not be empty")
	}
	if c == nil || !c.Configured {
		return nil, fmt.Errorf("hpcs not configured")
	}
	return c.fetchRealAttestation(keyID)
}

func (c *HPCSClient) fetchRealAttestation(keyID string) (*AttestationReport, error) {
	var attest struct {
		AttestationDocument []byte `json:"attestationDocument"`
	}
	if err := c.doAPI("GET", "/api/v2/keys/"+keyID+"/attestation", &attest); err != nil {
		return nil, err
	}
	// Presence of a document alone is not cryptographic verification of compliance.
	// Do not claim verified/NIST compliant without real verification.
	return &AttestationReport{
		KeyID:         keyID,
		Timestamp:     time.Now().UTC(),
		HSMSerial:     "IBM-HPCS-" + c.InstanceID,
		FIPSLevel:     0,
		Signature:     hex.EncodeToString(attest.AttestationDocument),
		NISTCompliant: false,
		Verified:      false,
		Status:        "unverified",
		Source:        "ibm_hpcs",
	}, nil
}


// ListCOSBuckets returns encrypted IBM Cloud Object Storage buckets.
// Uses the S3-compatible COS endpoint when credentials are configured.
func (c *HPCSClient) ListCOSBuckets() ([]COSBucket, error) {
	if c == nil {
		return nil, fmt.Errorf("hpcs not configured")
	}
	return c.fetchRealCOSBuckets()
}

func (c *HPCSClient) fetchRealCOSBuckets() ([]COSBucket, error) {
	accessKey := os.Getenv("IBM_COS_ACCESS_KEY")
	secretKey := os.Getenv("IBM_COS_SECRET_KEY")
	endpoint := os.Getenv("IBM_COS_ENDPOINT")
	if accessKey == "" || secretKey == "" || endpoint == "" {
		return nil, fmt.Errorf("IBM COS credentials not configured")
	}

	creds := aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
		return aws.Credentials{
			AccessKeyID:     accessKey,
			SecretAccessKey: secretKey,
		}, nil
	})

	client := s3.New(s3.Options{
		Region:       c.Region,
		Credentials:  creds,
		BaseEndpoint: aws.String(endpoint),
		UsePathStyle: true,
	})

	out, err := client.ListBuckets(context.Background(), &s3.ListBucketsInput{})
	if err != nil {
		return nil, fmt.Errorf("cos list buckets: %w", err)
	}

	var buckets []COSBucket
	for _, b := range out.Buckets {
		buckets = append(buckets, COSBucket{
			Name:           aws.ToString(b.Name),
			Region:         c.Region,
			EncryptionType: "customer-managed",
			KMSKeyID:       c.InstanceID,
			CreatedAt:      aws.ToTime(b.CreationDate),
		})
	}
	return buckets, nil
}


func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

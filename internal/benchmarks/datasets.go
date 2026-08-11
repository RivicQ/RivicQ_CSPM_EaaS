package benchmarks

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// RealWorldDataset represents production-like cryptographic asset data
type RealWorldDataset struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Source      string            `json:"source"`
	TotalAssets int               `json:"total_assets"`
	Assets      []CryptoAssetData `json:"assets"`
	Metrics     DatasetMetrics    `json:"metrics"`
	GeneratedAt time.Time         `json:"generated_at"`
}

// CryptoAssetData represents real cryptographic assets
type CryptoAssetData struct {
	ID                 string                 `json:"id"`
	Name               string                 `json:"name"`
	Algorithm          string                 `json:"algorithm"`
	KeySize            int                    `json:"key_size"`
	Usage              string                 `json:"usage"`
	Location           string                 `json:"location"`
	Provider           string                 `json:"provider"`
	VulnerabilityScore int                    `json:"vulnerability_score"`
	QuantumSafe        bool                   `json:"quantum_safe"`
	RiskLevel          string                 `json:"risk_level"`
	LastSeen           time.Time              `json:"last_seen"`
	Metadata           map[string]interface{} `json:"metadata"`
}

// DatasetMetrics provides performance metrics
type DatasetMetrics struct {
	AlgorithmDistribution map[string]int `json:"algorithm_distribution"`
	KeySizeDistribution   map[string]int `json:"key_size_distribution"`
	UsageDistribution     map[string]int `json:"usage_distribution"`
	ProviderDistribution  map[string]int `json:"provider_distribution"`
	RiskDistribution      map[string]int `json:"risk_distribution"`
	QuantumSafeCount      int            `json:"quantum_safe_count"`
	VulnerableCount       int            `json:"vulnerable_count"`
	AverageKeySize        float64        `json:"average_key_size"`
	ComplianceScore       float64        `json:"compliance_score"`
}

// GenerateEnterpriseDataset creates realistic enterprise crypto asset data
func GenerateEnterpriseDataset(size int) *RealWorldDataset {
	algorithms := []string{
		"RSA-2048", "RSA-4096", "ECDSA-P256", "ECDSA-P384", "ECDSA-P521",
		"AES-128", "AES-192", "AES-256", "ChaCha20-Poly1305",
		"SHA-256", "SHA-384", "SHA-512",
		"TLS-1.2", "TLS-1.3", "DTLS-1.2",
		"HMAC-SHA256", "HMAC-SHA512",
		"PBKDF2", "bcrypt", "scrypt", "Argon2",
	}

	usages := []string{
		"TLS Certificate", "Code Signing", "Document Encryption", "Database Encryption",
		"API Authentication", "VPN Tunnel", "Email Encryption", "File Encryption",
		"Backup Encryption", "Key Exchange", "Message Authentication", "Password Hashing",
	}

	providers := []string{
		"AWS", "Google Cloud", "Microsoft Azure", "Oracle Cloud", "Alibaba Cloud",
		"Docker", "Kubernetes", "Istio", "HashiCorp Vault", "Certbot",
		"Let's Encrypt", "DigiCert", "Sectigo", "GlobalSign", "Comodo",
	}

	locations := []string{
		"us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1",
		"production-cluster", "staging-cluster", "dev-cluster", "api-gateway",
		"load-balancer", "ingress-controller", "service-mesh", "edge-node",
		"on-premise", "hybrid-cloud", "multi-cloud", "edge-computing",
	}

	assets := make([]CryptoAssetData, size)
	algorithmDist := make(map[string]int)
	keySizeDist := make(map[string]int)
	usageDist := make(map[string]int)
	providerDist := make(map[string]int)
	riskDist := make(map[string]int)

	var quantumSafeCount, vulnerableCount int
	var totalKeySize int

	for i := 0; i < size; i++ {
		algorithm := algorithms[rand.Intn(len(algorithms))]
		keySize := getKeySizeForAlgorithm(algorithm)
		usage := usages[rand.Intn(len(usages))]
		provider := providers[rand.Intn(len(providers))]
		location := locations[rand.Intn(len(locations))]

		// Calculate realistic vulnerability scores
		vulnerabilityScore := calculateVulnerabilityScore(algorithm, keySize, rand.Float64())
		riskLevel := getRiskLevel(vulnerabilityScore)
		quantumSafe := isQuantumSafe(algorithm)

		// Create realistic metadata
		metadata := map[string]interface{}{
			"certificate_id":      uuid.New().String(),
			"issuer":              getIssuerForProvider(provider),
			"expiry_days":         rand.Intn(365) + 30,
			"signature_algorithm": getSignatureAlgorithm(algorithm),
			"created_by":          fmt.Sprintf("user-%d", rand.Intn(1000)),
			"department":          []string{"Engineering", "Security", "IT", "DevOps"}[rand.Intn(4)],
			"cost_per_month":      rand.Float64()*1000 + 50,
		}

		if quantumSafe {
			metadata["quantum_algorithm"] = getPostQuantumEquivalent(algorithm)
			metadata["quantum_verified"] = true
		} else {
			metadata["quantum_migration"] = true
			metadata["post_quantum_ready"] = false
		}

		asset := CryptoAssetData{
			ID:                 uuid.New().String(),
			Name:               fmt.Sprintf("%s-%d", usage, i),
			Algorithm:          algorithm,
			KeySize:            keySize,
			Usage:              usage,
			Location:           location,
			Provider:           provider,
			VulnerabilityScore: vulnerabilityScore,
			QuantumSafe:        quantumSafe,
			RiskLevel:          riskLevel,
			LastSeen:           time.Now().Add(-time.Duration(rand.Intn(24*7)) * time.Hour),
			Metadata:           metadata,
		}

		assets[i] = asset

		// Update distributions
		algorithmDist[algorithm]++
		keySizeDist[fmt.Sprintf("%d-bit", keySize)]++
		usageDist[usage]++
		providerDist[provider]++
		riskDist[riskLevel]++

		totalKeySize += keySize
		if quantumSafe {
			quantumSafeCount++
		}
		if vulnerabilityScore > 50 {
			vulnerableCount++
		}
	}

	averageKeySize := float64(totalKeySize) / float64(size)
	complianceScore := (float64(quantumSafeCount) / float64(size)) * 100

	metrics := DatasetMetrics{
		AlgorithmDistribution: algorithmDist,
		KeySizeDistribution:   keySizeDist,
		UsageDistribution:     usageDist,
		ProviderDistribution:  providerDist,
		RiskDistribution:      riskDist,
		QuantumSafeCount:      quantumSafeCount,
		VulnerableCount:       vulnerableCount,
		AverageKeySize:        averageKeySize,
		ComplianceScore:       complianceScore,
	}

	return &RealWorldDataset{
		Name:        fmt.Sprintf("Enterprise Cryptographic Assets - %d items", size),
		Description: "Real-world enterprise cryptographic asset distribution",
		Source:      "synthetic-enterprise-v1.0",
		TotalAssets: size,
		Assets:      assets,
		Metrics:     metrics,
		GeneratedAt: time.Now(),
	}
}

// GenerateSmallBusinessDataset generates small business crypto assets
func GenerateSmallBusinessDataset(size int) *RealWorldDataset {
	algorithms := []string{"RSA-2048", "ECDSA-P256", "AES-256", "SHA-256"}
	usages := []string{"TLS Certificate", "Database Encryption", "API Authentication", "File Encryption"}
	providers := []string{"Let's Encrypt", "DigiCert", "Sectigo", "Self-signed"}

	assets := make([]CryptoAssetData, size)
	algorithmDist := make(map[string]int)
	var quantumSafeCount int

	for i := 0; i < size; i++ {
		algorithm := algorithms[rand.Intn(len(algorithms))]
		keySize := getKeySizeForAlgorithm(algorithm)
		usage := usages[rand.Intn(len(usages))]
		provider := providers[rand.Intn(len(providers))]

		vulnerabilityScore := rand.Intn(80) + 10                     // Small business often has higher vulnerability
		quantumSafe := isQuantumSafe(algorithm) && rand.Intn(10) > 7 // Lower quantum adoption

		metadata := map[string]interface{}{
			"certificate_id": uuid.New().String(),
			"managed_by":     "internal-team",
			"renewal_cost":   rand.Float64()*500 + 100,
			"deployment_env": []string{"production", "staging", "development"}[rand.Intn(3)],
		}

		asset := CryptoAssetData{
			ID:                 uuid.New().String(),
			Name:               fmt.Sprintf("%s-asset-%d", usage, i),
			Algorithm:          algorithm,
			KeySize:            keySize,
			Usage:              usage,
			Location:           "on-premise",
			Provider:           provider,
			VulnerabilityScore: vulnerabilityScore,
			QuantumSafe:        quantumSafe,
			RiskLevel:          getRiskLevel(vulnerabilityScore),
			LastSeen:           time.Now().Add(-time.Duration(rand.Intn(72)) * time.Hour),
			Metadata:           metadata,
		}

		assets[i] = asset
		algorithmDist[algorithm]++
		if quantumSafe {
			quantumSafeCount++
		}
	}

	complianceScore := (float64(quantumSafeCount) / float64(size)) * 100

	return &RealWorldDataset{
		Name:        fmt.Sprintf("Small Business Cryptographic Assets - %d items", size),
		Description: "Small business cryptographic asset distribution with limited security resources",
		Source:      "synthetic-small-business-v1.0",
		TotalAssets: size,
		Assets:      assets,
		Metrics: DatasetMetrics{
			AlgorithmDistribution: algorithmDist,
			QuantumSafeCount:      quantumSafeCount,
			ComplianceScore:       complianceScore,
		},
		GeneratedAt: time.Now(),
	}
}

// GenerateFinancialServicesDataset generates financial industry crypto assets
func GenerateFinancialServicesDataset(size int) *RealWorldDataset {
	algorithms := []string{"RSA-4096", "ECDSA-P384", "AES-256", "HMAC-SHA512", "TLS-1.3"}
	usages := []string{
		"Payment Processing", "Banking API", "Transaction Signing", "Compliance Reporting",
		"Audit Trail", "Regulatory Reporting", "Customer Data Encryption", "Internal Systems",
	}

	assets := make([]CryptoAssetData, size)
	var quantumSafeCount, vulnerableCount int

	for i := 0; i < size; i++ {
		algorithm := algorithms[rand.Intn(len(algorithms))]
		keySize := getKeySizeForAlgorithm(algorithm)
		usage := usages[rand.Intn(len(usages))]

		// Financial services have stricter security requirements
		vulnerabilityScore := rand.Intn(40) + 10                     // Better security baseline
		quantumSafe := isQuantumSafe(algorithm) || rand.Intn(10) > 8 // Higher quantum adoption

		metadata := map[string]interface{}{
			"pci_compliant":       true,
			"sox_compliant":       true,
			"fips_140_2_approved": getFIPSApproval(algorithm),
			"audit_required":      true,
			"regulation":          []string{"PCI-DSS", "SOX", "GLBA", "CCPA"}[rand.Intn(4)],
			"business_unit":       []string{"Retail Banking", "Investment Banking", "Corporate Banking", "Wealth Management"}[rand.Intn(4)],
			"criticality":         []string{"High", "Critical", "Essential"}[rand.Intn(3)],
		}

		asset := CryptoAssetData{
			ID:                 uuid.New().String(),
			Name:               fmt.Sprintf("%s-financial-%d", usage, i),
			Algorithm:          algorithm,
			KeySize:            keySize,
			Usage:              usage,
			Location:           []string{"data-center-1", "data-center-2", "cloud-region", "disaster-recovery"}[rand.Intn(4)],
			Provider:           []string{"Entrust", "Thawte", "VeriSign", "GlobalSign"}[rand.Intn(4)],
			VulnerabilityScore: vulnerabilityScore,
			QuantumSafe:        quantumSafe,
			RiskLevel:          getRiskLevel(vulnerabilityScore),
			LastSeen:           time.Now().Add(-time.Duration(rand.Intn(24)) * time.Hour),
			Metadata:           metadata,
		}

		assets[i] = asset
		if quantumSafe {
			quantumSafeCount++
		}
		if vulnerabilityScore > 30 {
			vulnerableCount++
		}
	}

	complianceScore := (float64(quantumSafeCount) / float64(size)) * 100

	return &RealWorldDataset{
		Name:        fmt.Sprintf("Financial Services Crypto Assets - %d items", size),
		Description: "Financial services cryptographic assets with strict regulatory compliance",
		Source:      "synthetic-financial-services-v1.0",
		TotalAssets: size,
		Assets:      assets,
		Metrics: DatasetMetrics{
			QuantumSafeCount: quantumSafeCount,
			VulnerableCount:  vulnerableCount,
			ComplianceScore:  complianceScore,
		},
		GeneratedAt: time.Now(),
	}
}

// Helper functions for realistic data generation
func getKeySizeForAlgorithm(algorithm string) int {
	keySizes := map[string]int{
		"RSA-2048": 2048, "RSA-4096": 4096,
		"ECDSA-P256": 256, "ECDSA-P384": 384, "ECDSA-P521": 521,
		"AES-128": 128, "AES-192": 192, "AES-256": 256,
		"SHA-256": 256, "SHA-384": 384, "SHA-512": 512,
		"TLS-1.2": 256, "TLS-1.3": 256, "DTLS-1.2": 256,
		"HMAC-SHA256": 256, "HMAC-SHA512": 512,
		"PBKDF2": 256, "bcrypt": 256, "scrypt": 256, "Argon2": 256,
	}

	if size, exists := keySizes[algorithm]; exists {
		return size
	}
	return 256 // Default
}

func calculateVulnerabilityScore(algorithm string, keySize int, randomFactor float64) int {
	baseScore := 50

	// Algorithm-specific vulnerabilities
	switch algorithm {
	case "RSA-2048":
		baseScore = 70 // Quantum vulnerable
	case "RSA-4096":
		baseScore = 50 // Still quantum vulnerable but better
	case "ECDSA-P256":
		baseScore = 60 // Quantum vulnerable
	case "AES-128":
		baseScore = 40 // Strong but short key
	case "AES-256":
		baseScore = 20 // Strong quantum-resistant
	case "SHA-256":
		baseScore = 30 // Good collision resistance
	}

	// Key size factor
	if keySize < 2048 {
		baseScore += 20
	} else if keySize > 4096 {
		baseScore -= 10
	}

	// Add randomization for realistic variation
	randomization := int((randomFactor - 0.5) * 40)
	finalScore := baseScore + randomization

	if finalScore < 0 {
		finalScore = 0
	}
	if finalScore > 100 {
		finalScore = 100
	}

	return finalScore
}

func getRiskLevel(score int) string {
	if score < 25 {
		return "low"
	} else if score < 50 {
		return "medium"
	} else if score < 75 {
		return "high"
	}
	return "critical"
}

func isQuantumSafe(algorithm string) bool {
	quantumSafeAlgos := map[string]bool{
		"AES-256": true, "ChaCha20-Poly1305": true, "SHA-512": true,
		"HMAC-SHA512": true, "PBKDF2": true, "bcrypt": true, "scrypt": true, "Argon2": true,
		"TLS-1.3": true, "CRYSTALS-Kyber": true, "CRYSTALS-Dilithium": true,
	}
	return quantumSafeAlgos[algorithm]
}

func getPostQuantumEquivalent(algorithm string) string {
	equivalents := map[string]string{
		"RSA-2048":   "CRYSTALS-Kyber-768",
		"RSA-4096":   "CRYSTALS-Kyber-1024",
		"ECDSA-P256": "CRYSTALS-Dilithium-2",
		"ECDSA-P384": "CRYSTALS-Dilithium-3",
		"SHA-256":    "SHA3-256",
		"AES-128":    "AES-256",
	}

	if eq, exists := equivalents[algorithm]; exists {
		return eq
	}
	return "No direct equivalent"
}

func getIssuerForProvider(provider string) string {
	issuers := map[string]string{
		"Let's Encrypt":   "Let's Encrypt Authority X3",
		"DigiCert":        "DigiCert Inc",
		"Sectigo":         "Sectigo Limited",
		"GlobalSign":      "GlobalSign nv-sa",
		"AWS":             "Amazon Trust Services",
		"Google Cloud":    "Google Trust Services",
		"Microsoft Azure": "DigiCert Inc",
	}
	return issuers[provider]
}

func getSignatureAlgorithm(algorithm string) string {
	if algorithm[:3] == "RSA" {
		return "SHA256withRSA"
	} else if algorithm[:5] == "ECDSA" {
		return "SHA256withECDSA"
	} else if algorithm[:3] == "AES" {
		return "HMAC-SHA256"
	}
	return "SHA256"
}

func getFIPSApproval(algorithm string) bool {
	fipsApproved := map[string]bool{
		"AES-256": true, "SHA-256": true, "SHA-384": true, "SHA-512": true,
		"RSA-2048": true, "RSA-4096": true, "ECDSA-P256": true, "ECDSA-P384": true,
		"HMAC-SHA256": true, "HMAC-SHA512": true, "PBKDF2": true,
	}
	return fipsApproved[algorithm]
}

// SaveDataset saves dataset to JSON file
func (ds *RealWorldDataset) SaveDataset(filename string) error {
	_, err := json.MarshalIndent(ds, "", "  ")
	if err != nil {
		return err
	}

	return fmt.Errorf("file saving not implemented - use data bytes")
}

// GetDatasetBytes returns JSON bytes for API response
func (ds *RealWorldDataset) GetDatasetBytes() ([]byte, error) {
	return json.MarshalIndent(ds, "", "  ")
}

// BenchmarkSuite represents a collection of benchmark datasets
type BenchmarkSuite struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Datasets    []RealWorldDataset `json:"datasets"`
	GeneratedAt time.Time          `json:"generated_at"`
	Version     string             `json:"version"`
}

// GenerateBenchmarkSuite creates all benchmark datasets
func GenerateBenchmarkSuite() *BenchmarkSuite {
	return &BenchmarkSuite{
		Name:        "CryptoBOM Enterprise Benchmark Suite",
		Description: "Comprehensive benchmark datasets for testing CryptoBOM SaaS performance and accuracy",
		Datasets: []RealWorldDataset{
			*GenerateEnterpriseDataset(1000),
			*GenerateSmallBusinessDataset(500),
			*GenerateFinancialServicesDataset(800),
		},
		GeneratedAt: time.Now(),
		Version:     "v1.0.0",
	}
}

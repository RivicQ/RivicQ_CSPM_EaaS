package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const (
	baseURL = "http://localhost:9090"
)

type HealthResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Edition   string `json:"edition"`
	Timestamp string `json:"timestamp"`
}

type Asset struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	Algorithm            string   `json:"algorithm"`
	KeySize              int      `json:"keySize"`
	Usage                string   `json:"usage"`
	QuantumVulnerable    bool     `json:"quantumVulnerable"`
	ComplianceFrameworks []string `json:"complianceFrameworks"`
}

type DiscoveryRequest struct {
	Sources   []string `json:"sources"`
	Providers []string `json:"providers"`
}

type AnalysisRequest struct {
	AssetID              string   `json:"assetId"`
	Providers            []string `json:"providers"`
	ComplianceFrameworks []string `json:"complianceFrameworks"`
}

func main() {
	fmt.Println("🔐 CryptoBOM SaaS Go Examples")
	fmt.Println("==============================")

	checkHealth()
	createAndAnalyzeAsset()
	runComplianceScan()
	runDevSecOpsAssessment()
}

func checkHealth() {
	fmt.Println("\n📡 Checking health endpoint...")

	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	var health HealthResponse
	json.NewDecoder(resp.Body).Decode(&health)

	fmt.Printf("✅ Status: %s | Version: %s | Edition: %s\n",
		health.Status, health.Version, health.Edition)
}

func createAndAnalyzeAsset() {
	fmt.Println("\n📦 Creating and analyzing asset...")

	asset := Asset{
		Name:                 "financial-service-rsa",
		Algorithm:            "RSA-4096",
		KeySize:              4096,
		Usage:                "financial_transactions",
		ComplianceFrameworks: []string{"SOX", "PCI-DSS"},
	}

	jsonData, _ := json.Marshal(asset)
	resp, err := http.Post(baseURL+"/api/v1/assets", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("✅ Asset created: %s\n", asset.Name)

	analysisReq := AnalysisRequest{
		AssetID:              asset.ID,
		Providers:            []string{"mock"},
		ComplianceFrameworks: []string{"NIST", "ISO"},
	}

	analysisData, _ := json.Marshal(analysisReq)
	analysisResp, err := http.Post(baseURL+"/api/v1/engine/analyze", "application/json", bytes.NewBuffer(analysisData))
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}
	defer analysisResp.Body.Close()

	fmt.Println("✅ Analysis completed")
}

func runComplianceScan() {
	fmt.Println("\n📋 Running compliance scan...")

	scanReq := map[string]interface{}{
		"frameworks": []string{"NIST", "ISO", "BSI"},
		"scope":      "all",
	}

	jsonData, _ := json.Marshal(scanReq)
	resp, err := http.Post(baseURL+"/api/v1/engine/compliance-scan", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("✅ Compliance scan completed")
}

func runDevSecOpsAssessment() {
	fmt.Println("\n🛡️ Running DevSecOps assessment...")

	devsecopsReq := map[string]interface{}{
		"pipeline":             "github-actions",
		"includeQuantum":       true,
		"complianceFrameworks": []string{"NIST", "ISO"},
	}

	jsonData, _ := json.Marshal(devsecopsReq)
	resp, err := http.Post(baseURL+"/api/v1/engine/devsecops-assess", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("✅ DevSecOps assessment completed")
}

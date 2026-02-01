package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the controllers to work.

// CBOMReportSpec defines the desired state of CBOMReport
type CBOMReportSpec struct {
	// Important: Run "make" to regenerate code after modifying this file

	// Name of the CBOM report
	Name string `json:"name"`

	// Version of the CBOM report
	Version string `json:"version"`

	// CycloneDX BOM data (optional)
	BOM map[string]interface{} `json:"bom,omitempty"`

	// Scan configuration
	ScanConfig ScanConfig `json:"scanConfig"`
}

// ScanConfig defines how to scan for cryptographic assets
type ScanConfig struct {
	// Whether to enable eBPF-based scanning
	EBPFEnabled bool `json:"ebpfEnabled"`

	// Whether to enable container scanning
	ContainerScan bool `json:"containerScan"`

	// Whether to enable quantum attestation
	QuantumAttestation bool `json:"quantumAttestation"`

	// Scan interval in minutes
	ScanInterval int `json:"scanInterval"`
}

// CBOMReportStatus defines the observed state of CBOMReport
type CBOMReportStatus struct {
	// Current status of the report
	Status string `json:"status"`

	// Number of cryptographic assets found
	AssetsFound int `json:"assetsFound"`

	// Number of quantum-safe assets
	QuantumSafeAssets int `json:"quantumSafeAssets"`

	// Last scan time
	LastScanTime *metav1.Time `json:"lastScanTime,omitempty"`

	// Attestation status
	AttestationStatus string `json:"attestationStatus,omitempty"`

	// Compliance score
	ComplianceScore float64 `json:"complianceScore"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Status",type="string",JSONPath=".status.status"
//+kubebuilder:printcolumn:name="Assets",type="integer",JSONPath=".status.assetsFound"
//+kubebuilder:printcolumn:name="Quantum Safe",type="integer",JSONPath=".status.quantumSafeAssets"
//+kubebuilder:printcolumn:name="Compliance",type="string",JSONPath=".status.complianceScore"

// CBOMReport is the Schema for the cbomreports API
type CBOMReport struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CBOMReportSpec   `json:"spec,omitempty"`
	Status CBOMReportStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CBOMReportList contains a list of CBOMReport
type CBOMReportList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CBOMReport `json:"items"`
}

func init() {
	SchemeBuilder.Register(&CBOMReport{}, &CBOMReportList{})
}

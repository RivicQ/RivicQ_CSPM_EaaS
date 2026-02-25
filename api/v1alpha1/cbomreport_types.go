package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CbomReportSpec defines the desired state of a CBOM report.
type CbomReportSpec struct {
	Name               string       `json:"name,omitempty"`
	Description        string       `json:"description,omitempty"`
	Tenant             string       `json:"tenant,omitempty"`
	Scopes             []Scope      `json:"scopes,omitempty"`
	Priority           string       `json:"priority,omitempty"`
	NISTPQCStatus      string       `json:"nistPqcStatus,omitempty"`
	IBMQuantumScore    float64      `json:"ibmQuantumScore,omitempty"`
	LastScanTime       *metav1.Time `json:"lastScanTime,omitempty"`
	ComplianceDeadline *metav1.Time `json:"complianceDeadline,omitempty"`
}

// Scope defines a scanning scope for a CBOM report.
type Scope struct {
	Name       string   `json:"name"`
	Clusters   []string `json:"clusters,omitempty"`
	Namespaces []string `json:"namespaces,omitempty"`
}

// CbomReportStatus defines the observed state of a CbomReport.
type CbomReportStatus struct {
	Phase      string             `json:"phase,omitempty"`
	Status     string             `json:"status,omitempty"`
	LastScanTime *metav1.Time     `json:"lastScanTime,omitempty"`
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// CbomReport is the Schema for the cbomreports API.
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
type CbomReport struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec              CbomReportSpec   `json:"spec,omitempty"`
	Status            CbomReportStatus `json:"status,omitempty"`
}

// CBOMReport is an alias for CbomReport used by the controller.
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
type CBOMReport = CbomReport

// CbomReportList contains a list of CbomReport.
// +kubebuilder:object:root=true
type CbomReportList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CbomReport `json:"items"`
}

func init() {
	SchemeBuilder.Register(&CbomReport{}, &CbomReportList{})
}
package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// CbomReportPhase defines the observed phase of a CbomReport.
type CbomReportPhase string

const (
// CbomReportConditionType defines the type for conditions in a CbomReport.
CbomReportConditionType = "Ready"

// CbomReportConditionReason defines the reason for conditions in a CbomReport.
CbomReportConditionReason = "Processing"

// CbomReportPhasePending is the phase when a report has been submitted but not yet processed.
CbomReportPhasePending CbomReportPhase = "Pending"

// CbomReportPhaseRunning is the phase when a report is currently being processed.
CbomReportPhaseRunning CbomReportPhase = "Running"

// CbomReportPhaseCompleted is the phase when a report has been processed successfully.
CbomReportPhaseCompleted CbomReportPhase = "Completed"
)

// Scope defines the scope of a CBOM scan.
type Scope struct {
Name       string   `json:"name"`
Clusters   []string `json:"clusters,omitempty"`
Namespaces []string `json:"namespaces,omitempty"`
}

// CbomReportSpec defines the desired state of a CBOM report.
type CbomReportSpec struct {
Name               string      `json:"name,omitempty"`
Description        string      `json:"description,omitempty"`
Tenant             string      `json:"tenant,omitempty"`
Scopes             []Scope     `json:"scopes,omitempty"`
Priority           string      `json:"priority,omitempty"`
NISTPQCStatus      string      `json:"nistPqcStatus,omitempty"`
IBMQuantumScore    float64     `json:"ibmQuantumScore,omitempty"`
LastScanTime       *metav1.Time `json:"lastScanTime,omitempty"`
ComplianceDeadline *metav1.Time `json:"complianceDeadline,omitempty"`
}

// CbomReportStatus defines the observed state of a CbomReport.
type CbomReportStatus struct {
Phase      CbomReportPhase    `json:"phase,omitempty"`
Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"

// CbomReport is the Schema for the cbomreports API.
type CbomReport struct {
metav1.TypeMeta   `json:",inline"`
metav1.ObjectMeta `json:"metadata,omitempty"`
Spec              CbomReportSpec   `json:"spec,omitempty"`
Status            CbomReportStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// CbomReportList contains a list of CbomReport.
type CbomReportList struct {
metav1.TypeMeta `json:",inline"`
metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CbomReport `json:"items"`
}

// DeepCopyObject implements runtime.Object for CbomReport.
func (in *CbomReport) DeepCopyObject() runtime.Object {
	out := *in
	return &out
}

// DeepCopyObject implements runtime.Object for CbomReportList.
func (in *CbomReportList) DeepCopyObject() runtime.Object {
	out := *in
	return &out
}

func init() {
	SchemeBuilder.Register(&CbomReport{}, &CbomReportList{})
}

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
	if in == nil {
		return nil
	}
	out := new(CbomReport)
	in.DeepCopyInto(out)
	return out
}

// DeepCopyInto copies all properties of CbomReport into another CbomReport.
func (in *CbomReport) DeepCopyInto(out *CbomReport) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	in.Status.DeepCopyInto(&out.Status)
}

// DeepCopyInto copies CbomReportSpec into another CbomReportSpec.
func (in *CbomReportSpec) DeepCopyInto(out *CbomReportSpec) {
	*out = *in
	if in.Scopes != nil {
		in, out := &in.Scopes, &out.Scopes
		*out = make([]Scope, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	if in.LastScanTime != nil {
		x := *in.LastScanTime
		out.LastScanTime = &x
	}
	if in.ComplianceDeadline != nil {
		x := *in.ComplianceDeadline
		out.ComplianceDeadline = &x
	}
}

// DeepCopyInto copies Scope into another Scope.
func (in *Scope) DeepCopyInto(out *Scope) {
	*out = *in
	if in.Clusters != nil {
		out.Clusters = make([]string, len(in.Clusters))
		copy(out.Clusters, in.Clusters)
	}
	if in.Namespaces != nil {
		out.Namespaces = make([]string, len(in.Namespaces))
		copy(out.Namespaces, in.Namespaces)
	}
}

// DeepCopyInto copies CbomReportStatus into another CbomReportStatus.
func (in *CbomReportStatus) DeepCopyInto(out *CbomReportStatus) {
	*out = *in
	if in.Conditions != nil {
		out.Conditions = make([]metav1.Condition, len(in.Conditions))
		copy(out.Conditions, in.Conditions)
	}
}

// DeepCopyObject implements runtime.Object for CbomReportList.
func (in *CbomReportList) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := new(CbomReportList)
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		out.Items = make([]CbomReport, len(in.Items))
		for i := range in.Items {
			in.Items[i].DeepCopyInto(&out.Items[i])
		}
	}
	return out
}

func init() {
	SchemeBuilder.Register(&CbomReport{}, &CbomReportList{})
}

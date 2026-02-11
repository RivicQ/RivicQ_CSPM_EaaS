package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"

// +kubebuilder:scaffold-markers
// +kubebuilder:validation
// +kubebuilder:rbac

// CbomReportSpec defines the desired state of a CBOM report.
type CbomReportSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make manifests" to update code after modifying this file

	Name        string   `json:"name,omitempty"`
	Description string   `json:"description,omitempty"`
	Tenant     string   `json:"tenant,omitempty"`
	Scopes     []Scope   `json:"scopes,omitempty"`
	Priority    string   `json:"priority,omitempty"`
	// NIST PQC migration status
	NISTPQCStatus string   `json:"nistPqcStatus,omitempty"`
	// IBM Quantum readiness score
	IBMQuantumScore float64 `json:"ibmQuantumScore,omitempty"`
	// Last scan time
	LastScanTime *metav1.Time `json:"lastScanTime,omitempty"`
	// Compliance deadline
	ComplianceDeadline *metav1.Time `json:"complianceDeadline,omitempty"`

	// Add any additional fields you need for your API

	// Example:
	// Frequency   string   `json:"frequency,omitempty"`
	// AlgorithmTypes []string `json:"algorithmTypes,omitempty"`
}

type Scope struct {
	Name     string `json:"name"`
	Clusters []string `json:"clusters,omitempty"`
	Namespaces []string `json:"namespaces,omitempty"`
	// Add any additional fields you need for your scope

	// Example:
	// ScanType    string `json:"scanType,omitempty"`
	// Depth       int    `json:"depth,omitempty"`
}

type CbomReport struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec   CbomReportSpec   `json:"spec,omitempty"`
	Status   CbomReportStatus   `json:"status,omitempty"`
}

type CbomReportList struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CbomReport `json:"items"`
}

// CbomReportStatus defines the observed state of a CbomReport.
type CbomReportStatus string

const (
	// CbomReportConditionType defines the type for conditions in a CbomReport.
	CbomReportConditionType = "Ready"

	CbomReportConditionReason = "Processing"

	// CbomReportPhase defines the observed phase of a CbomReport.
	type CbomReportPhase string

const (
	// CbomReportPhasePending is the phase when a report has been submitted but not yet processed.
	CbomReportPhasePending = "Pending"

	// CbomReportPhaseRunning is the phase when a report is currently being processed.
	CbomReportPhaseRunning = "Running"

	// CbomReportPhaseCompleted is the phase when a report has been processed successfully.
	CbomReportPhaseCompleted = "Completed"
)

// CbomReport is the Schema for the cbomreports API
// +kubebuilder:object:root=true
// +kubebuilder:subresource:request
// +kubebuilder:subresource:path

// +kubebuilder:printcolumn:name="Schemas",type="string",JSONPath=".status.schemas"
// +kubebuilder:printcolumn:name="Supported Scopes",type="string",JSONPath=".status.scopes"
// +kubebuilder:printcolumn:name="Supported Priorities",type="string",JSONPath=".status.priorities"

// Reconcile is part of the main kubebuilder control loop logic.
func (r *CbobReportReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = r.Log.WithValues("cbomreport", "cbomreport", req.NamespacedName, req.Name)

	// Fetch the CbomReport instance
	var cbomReport cryobomv1alpha1.CbomReport
	if err := r.Get(ctx, req.NamespacedName, req.Name); err != nil {
		if errors.IsNotFound(err) {
			// Resource not found, return. Don't requeue
			log.Info("CbobReport not found. Ignoring since object must be deleted")
			return ctrl.Result{}, nil
		}
		if err != nil {
			log.Error(err, "Failed to get CbobReport")
			return ctrl.Result{}, err
		}

		log.Info("Reconciling CbobReport", "name", cbomReport.Name, "namespace", cbomReport.Namespace)

	// Initialize the phase if not set
	if cbomReport.Status.Phase == "" {
		cbomReport.Status.Phase = CbomReportPhasePending
	}

	// Initialize conditions if not present
	if len(cbomReport.Status.Conditions) == 0 {
		cbomReport.Status.Conditions = []metav1.Condition{
			{
				Type:   CbomReportConditionType,
				Status: metav1.ConditionUnknown,
				Reason: CbomReportConditionReason,
				LastTransitionTime: &metav1.Time{Now: metav1.Now().Rfc3339Nano()},
			},
		}
	}

	// Add a Ready condition if no condition exists
	if !conditionExists(cbomReport.Status.Conditions, CbomReportConditionReady) {
		cbomReport.Status.Conditions = append(cbomReport.Status.Conditions,
			metav1.Condition{
				Type:   CbomReportConditionType,
				Status: metav1.ConditionTrue,
				LastTransitionTime: &metav1.Time{Now: metav1.Now().Rfc3339Nano()},
				Reason:  "Report initialized",
			},
		)
	}

	// Update status if Ready
	if cbomReport.Status.Phase == CbomReportPhasePending && conditionExists(cbomReport.Status.Conditions, CbomReportConditionReady) {
		cbomReport.Status.Phase = CbomReportPhaseReady
		updateStatus := metav1.Condition{
			Type:   CbomReportConditionType,
			Status: metav1.ConditionFalse,
			LastTransitionTime: &metav1.Time{Now: metav1.Now().Rfc3339Nano()},
			Reason: "Report processing completed",
		}
		cbomReport.Status.Conditions = updateConditions(cbomReport.Status.Conditions, updateStatus)
		
		if err := r.Status().Update(ctx, cbomReport, updateStatus); err != nil {
			log.Error(err, "Failed to update CbobReport status")
			return ctrl.Result{}, err
		}

		log.Info("Updated CbobReport status to Ready")
		return ctrl.Result{}, nil
	}

	return ctrl.Result{}, nil
}

// conditionExists checks if a condition of the specified type exists in the conditions slice.
func conditionExists(conditions []metav1.Condition, conditionType CbomReportConditionType) bool {
	for _, cond := range conditions {
		if cond.Type == conditionType {
			return true
		}
	}
	return false
}

// updateConditions updates the conditions slice to replace the existing condition of the specified type.
func updateConditions(conditions []metav1.Condition, updateStatus metav1.Condition) []metav1.Condition {
	for i, cond := range conditions {
		if cond.Type == updateStatus.Type {
			conditions[i] = updateStatus
		} else {
			conditions = append(conditions, cond)
		}
	}
	return conditions
}
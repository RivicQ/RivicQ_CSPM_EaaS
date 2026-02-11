package operator

import (
	"context"
	"fmt"

	appsv1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	cryptobomv1alpha1 "github.com/rivic-q/cryptobom-saas/api/v1alpha1"
)

// SetupWithManager sets up the controller with the Manager.
func (r *CbomReportReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if err := ctrl.NewControllerManagedBy(mgr).
		For(&cryobomv1alpha1.CbomReport{}).
		Owns(&cryobomv1alpha1.CbomReportList{}).
		Complete(&r); err != nil {
		return fmt.Errorf("unable to create controller", "controller", "CbomReport")
	}

	return nil
}

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	cryptobomv1alpha1 "github.com/rivic-q/cryptobom-saas/api/v1alpha1"
)

// CBOMReportReconciler reconciles a CBOMReport object
type CBOMReportReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=cryptobom.rivic-q.io,resources=cbomreports,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cryptobom.rivic-q.io,resources=cbomreports/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cryptobom.rivic-q.io,resources=cbomreports/finalizers,verbs=update

func (r *CBOMReportReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Fetch the CBOMReport instance
	var cbomReport cryptobomv1alpha1.CBOMReport
	if err := r.Get(ctx, req.NamespacedName, &cbomReport); err != nil {
		logger.Error(err, "unable to fetch CBOMReport")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Create scanner deployment if it doesn't exist
	if err := r.ensureScannerDeployment(ctx, &cbomReport); err != nil {
		logger.Error(err, "failed to ensure scanner deployment")
		return ctrl.Result{}, err
	}

	// Update status
	cbomReport.Status.Status = "scanning"
	cbomReport.Status.LastScanTime = &metav1.Time{Time: metav1.Now()}
	if err := r.Status().Update(ctx, &cbomReport); err != nil {
		logger.Error(err, "failed to update CBOMReport status")
		return ctrl.Result{}, err
	}

	logger.Info("Successfully reconciled CBOMReport")
	return ctrl.Result{RequeueAfter: RequeueInterval}, nil
}

func (r *CBOMReportReconciler) ensureScannerDeployment(ctx context.Context, cbomReport *cryptobomv1alpha1.CBOMReport) error {
	name := fmt.Sprintf("%s-scanner", cbomReport.Name)

	// Check if deployment already exists
	var deployment appsv1.Deployment
	err := r.Get(ctx, client.ObjectKey{Name: name, Namespace: cbomReport.Namespace}, &deployment)
	if err == nil {
		return nil // Deployment exists
	}

	// Create scanner deployment
	deployment = appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: cbomReport.Namespace,
			Labels: map[string]string{
				"app":  "cryptobom-scanner",
				"cbom": cbomReport.Name,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &[]int32{1}[0],
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app":  "cryptobom-scanner",
					"cbom": cbomReport.Name,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app":  "cryptobom-scanner",
						"cbom": cbomReport.Name,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "scanner",
							Image: "rivic-q/cryptobom-scanner:latest",
							Env: []corev1.EnvVar{
								{
									Name: "CBOM_REPORT_NAME",
									ValueFrom: &corev1.EnvVarSource{
										FieldRef: &corev1.ObjectFieldSelector{
											FieldPath: "metadata.labels['cbom']",
										},
									},
								},
								{
									Name: "NAMESPACE",
									ValueFrom: &corev1.EnvVarSource{
										FieldRef: &corev1.ObjectFieldSelector{
											FieldPath: "metadata.namespace",
										},
									},
								},
							},
							SecurityContext: &corev1.SecurityContext{
								Privileged: &[]bool{true}[0], // Required for eBPF
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "host-proc",
									MountPath: "/host/proc",
									ReadOnly:  true,
								},
								{
									Name:      "host-sys",
									MountPath: "/host/sys",
									ReadOnly:  true,
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "host-proc",
							VolumeSource: corev1.VolumeSource{
								HostPath: &corev1.HostPathVolumeSource{
									Path: "/proc",
								},
							},
						},
						{
							Name: "host-sys",
							VolumeSource: corev1.VolumeSource{
								HostPath: &corev1.HostPathVolumeSource{
									Path: "/sys",
								},
							},
						},
					},
				},
			},
		},
	}

	if err := ctrl.SetControllerReference(cbomReport, &deployment, r.Scheme); err != nil {
		return err
	}

	return r.Create(ctx, &deployment)
}

// SetupWithManager sets up the controller with the Manager.
func (r *CBOMReportReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&cryptobomv1alpha1.CBOMReport{}).
		Owns(&appsv1.Deployment{}).
		Complete(r)
}

const RequeueInterval = 30 * 60 // 30 minutes

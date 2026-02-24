package operator

import (
"context"
"fmt"
"time"

appsv1 "k8s.io/api/apps/v1"
corev1 "k8s.io/api/core/v1"
metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
"k8s.io/apimachinery/pkg/runtime"
ctrl "sigs.k8s.io/controller-runtime"
"sigs.k8s.io/controller-runtime/pkg/client"
"sigs.k8s.io/controller-runtime/pkg/log"

cryptobomv1alpha1 "github.com/rivic-q/cryptobom-saas/api/v1alpha1"
)

const RequeueInterval = 30 * time.Minute

// CbomReportReconciler reconciles a CbomReport object.
type CbomReportReconciler struct {
client.Client
Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=cryptobom.rivic-q.io,resources=cbomreports,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cryptobom.rivic-q.io,resources=cbomreports/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cryptobom.rivic-q.io,resources=cbomreports/finalizers,verbs=update

// Reconcile reconciles a CbomReport.
func (r *CbomReportReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
logger := log.FromContext(ctx)

var cbomReport cryptobomv1alpha1.CbomReport
if err := r.Get(ctx, req.NamespacedName, &cbomReport); err != nil {
logger.Error(err, "unable to fetch CbomReport")
return ctrl.Result{}, client.IgnoreNotFound(err)
}

if err := r.ensureScannerDeployment(ctx, &cbomReport); err != nil {
logger.Error(err, "failed to ensure scanner deployment")
return ctrl.Result{}, err
}

cbomReport.Status.Phase = cryptobomv1alpha1.CbomReportPhaseRunning
now := metav1.Now()
cbomReport.Spec.LastScanTime = &now
if err := r.Status().Update(ctx, &cbomReport); err != nil {
logger.Error(err, "failed to update CbomReport status")
return ctrl.Result{}, err
}

logger.Info("Successfully reconciled CbomReport")
return ctrl.Result{RequeueAfter: RequeueInterval}, nil
}

func (r *CbomReportReconciler) ensureScannerDeployment(ctx context.Context, cbomReport *cryptobomv1alpha1.CbomReport) error {
name := fmt.Sprintf("%s-scanner", cbomReport.Name)

var deployment appsv1.Deployment
err := r.Get(ctx, client.ObjectKey{Name: name, Namespace: cbomReport.Namespace}, &deployment)
if err == nil {
return nil
}

replicas := int32(1)
privileged := true
labels := map[string]string{
"app":  "cryptobom-scanner",
"cbom": cbomReport.Name,
}

deployment = appsv1.Deployment{
ObjectMeta: metav1.ObjectMeta{
Name:      name,
Namespace: cbomReport.Namespace,
Labels:    labels,
},
Spec: appsv1.DeploymentSpec{
Replicas: &replicas,
Selector: &metav1.LabelSelector{MatchLabels: labels},
Template: corev1.PodTemplateSpec{
ObjectMeta: metav1.ObjectMeta{Labels: labels},
Spec: corev1.PodSpec{
Containers: []corev1.Container{
{
Name:  "scanner",
Image: "rivic-q/cryptobom-scanner:latest",
SecurityContext: &corev1.SecurityContext{
Privileged: &privileged,
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
func (r *CbomReportReconciler) SetupWithManager(mgr ctrl.Manager) error {
return ctrl.NewControllerManagedBy(mgr).
For(&cryptobomv1alpha1.CbomReport{}).
Owns(&appsv1.Deployment{}).
Complete(r)
}

package discovery

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/hardware"
)

// ScanDeclaredInventory records Kubernetes or hardware targets as inventory.
// It does not attach to kube-apiserver, dump secrets, or reverse-engineer firmware.
func ScanDeclaredInventory(ctx context.Context, target Target) ([]Finding, []CBOMComponent, error) {
	select {
	case <-ctx.Done():
		return nil, nil, ctx.Err()
	default:
	}

	now := time.Now()
	switch strings.ToLower(target.Protocol) {
	case "k8s":
		ns := target.Namespace
		if ns == "" {
			ns = "default"
		}
		wl := target.Workload
		if wl == "" {
			wl = target.Host
		}
		loc := ns + "/" + wl
		f := Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Protocol:    "k8s",
			FindingType: "K8S_WORKLOAD_DECLARED",
			Title:       "Declared Kubernetes workload: " + loc,
			Description: "Community records the pod/namespace as cryptographic inventory. Live kube-apiserver attach, secret extraction, and eBPF traffic inspection are not performed.",
			Evidence:    "kind=pod namespace=" + ns + " workload=" + wl,
			Severity:    SeverityInfo,
			Remediation: "Supply an Ingress/Service hostname as pod://namespace/name@host to run TLS and HTTPS discovery. Enterprise can store a cluster credential for continuous inventory.",
			DORARef:     "DORA RTS Art. 9 — ICT asset inventory",
			EIDASRef:    "",
			QuantumSafe: false,
			ScannedAt:   now,
		}
		c := CBOMComponent{
			Algorithm:   "undeclared",
			Library:     "kubernetes-workload",
			RiskLevel:   SeverityInfo,
			QuantumSafe: false,
			PQCStatus:   "inventory_only",
			Location:    loc,
			BSIRef:      "BSI TR-02102 — inventory before algorithm assessment",
		}
		return []Finding{f}, []CBOMComponent{c}, nil
	case "hardware":
		label := target.Label
		if target.Path != "" {
			label = target.Path
		}
		assets := hardware.Match(parseHardwareLabel(label))
		findings := make([]Finding, 0, len(assets))
		components := make([]CBOMComponent, 0, len(assets))
		for _, a := range assets {
			algo := "declared-module"
			if len(a.Algorithms) > 0 {
				algo = a.Algorithms[0]
			}
			pqc := "migration_required"
			qs := false
			for _, al := range a.Algorithms {
				u := strings.ToUpper(al)
				if strings.Contains(u, "ML-KEM") || strings.Contains(u, "ML-DSA") || strings.Contains(u, "SLH-DSA") {
					pqc = "pqc_ready"
					qs = true
					algo = al
					break
				}
			}
			findings = append(findings, Finding{
				ID:          uuid.New().String(),
				TargetID:    target.ID,
				TargetLabel: target.Label,
				Host:        a.Kind,
				Protocol:    "hardware",
				FindingType: "HARDWARE_MODULE_DECLARED",
				Title:       "Declared " + strings.ToUpper(a.Kind) + ": " + a.Model,
				Description: hardware.Honesty,
				Evidence:    "id=" + a.ID + " shipped=" + boolString(a.Shipped) + " fips=" + a.FIPS,
				Severity:    SeverityInfo,
				Algorithm:   algo,
				Remediation: a.Note,
				DORARef:     "DORA Art. 6 — ICT governance of cryptographic modules",
				QuantumSafe: qs,
				ScannedAt:   now,
			})
			components = append(components, CBOMComponent{
				Algorithm:   algo,
				Library:     a.Vendor,
				Version:     a.Model,
				RiskLevel:   SeverityInfo,
				QuantumSafe: qs,
				PQCStatus:   pqc,
				Location:    "hbom:" + a.Kind,
				BSIRef:      "BSI TR-02102 / FIPS 140-3 inventory",
			})
		}
		return findings, components, nil
	default:
		return nil, nil, nil
	}
}

func boolString(v bool) string {
	if v {
		return "true"
	}
	return "false"
}

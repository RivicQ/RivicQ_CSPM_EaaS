package discovery

import (
	"net"
	"strconv"
	"strings"
)

// TargetClass is the client-architecture kind for a scan (website, host, IP, server, pod, path, hardware).
type TargetClass string

const (
	ClassWebsite  TargetClass = "website"
	ClassHost     TargetClass = "host"
	ClassIP       TargetClass = "ip"
	ClassServer   TargetClass = "server"
	ClassPod      TargetClass = "pod"
	ClassPath     TargetClass = "path"
	ClassHardware TargetClass = "hardware"
)

// ClassifyTarget maps a raw target string and scan_type onto a client architecture class.
func ClassifyTarget(raw, scanType string) TargetClass {
	st := strings.ToLower(strings.TrimSpace(scanType))
	switch st {
	case "website":
		return ClassWebsite
	case "ip":
		return ClassIP
	case "server":
		return ClassServer
	case "pod", "k8s", "kubernetes":
		return ClassPod
	case "hardware", "hsm", "qsic", "tpm":
		return ClassHardware
	case "host":
		return ClassHost
	}

	s := strings.TrimSpace(raw)
	low := strings.ToLower(s)
	switch {
	case strings.HasPrefix(low, "pod://"), strings.HasPrefix(low, "k8s://"):
		return ClassPod
	case strings.HasPrefix(low, "hardware://"), strings.HasPrefix(low, "hsm://"), strings.HasPrefix(low, "qsic://"):
		return ClassHardware
	}

	_, _, path := normalizeTarget(s)
	if path != "" {
		return ClassPath
	}
	if isWebsiteTarget(s, scanType) {
		return ClassWebsite
	}
	host, _, _ := normalizeTarget(s)
	if isIPHost(host) {
		return ClassIP
	}
	return ClassHost
}

func isIPHost(host string) bool {
	return net.ParseIP(strings.Trim(host, "[]")) != nil
}

// PodSpec is a declared Kubernetes workload (not a live apiserver attach).
type PodSpec struct {
	Namespace string
	Workload  string
	Host      string
}

func parsePodTarget(raw string) PodSpec {
	s := strings.TrimSpace(raw)
	low := strings.ToLower(s)
	switch {
	case strings.HasPrefix(low, "pod://"):
		s = s[len("pod://"):]
	case strings.HasPrefix(low, "k8s://"):
		s = s[len("k8s://"):]
	}
	spec := PodSpec{Namespace: "default"}
	if i := strings.LastIndex(s, "@"); i >= 0 {
		spec.Host = strings.TrimSpace(s[i+1:])
		s = strings.TrimSpace(s[:i])
	}
	parts := strings.SplitN(s, "/", 2)
	if len(parts) == 2 && parts[0] != "" && parts[1] != "" {
		spec.Namespace = parts[0]
		spec.Workload = parts[1]
	} else if s != "" {
		spec.Workload = s
	}
	if spec.Host == "" && (looksLikeNetworkHost(spec.Workload) || isIPHost(spec.Workload)) {
		spec.Host = spec.Workload
	}
	return spec
}

func looksLikeNetworkHost(s string) bool {
	if s == "" || strings.Contains(s, "/") {
		return false
	}
	if isIPHost(s) {
		return true
	}
	return strings.Contains(s, ".")
}

func parseHardwareLabel(raw string) string {
	s := strings.TrimSpace(raw)
	for _, p := range []string{"hardware://", "hsm://", "qsic://", "tpm://"} {
		s = strings.TrimPrefix(strings.ToLower(s), p)
		if len(s) != len(strings.TrimSpace(raw)) {
			break
		}
	}
	if s == "" {
		return "declared-crypto-module"
	}
	return s
}

func splitHostPortFlexible(hostPort string) (string, int, error) {
	if strings.HasPrefix(hostPort, "[") || strings.Count(hostPort, ":") > 1 {
		h, p, err := net.SplitHostPort(hostPort)
		if err != nil {
			return "", 0, err
		}
		port, err := strconv.Atoi(p)
		return h, port, err
	}
	return parseTargetHostPort(hostPort)
}

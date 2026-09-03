package discovery

import "testing"

func TestBuildTargetsWebsiteHTTPSSkipsSSH(t *testing.T) {
	got := buildTargets("https://example.com", "cbom")
	protocols := map[string]Target{}
	for _, tg := range got {
		protocols[tg.Protocol] = tg
	}
	if _, ok := protocols["ssh"]; ok {
		t.Fatal("website CBOM scans must not probe SSH unless scan_type=full")
	}
	tlsT, ok := protocols["tls"]
	if !ok || tlsT.Port != 443 {
		t.Fatalf("tls=%+v", tlsT)
	}
	httpT, ok := protocols["http"]
	if !ok {
		t.Fatal("expected HTTP(S) target")
	}
	if httpT.Scheme != "https" || httpT.Port != 443 {
		t.Fatalf("http target %+v", httpT)
	}
	res := ResourcesFromTargets(got)
	if !res["tls"] || !res["https"] || res["ssh"] {
		t.Fatalf("resources %+v", res)
	}
}

func TestBuildTargetsWebsiteFullIncludesSSH(t *testing.T) {
	got := buildTargets("https://www.example.com", "full")
	var ssh, https bool
	for _, tg := range got {
		if tg.Protocol == "ssh" {
			ssh = true
		}
		if tg.Protocol == "http" && tg.Scheme == "https" {
			https = true
		}
	}
	if !ssh || !https {
		t.Fatalf("full website scan should enable SSH+HTTPS, got %+v", got)
	}
}

func TestBuildTargetsWebsiteTypeBareHost(t *testing.T) {
	got := buildTargets("example.com", "website")
	var ssh bool
	var httpT *Target
	for i := range got {
		if got[i].Protocol == "ssh" {
			ssh = true
		}
		if got[i].Protocol == "http" {
			httpT = &got[i]
		}
	}
	if ssh {
		t.Fatal("scan_type=website must skip SSH")
	}
	if httpT == nil || httpT.Scheme != "https" || httpT.Port != 443 {
		t.Fatalf("expected HTTPS:443, got %+v", httpT)
	}
}

func TestBuildTargetsPlainHostKeepsSSHAndHTTP80(t *testing.T) {
	got := buildTargets("api.internal", "cbom")
	var ssh, http80 bool
	for _, tg := range got {
		if tg.Protocol == "ssh" {
			ssh = true
		}
		if tg.Protocol == "http" && tg.Port == 80 && tg.Scheme == "http" {
			http80 = true
		}
	}
	if !ssh || !http80 {
		t.Fatalf("non-website host should keep SSH + HTTP:80, got %+v", got)
	}
}

func TestBuildTargetsHTTPURLUsesPort80(t *testing.T) {
	got := buildTargets("http://example.com", "website")
	for _, tg := range got {
		if tg.Protocol == "http" {
			if tg.Scheme != "http" || tg.Port != 80 {
				t.Fatalf("http url %+v", tg)
			}
			return
		}
	}
	t.Fatal("missing http target")
}

func TestIsWebsiteTarget(t *testing.T) {
	if !isWebsiteTarget("https://a.example", "cbom") {
		t.Fatal("https url")
	}
	if !isWebsiteTarget("www.example.com", "cbom") {
		t.Fatal("www")
	}
	if !isWebsiteTarget("example.com", "website") {
		t.Fatal("scan type website")
	}
	if isWebsiteTarget("example.com", "cbom") {
		t.Fatal("bare host is not a website unless scan_type=website")
	}
}

func TestBuildTargetsIPIncludesTLSAndSSH(t *testing.T) {
	got := buildTargets("192.0.2.10", "ip")
	var tls, ssh, http bool
	for _, tg := range got {
		switch tg.Protocol {
		case "tls":
			tls = true
			if tg.Kind != "ip" {
				t.Fatalf("kind=%s", tg.Kind)
			}
		case "ssh":
			ssh = true
		case "http":
			http = true
		}
	}
	if !tls || !ssh || !http {
		t.Fatalf("IP scan should enable TLS+SSH+HTTP, got %+v", got)
	}
}

func TestBuildTargetsPodDeclaredOnly(t *testing.T) {
	got := buildTargets("pod://prod/api", "pod")
	if len(got) != 1 || got[0].Protocol != "k8s" {
		t.Fatalf("expected declared k8s only, got %+v", got)
	}
	if got[0].Namespace != "prod" || got[0].Workload != "api" {
		t.Fatalf("pod spec %+v", got[0])
	}
	res := ResourcesFromTargets(got)
	if !res["k8s"] || res["ssh"] {
		t.Fatalf("resources %+v", res)
	}
}

func TestBuildTargetsPodWithHostAddsTLS(t *testing.T) {
	got := buildTargets("pod://prod/api@example.com", "pod")
	var k8s, tls, ssh bool
	for _, tg := range got {
		switch tg.Protocol {
		case "k8s":
			k8s = true
		case "tls":
			tls = true
		case "ssh":
			ssh = true
		}
	}
	if !k8s || !tls {
		t.Fatalf("pod@host should inventory + TLS, got %+v", got)
	}
	if ssh {
		t.Fatal("nested website scan must skip SSH")
	}
}

func TestBuildTargetsHardwareCatalog(t *testing.T) {
	got := buildTargets("qsic://research", "hardware")
	if len(got) != 1 || got[0].Protocol != "hardware" {
		t.Fatalf("got %+v", got)
	}
}

func TestClassifyTarget(t *testing.T) {
	if ClassifyTarget("https://a.example", "cbom") != ClassWebsite {
		t.Fatal("https")
	}
	if ClassifyTarget("10.0.0.8", "cbom") != ClassIP {
		t.Fatal("ip")
	}
	if ClassifyTarget("api.internal", "server") != ClassServer {
		t.Fatal("server")
	}
	if ClassifyTarget("pod://ns/name", "cbom") != ClassPod {
		t.Fatal("pod uri")
	}
}

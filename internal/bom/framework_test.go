package bom

import "testing"

func TestCatalogOSSLimitsAIBOM(t *testing.T) {
	fw := Catalog()
	var aibom, ibom, cbom LayerInfo
	for _, l := range fw.Layers {
		switch l.ID {
		case LayerAIBOM:
			aibom = l
		case LayerIBOM:
			ibom = l
		case LayerCBOM:
			cbom = l
		}
	}
	if !cbom.Enabled || !cbom.Community {
		t.Fatal("CBOM must be on in Community")
	}
	if aibom.Enabled || ibom.Enabled {
		t.Fatal("AIBOM/IBOM must be off without Enterprise license")
	}
	var qbom, hbom LayerInfo
	for _, l := range fw.Layers {
		switch l.ID {
		case LayerQBOM:
			qbom = l
		case LayerHBOM:
			hbom = l
		}
	}
	if qbom.Enabled || qbom.Community {
		t.Fatal("QBOM must be Enterprise-only")
	}
	if hbom.Enabled || hbom.Community {
		t.Fatal("HBOM must be Enterprise-only")
	}
	if len(fw.Pipeline) != 8 {
		t.Fatalf("pipeline stages=%d", len(fw.Pipeline))
	}
}

func TestFromDiscoveryQBOM(t *testing.T) {
	u := FromDiscovery("https://example.com", nil)
	if !u.LayersOn["cbom"] || u.LayersOn["aibom"] || u.LayersOn["qbom"] || u.LayersOn["hbom"] || u.LayersOn["ibom"] {
		t.Fatalf("layers %+v", u.LayersOn)
	}
	if len(u.QBOM) != 0 || len(u.HBOM) != 0 || len(u.AIBOM) != 0 || len(u.IBOM) != 0 {
		t.Fatal("Community unified BOM must not emit Q/H/AI/I rows")
	}
}

func TestHSMDisconnectedByDefault(t *testing.T) {
	s := ReadHSM()
	if s.Connected {
		t.Fatal("HSM must be disconnected without credentials")
	}
	if s.QSIC == "" {
		t.Fatal("QSIC honesty required")
	}
}

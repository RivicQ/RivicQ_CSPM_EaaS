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
	if aibom.Enabled {
		t.Fatal("AIBOM must be off without Enterprise license")
	}
	if ibom.Enabled {
		t.Fatal("IBOM must be off without Enterprise license")
	}
	if len(fw.Pipeline) != 8 {
		t.Fatalf("pipeline stages=%d", len(fw.Pipeline))
	}
}

func TestFromDiscoveryQBOM(t *testing.T) {
	u := FromDiscovery("https://example.com", nil)
	if !u.LayersOn["cbom"] || u.LayersOn["aibom"] {
		t.Fatalf("layers %+v", u.LayersOn)
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

package hardware

import "testing"

func TestCatalogHonesty(t *testing.T) {
	cat := Catalog()
	if len(cat) < 3 {
		t.Fatalf("catalog too small: %d", len(cat))
	}
	var qsic *DeclaredAsset
	for i := range cat {
		if cat[i].Kind == "qsic" {
			qsic = &cat[i]
		}
	}
	if qsic == nil {
		t.Fatal("QSIC entry required")
	}
	if qsic.Shipped {
		t.Fatal("QSIC must not be marked shipped")
	}
	if !stringsContains(Honesty, "not a certified module") {
		t.Fatalf("honesty note: %s", Honesty)
	}
}

func TestMatchQSIC(t *testing.T) {
	got := Match("qsic")
	if len(got) == 0 {
		t.Fatal("expected QSIC match")
	}
	if got[0].Kind != "qsic" && !containsKind(got, "qsic") {
		t.Fatalf("got %+v", got)
	}
}

func containsKind(assets []DeclaredAsset, kind string) bool {
	for _, a := range assets {
		if a.Kind == kind {
			return true
		}
	}
	return false
}

func stringsContains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || indexOf(s, sub) >= 0)
}

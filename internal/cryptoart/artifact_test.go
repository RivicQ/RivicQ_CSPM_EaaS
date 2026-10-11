package cryptoart

import "testing"

func TestGraphAddAndGet(t *testing.T) {
	g := NewGraph()
	g.Add(Object{ID: "a", Type: KindFirmware, Name: "fw"})
	g.Add(Object{ID: "a", Type: KindFirmware, Name: "fw-updated"})
	if g.Len() != 1 {
		t.Fatalf("update should not duplicate: len=%d", g.Len())
	}
	o, ok := g.Get("a")
	if !ok || o.Name != "fw-updated" {
		t.Fatalf("get/update failed: %+v", o)
	}
}

func TestGraphAddIgnoresEmptyID(t *testing.T) {
	g := NewGraph()
	g.Add(Object{Name: "no-id"})
	if g.Len() != 0 {
		t.Fatalf("empty ID must be ignored")
	}
}

func TestGraphRelateRequiresEndpoints(t *testing.T) {
	g := NewGraph()
	g.Add(Object{ID: "a"})
	g.Relate("a", "missing", RelUses, "")
	g.Relate("a", "a", RelUses, "")
	if len(g.Relations) != 0 {
		t.Fatalf("dangling/self edges must be dropped: %+v", g.Relations)
	}
	g.Add(Object{ID: "b"})
	g.Relate("a", "b", RelUses, "e")
	g.Relate("a", "b", RelUses, "e")
	if len(g.Relations) != 1 {
		t.Fatalf("duplicate edge must be deduped: %+v", g.Relations)
	}
}

func TestGraphMerge(t *testing.T) {
	g1 := NewGraph()
	g1.Add(Object{ID: "a"})
	g2 := NewGraph()
	g2.Add(Object{ID: "a", Name: "x"})
	g2.Add(Object{ID: "b"})
	g1.Merge(g2)
	if g1.Len() != 2 {
		t.Fatalf("merge len=%d want 2", g1.Len())
	}
}

func TestGraphViewFiltersByKindAndRisk(t *testing.T) {
	g := NewGraph()
	g.Add(Object{ID: "alg", Type: KindAlgorithm, Name: "RSA", Risk: "HIGH"})
	g.Add(Object{ID: "lib", Type: KindCryptoLib, Name: "mbedTLS", Risk: "INFO"})
	g.Add(Object{ID: "cert", Type: KindCertificate, Name: "dev", Risk: "HIGH"})
	v := g.View(Filters{Kinds: []Kind{KindAlgorithm, KindCertificate}, MinRisk: "HIGH"})
	if v.Len() != 2 {
		t.Fatalf("view len=%d want 2", v.Len())
	}
	for _, o := range v.Objects {
		if o.Type == KindCryptoLib {
			t.Fatalf("library should be filtered out")
		}
	}
}

func TestGraphViewViewKeepsOnlyInternalRelations(t *testing.T) {
	g := NewGraph()
	g.Add(Object{ID: "a", Type: KindAlgorithm, Risk: "HIGH"})
	g.Add(Object{ID: "b", Type: KindCryptoLib, Risk: "INFO"})
	g.Relate("b", "a", RelUses, "")
	v := g.View(Filters{Kinds: []Kind{KindAlgorithm}})
	if len(v.Relations) != 0 {
		t.Fatalf("relation with filtered endpoint must be dropped: %+v", v.Relations)
	}
}

func TestGraphSortedObjectsStable(t *testing.T) {
	g := NewGraph()
	g.Add(Object{ID: "z", Type: KindAlgorithm, Name: "z"})
	g.Add(Object{ID: "a", Type: KindAlgorithm, Name: "a"})
	objs := g.SortedObjects()
	if objs[0].Name != "a" || objs[1].Name != "z" {
		t.Fatalf("not sorted: %+v", objs)
	}
}

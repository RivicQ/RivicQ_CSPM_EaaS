package controls

import "testing"

func TestCatalogHasPublishedLists(t *testing.T) {
	cat := Catalog()
	if len(cat) != 4 {
		t.Fatalf("expected 4 checklists, got %d", len(cat))
	}
	ids := map[string]int{}
	for _, c := range cat {
		if c.ID == "" || c.Honesty == "" || c.SourceURL == "" {
			t.Fatalf("incomplete checklist %+v", c)
		}
		ids[c.ID] = len(c.Items)
		for _, item := range c.Items {
			if item.ID == "" || item.Title == "" || item.RivicQ == "" {
				t.Fatalf("incomplete item in %s: %+v", c.ID, item)
			}
		}
	}
	if ids["owasp-api-2023"] != 10 {
		t.Fatalf("API Top 10 should have 10 items, got %d", ids["owasp-api-2023"])
	}
	if ids["owasp-top10-2021"] != 10 {
		t.Fatalf("Top 10 2021 should have 10 items, got %d", ids["owasp-top10-2021"])
	}
	if ids["rivicq-quantum"] < 6 {
		t.Fatalf("quantum checklist too small: %d", ids["rivicq-quantum"])
	}
}

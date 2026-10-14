package main

import (
	"strings"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/intelligence"
)

func TestParsePartnerFailOn(t *testing.T) {
	got, err := parsePartnerFailOn("warn")
	if err != nil || got != "WARN" {
		t.Fatalf("warn: got %q %v", got, err)
	}
	if _, err := parsePartnerFailOn("BOGUS"); err == nil {
		t.Fatal("expected usage error")
	}
	if _, err := parsePartnerFailOn("critical"); err == nil {
		t.Fatal("firmware/identity must reject severity fail-on values")
	}
}

func TestUsageErrorType(t *testing.T) {
	err := usageError{msg: "invalid --fail-on"}
	if !strings.Contains(err.Error(), "fail-on") {
		t.Fatalf("error text: %v", err)
	}
	if _, e := intelligence.ParseFailOn("nope"); e == nil {
		t.Fatal("expected parse error")
	}
}

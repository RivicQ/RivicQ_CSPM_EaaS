package main

import "testing"

func TestParsePolicyFailOnRejectsUnknown(t *testing.T) {
	if _, err := parsePolicyFailOn("BOGUS"); err == nil {
		t.Fatal("expected usage error")
	}
	got, err := parsePolicyFailOn("warn")
	if err != nil || got != "WARN" {
		t.Fatalf("got %q err=%v", got, err)
	}
}

func TestCliExitCodes(t *testing.T) {
	if cliExit(usageError{msg: "bad"}) != 2 {
		t.Fatal("usage must be exit 2")
	}
	if cliExit(failOnError{threshold: "block"}) != 1 {
		t.Fatal("fail-on must be exit 1")
	}
}

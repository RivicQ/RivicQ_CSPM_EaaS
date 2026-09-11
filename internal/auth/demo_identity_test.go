package auth

import "testing"

func TestIsLabeledDemoEmail(t *testing.T) {
	if !IsLabeledDemoEmail("demo-ciso@demo.rivicq.local") {
		t.Fatal("demo tenant")
	}
	if !IsLabeledDemoEmail("demo@rivicq.local") {
		t.Fatal("local demo")
	}
	if IsLabeledDemoEmail("admin@rivicq.local") {
		t.Fatal("bootstrap admin is not the labeled demo")
	}
	if IsLabeledDemoEmail("analyst@customer.com") {
		t.Fatal("customer")
	}
}

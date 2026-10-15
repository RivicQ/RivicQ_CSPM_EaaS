package config

import "testing"

func TestIsProductionEnv(t *testing.T) {
	t.Setenv("CRYPTOBOM_ENV", "")
	t.Setenv("RIVICQ_ENV", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("ENV", "")
	if IsProductionEnv() {
		t.Fatal("empty env is not production")
	}
	t.Setenv("CRYPTOBOM_ENV", "production")
	if !IsProductionEnv() {
		t.Fatal("CRYPTOBOM_ENV=production")
	}
}

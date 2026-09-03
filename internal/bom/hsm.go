package bom

import "os"

// HSMStatus is the honest PKCS#11 / cloud HSM connector view.
type HSMStatus struct {
	Engine      string       `json:"engine"`
	Connected   bool         `json:"connected"`
	Module      string       `json:"module,omitempty"`
	Providers   []Connector  `json:"providers"`
	QSIC        string       `json:"qsic"`
	Note        string       `json:"note"`
}

// QuantumStatus is local QBOM scoring plus optional runtime connector.
type QuantumStatus struct {
	Scoring     string      `json:"scoring"`
	Runtime     Connector   `json:"runtime"`
	Migration   Connector   `json:"migration"`
	Note        string      `json:"note"`
}

func ReadHSM() HSMStatus {
	mod := os.Getenv("PKCS11_MODULE")
	fw := Catalog()
	var providers []Connector
	for _, c := range fw.Connectors {
		if c.ID == "crypto4a" || c.ID == "cloud-hsm" {
			providers = append(providers, c)
		}
	}
	connected := false
	for _, p := range providers {
		if p.Connected {
			connected = true
		}
	}
	return HSMStatus{
		Engine:    "declared_inventory + optional PKCS#11",
		Connected: connected,
		Module:    mod,
		Providers: providers,
		QSIC:      "Research ASIC declaration (ML-KEM/ML-DSA/SLH-DSA). Not a shipped FIPS module.",
		Note:      "HSM integration does not extract keys or reverse-engineer firmware. Connectors stay empty without customer credentials.",
	}
}

func ReadQuantum() QuantumStatus {
	fw := Catalog()
	var runtime, migrate Connector
	for _, c := range fw.Connectors {
		switch c.ID {
		case "quantum-runtime":
			runtime = c
		case "cryptonext":
			migrate = c
		}
	}
	return QuantumStatus{
		Scoring:   "qiskitprofile (local-classical)",
		Runtime:   runtime,
		Migration: migrate,
		Note:      "QBOM scores do not require a quantum runtime. Migration partners confirm algorithm cut-over when a key is configured.",
	}
}

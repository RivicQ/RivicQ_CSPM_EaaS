package firmware

import "sort"

// Diff is the result of comparing two firmware analyses.
type Diff struct {
	From                string   `json:"from"`
	To                  string   `json:"to"`
	LibrariesAdded      []string `json:"libraries_added"`
	LibrariesRemoved    []string `json:"libraries_removed"`
	AlgorithmsAdded     []string `json:"algorithms_added"`
	AlgorithmsRemoved   []string `json:"algorithms_removed"`
	APIsAdded           []string `json:"crypto_apis_added"`
	APIsRemoved         []string `json:"crypto_apis_removed"`
	ProtocolsAdded      []string `json:"protocols_added"`
	ProtocolsRemoved    []string `json:"protocols_removed"`
	CertificatesChanged bool     `json:"certificates_changed"`
	RiskChanged         bool     `json:"risk_changed"`
	RiskFrom            string   `json:"risk_from"`
	RiskTo              string   `json:"risk_to"`
	PQCStatusChanged    bool     `json:"pqc_status_changed"`
	PQCStatusFrom       []string `json:"pqc_status_from"`
	PQCStatusTo         []string `json:"pqc_status_to"`
	Changed             bool     `json:"changed"`
}

// Compare reports what changed between two firmware analyses.
func Compare(from, to *Report) Diff {
	d := Diff{RiskFrom: highestRisk(from), RiskTo: highestRisk(to)}
	d.From = from.FileName
	d.To = to.FileName

	fromLibs := setOf(func(yield func(string)) {
		for _, l := range from.Libraries {
			yield(l.Library)
		}
	})
	toLibs := setOf(func(yield func(string)) {
		for _, l := range to.Libraries {
			yield(l.Library)
		}
	})
	d.LibrariesAdded, d.LibrariesRemoved = diffSets(fromLibs, toLibs)

	fromAlg := setOf(func(yield func(string)) {
		for _, a := range from.Algorithms {
			yield(a.Algorithm)
		}
	})
	toAlg := setOf(func(yield func(string)) {
		for _, a := range to.Algorithms {
			yield(a.Algorithm)
		}
	})
	d.AlgorithmsAdded, d.AlgorithmsRemoved = diffSets(fromAlg, toAlg)

	fromAPI := setOf(func(yield func(string)) {
		for _, a := range from.CryptoAPIs {
			yield(a.API)
		}
	})
	toAPI := setOf(func(yield func(string)) {
		for _, a := range to.CryptoAPIs {
			yield(a.API)
		}
	})
	d.APIsAdded, d.APIsRemoved = diffSets(fromAPI, toAPI)

	fromProto := setOf(func(yield func(string)) {
		for _, p := range from.Protocols {
			yield(p.Protocol)
		}
	})
	toProto := setOf(func(yield func(string)) {
		for _, p := range to.Protocols {
			yield(p.Protocol)
		}
	})
	d.ProtocolsAdded, d.ProtocolsRemoved = diffSets(fromProto, toProto)

	d.CertificatesChanged = certSet(from) != certSet(to)

	d.RiskChanged = d.RiskFrom != d.RiskTo

	d.PQCStatusFrom = pqcSet(from)
	d.PQCStatusTo = pqcSet(to)
	d.PQCStatusChanged = join(d.PQCStatusFrom) != join(d.PQCStatusTo)

	d.Changed = len(d.LibrariesAdded) > 0 || len(d.LibrariesRemoved) > 0 ||
		len(d.AlgorithmsAdded) > 0 || len(d.AlgorithmsRemoved) > 0 ||
		len(d.APIsAdded) > 0 || len(d.APIsRemoved) > 0 ||
		len(d.ProtocolsAdded) > 0 || len(d.ProtocolsRemoved) > 0 ||
		d.CertificatesChanged || d.RiskChanged || d.PQCStatusChanged
	return d
}

func setOf(fill func(yield func(string))) map[string]bool {
	m := map[string]bool{}
	fill(func(s string) { m[s] = true })
	return m
}

func diffSets(from, to map[string]bool) ([]string, []string) {
	var added, removed []string
	for k := range to {
		if !from[k] {
			added = append(added, k)
		}
	}
	for k := range from {
		if !to[k] {
			removed = append(removed, k)
		}
	}
	sort.Strings(added)
	sort.Strings(removed)
	return added, removed
}

func certSet(r *Report) string {
	var s string
	for _, c := range r.Certificates {
		s += c.Metadata.FingerprintSHA256 + ";"
	}
	return s
}

func pqcSet(r *Report) []string {
	var out []string
	for _, a := range r.Algorithms {
		out = append(out, a.Algorithm+"="+a.PQCStatus)
	}
	sort.Strings(out)
	return out
}

func join(s []string) string {
	out := ""
	for _, v := range s {
		out += v + "\n"
	}
	return out
}

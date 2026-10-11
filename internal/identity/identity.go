// Package identity analyzes digital-identity and connectivity artifacts
// (certificates, certificate bundles, SIM/eSIM/iSIM and PKI configuration
// metadata). It extracts certificate and identity *metadata* only.
//
// Hard guarantee: it never reads or emits private keys, credential secrets,
// SIM secrets or secure-element secret material. Subscriber identity markers
// (IMSI/ICCID/...) are recorded as marker names only — values are never kept.
package identity

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/google/uuid"

	"github.com/rivic-q/cryptobom-saas/internal/certeng"
	"github.com/rivic-q/cryptobom-saas/internal/cryptoart"
	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

// Format is a detected identity-artifact container.
type Format string

const (
	FormatCert    Format = "certificate"
	FormatBundle  Format = "certificate_bundle"
	FormatConfig  Format = "identity_config"
	FormatUnknown Format = "unknown"
)

// Limits bounds untrusted identity-artifact processing.
type Limits struct {
	MaxFileBytes int64         `json:"max_file_bytes"`
	Timeout      time.Duration `json:"timeout"`
}

// DefaultLimits returns conservative defaults.
func DefaultLimits() Limits {
	return Limits{MaxFileBytes: 32 << 20, Timeout: 20 * time.Second}
}

// Options controls an identity analysis.
type Options struct {
	TenantID       string
	DeviceLifetime string
}

// CertificateFinding is a parsed certificate plus risk and chain info.
type CertificateFinding struct {
	Metadata certeng.Metadata   `json:"metadata"`
	Risk     certeng.RiskReport `json:"risk"`
	InBundle bool               `json:"in_bundle"`
	ChainPos int                `json:"chain_position,omitempty"`
}

// IdentityRef is a non-secret identity reference.
type IdentityRef struct {
	ID      string   `json:"id"`
	Type    string   `json:"type"` // device | subscriber | euicc | secure_element
	Name    string   `json:"name"`
	Markers []string `json:"markers,omitempty"`
	Source  string   `json:"source"`
	Note    string   `json:"note,omitempty"`
}

// PKIRef groups certificates by issuing authority.
type PKIRef struct {
	Issuer           string `json:"issuer"`
	CertificateCount int    `json:"certificate_count"`
	SelfSigned       bool   `json:"self_signed"`
}

// Report is the full result of identity artifact analysis.
type Report struct {
	ID             string                        `json:"id"`
	TenantID       string                        `json:"tenant_id,omitempty"`
	Path           string                        `json:"path,omitempty"`
	FileName       string                        `json:"file_name"`
	SizeBytes      int64                         `json:"size_bytes"`
	SHA256         string                        `json:"sha256"`
	Format         Format                        `json:"format"`
	ProfileID      string                        `json:"profile_id"`
	Certificates   []CertificateFinding          `json:"certificates"`
	Identities     []IdentityRef                 `json:"identities"`
	PKI            []PKIRef                      `json:"pki"`
	Libraries      []cryptoscan.LibraryFinding   `json:"crypto_libraries"`
	Algorithms     []cryptoscan.AlgorithmFinding `json:"algorithms"`
	CryptoAPIs     []cryptoscan.APIFinding       `json:"crypto_apis"`
	Protocols      []cryptoscan.ProtocolFinding  `json:"protocols"`
	Rules          []cryptoscan.RuleFinding      `json:"rules"`
	CBOM           []cryptoart.BOMItem           `json:"cbom"`
	PQC            cryptoart.PQCPlan             `json:"pqc"`
	Graph          *cryptoart.Graph              `json:"graph,omitempty"`
	DeviceLifetime string                        `json:"expected_device_lifetime,omitempty"`
	Warnings       []string                      `json:"warnings,omitempty"`
	Evidence       []string                      `json:"evidence,omitempty"`
	ScannedAt      time.Time                     `json:"scanned_at"`
	DurationMS     int64                         `json:"duration_ms"`
}

// AnalyzeFile analyzes an identity artifact on disk.
func AnalyzeFile(ctx context.Context, path string, p profile.Profile, limits Limits, opts Options) (*Report, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if info.IsDir() {
		return nil, fmt.Errorf("identity: %s is a directory", path)
	}
	if info.Size() > limits.MaxFileBytes {
		return nil, fmt.Errorf("identity: file %d bytes exceeds limit %d", info.Size(), limits.MaxFileBytes)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	rep, err := AnalyzeBytes(ctx, filepath.Base(path), data, p, limits, opts)
	if err != nil {
		return nil, err
	}
	rep.Path = path
	return rep, nil
}

// AnalyzeBytes analyzes an in-memory identity artifact.
func AnalyzeBytes(ctx context.Context, name string, data []byte, p profile.Profile, limits Limits, opts Options) (*Report, error) {
	if limits.Timeout <= 0 {
		limits = DefaultLimits()
	}
	ctx, cancel := context.WithTimeout(ctx, limits.Timeout)
	defer cancel()

	start := time.Now()
	sum := sha256.Sum256(data)
	rep := &Report{
		ID:             uuid.New().String(),
		TenantID:       opts.TenantID,
		FileName:       name,
		SizeBytes:      int64(len(data)),
		SHA256:         hex.EncodeToString(sum[:]),
		ProfileID:      p.ID,
		DeviceLifetime: opts.DeviceLifetime,
		ScannedAt:      start.UTC(),
		Certificates:   []CertificateFinding{},
		Identities:     []IdentityRef{},
		PKI:            []PKIRef{},
	}

	certs := certeng.ExtractFromBytes(data, name)
	rep.Format = classifyFormat(name, data, len(certs))
	inBundle := len(certs) > 1
	for i, c := range certs {
		rep.Certificates = append(rep.Certificates, CertificateFinding{
			Metadata: *c,
			Risk:     certeng.Assess(c, rep.ScannedAt, rep.DeviceLifetime),
			InBundle: inBundle,
			ChainPos: i,
		})
	}
	rep.PKI = buildPKI(rep.Certificates)

	strs := cryptoscan.ExtractStrings(data, 4, 200000)
	det := cryptoscan.Detect(p, strs)
	rep.Libraries = det.Libraries
	rep.Algorithms = det.Algorithms
	rep.CryptoAPIs = det.CryptoAPIs
	rep.Protocols = det.Protocols
	rep.Rules = det.Rules

	for _, c := range rep.Certificates {
		for _, nm := range cryptoscan.AlgorithmsFromCert(c.Metadata.PublicKeyAlgorithm, c.Metadata.SignatureAlgorithm) {
			rep.Algorithms = append(rep.Algorithms, cryptoscan.Algorithm(nm,
				"certificate "+shortFP(c.Metadata.FingerprintSHA256)+" ("+nm+")"))
		}
	}
	rep.Algorithms = dedupeAlgorithms(rep.Algorithms)

	rep.Identities = buildIdentities(rep, det.Rules)
	rep.CBOM = buildCBOM(rep)
	rep.PQC = cryptoart.BuildPQCPlan(rep.FileName, rep.DeviceLifetime, rep.Algorithms)
	rep.Graph = buildGraph(rep)
	rep.DurationMS = time.Since(start).Milliseconds()
	return rep, nil
}

func classifyFormat(name string, data []byte, certCount int) Format {
	if certCount > 1 {
		return FormatBundle
	}
	if certCount == 1 {
		return FormatCert
	}
	ext := filepath.Ext(name)
	switch ext {
	case ".pem", ".crt", ".cer", ".der", ".p7b", ".p7c":
		return FormatCert
	case ".json", ".yaml", ".yml", ".conf", ".cfg", ".txt":
		return FormatConfig
	}
	return FormatUnknown
}

func buildIdentities(rep *Report, rules []cryptoscan.RuleFinding) []IdentityRef {
	var out []IdentityRef
	for _, r := range rules {
		typ := "device"
		switch r.Kind {
		case "device_identity":
			typ = identityTypeForRule(r.ID)
		case "root_of_trust":
			typ = "secure_element"
		}
		out = append(out, IdentityRef{
			ID:      "identity:" + rep.ID + ":" + r.ID,
			Type:    typ,
			Name:    r.Label,
			Markers: r.Markers,
			Source:  "identity-static",
			Note:    r.Note,
		})
	}
	if len(rep.Certificates) > 0 {
		out = append(out, IdentityRef{
			ID:     "identity:" + rep.ID + ":cert-identity",
			Type:   "device",
			Name:   "certificate-bound device identity",
			Source: "identity-static",
			Note:   "Derived from embedded X.509 certificate subject(s). No credential values read.",
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

func identityTypeForRule(id string) string {
	switch id {
	case "euicc":
		return "euicc"
	case "subscriber_identity":
		return "subscriber"
	default:
		return "device"
	}
}

func buildPKI(certs []CertificateFinding) []PKIRef {
	byIssuer := map[string]*PKIRef{}
	for _, c := range certs {
		ref, ok := byIssuer[c.Metadata.Issuer]
		if !ok {
			ref = &PKIRef{Issuer: c.Metadata.Issuer}
			byIssuer[c.Metadata.Issuer] = ref
		}
		ref.CertificateCount++
		if c.Metadata.SelfSigned {
			ref.SelfSigned = true
		}
	}
	out := make([]PKIRef, 0, len(byIssuer))
	for _, ref := range byIssuer {
		out = append(out, *ref)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Issuer < out[j].Issuer })
	return out
}

func buildCBOM(rep *Report) []cryptoart.BOMItem {
	var out []cryptoart.BOMItem
	for _, a := range rep.Algorithms {
		out = append(out, cryptoart.BOMItem{
			Type: "algorithm", Name: a.Algorithm,
			QuantumSafe: a.QuantumSafe, PQCStatus: a.PQCStatus,
			RiskLevel: cryptoscan.RiskFromPQC(a.PQCStatus), Source: "identity-static",
			Evidence: a.Evidence, Location: rep.FileName,
		})
	}
	for _, l := range rep.Libraries {
		out = append(out, cryptoart.BOMItem{
			Type: "crypto_library", Name: l.Library,
			PQCStatus: "library_present", RiskLevel: "INFO",
			Source: "identity-static", Evidence: "markers: " + join(l.Markers, ", "),
			Location: rep.FileName,
		})
	}
	for _, c := range rep.Certificates {
		out = append(out, cryptoart.BOMItem{
			Type: "certificate", Name: c.Metadata.Subject, KeySize: c.Metadata.KeySize,
			QuantumSafe: c.Risk.QuantumStatus == "quantum_safe",
			PQCStatus:   c.Risk.QuantumStatus, RiskLevel: c.Risk.QuantumRisk,
			Source:   "identity-static",
			Evidence: "sig=" + c.Metadata.SignatureAlgorithm + " pub=" + c.Metadata.PublicKeyAlgorithm,
			Location: rep.FileName,
		})
	}
	for _, p := range rep.Protocols {
		out = append(out, cryptoart.BOMItem{
			Type: "protocol", Name: p.Protocol,
			PQCStatus: "protocol", RiskLevel: "INFO", Source: "identity-static",
			Evidence: "markers: " + join(p.Markers, ", "), Location: rep.FileName,
		})
	}
	cryptoart.SortBOM(out)
	return out
}

func buildGraph(rep *Report) *cryptoart.Graph {
	g := cryptoart.NewGraph()
	now := rep.ScannedAt
	assetID := "identity-asset:" + rep.ID
	g.Add(cryptoart.Object{
		ID: assetID, TenantID: rep.TenantID, Type: cryptoart.KindSIM,
		Name: rep.FileName, Source: "identity-static", Location: rep.FileName,
		Confidence: 0.8, Timestamp: now, Risk: cryptoart.HighestRisk(rep.CBOM),
		Labels: map[string]string{"format": string(rep.Format), "sha256": rep.SHA256},
	})
	for _, id := range rep.Identities {
		g.Add(cryptoart.Object{
			ID: id.ID, TenantID: rep.TenantID, Type: cryptoart.KindIdentity,
			Name: id.Name, Source: "identity-static", Confidence: 0.75,
			Timestamp: now, Evidence: id.Markers,
			Labels: map[string]string{"identity_type": id.Type},
		})
		g.Relate(assetID, id.ID, cryptoart.RelContains, "identity asset contains identity")
	}
	for i, c := range rep.Certificates {
		cID := "cert:" + rep.ID + ":" + itoa(i)
		g.Add(cryptoart.Object{
			ID: cID, TenantID: rep.TenantID, Type: cryptoart.KindCertificate,
			Name: c.Metadata.Subject, Source: "identity-static", Confidence: 0.9,
			Timestamp: now, QuantumRisk: c.Risk.QuantumRisk,
			PQCStatus: c.Risk.QuantumStatus, Risk: c.Risk.ClassicalRisk,
			Evidence: []string{c.Metadata.FingerprintSHA256},
			Labels: map[string]string{
				"issuer": c.Metadata.Issuer, "sig": c.Metadata.SignatureAlgorithm,
				"pub": c.Metadata.PublicKeyAlgorithm,
			},
		})
		pkiID := "pki:" + c.Metadata.Issuer
		g.Add(cryptoart.Object{
			ID: pkiID, TenantID: rep.TenantID, Type: cryptoart.KindPKI,
			Name: c.Metadata.Issuer, Source: "identity-static", Confidence: 0.7, Timestamp: now,
		})
		g.Relate(cID, pkiID, cryptoart.RelIssuedBy, "certificate issued by PKI")
		if len(rep.Identities) > 0 {
			g.Relate(cID, rep.Identities[0].ID, cryptoart.RelBelongsTo, "certificate belongs to identity")
		}
	}
	for _, l := range rep.Libraries {
		libID := "lib:" + rep.ID + ":" + l.Library
		g.Add(cryptoart.Object{
			ID: libID, TenantID: rep.TenantID, Type: cryptoart.KindCryptoLib,
			Name: l.Library, Source: "identity-static", Confidence: l.Confidence,
			Timestamp: now, Evidence: l.Markers,
		})
		g.Relate(assetID, libID, cryptoart.RelUses, "identity asset uses crypto library")
	}
	return g
}

func itoa(i int) string { return fmt.Sprintf("%d", i) }

func join(s []string, sep string) string {
	out := ""
	for i, v := range s {
		if i > 0 {
			out += sep
		}
		out += v
	}
	return out
}

func shortFP(fp string) string {
	if len(fp) > 16 {
		return fp[:16]
	}
	return fp
}

func dedupeAlgorithms(in []cryptoscan.AlgorithmFinding) []cryptoscan.AlgorithmFinding {
	seen := map[string]cryptoscan.AlgorithmFinding{}
	order := []string{}
	for _, a := range in {
		if prev, ok := seen[a.Algorithm]; ok {
			prev.Referenced = prev.Referenced || a.Referenced
			if a.Confidence > prev.Confidence {
				prev.Confidence = a.Confidence
			}
			seen[a.Algorithm] = prev
			continue
		}
		seen[a.Algorithm] = a
		order = append(order, a.Algorithm)
	}
	sort.Strings(order)
	out := make([]cryptoscan.AlgorithmFinding, 0, len(order))
	for _, k := range order {
		out = append(out, seen[k])
	}
	return out
}

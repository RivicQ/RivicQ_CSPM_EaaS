package firmware

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"debug/elf"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/rivic-q/cryptobom-saas/internal/certeng"
	"github.com/rivic-q/cryptobom-saas/internal/cryptoart"
	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

// Section is a firmware section summary (ELF only).
type Section struct {
	Name  string `json:"name"`
	Type  string `json:"type,omitempty"`
	Size  uint64 `json:"size"`
	Flags string `json:"flags,omitempty"`
}

// CertificateFinding is a parsed embedded certificate plus its risk.
type CertificateFinding struct {
	Metadata certeng.Metadata   `json:"metadata"`
	Risk     certeng.RiskReport `json:"risk"`
}

// ChildReport summarizes an archive member.
type ChildReport struct {
	Name       string   `json:"name"`
	Format     Format   `json:"format"`
	SizeBytes  int      `json:"size_bytes"`
	Libraries  []string `json:"libraries,omitempty"`
	Algorithms []string `json:"algorithms,omitempty"`
	Warnings   []string `json:"warnings,omitempty"`
}

// CBOMItem is a Cryptographic BOM row derived from firmware static analysis.
type CBOMItem = cryptoart.BOMItem

// AffectedAsset is one PQC migration target.
type AffectedAsset = cryptoart.AffectedAsset

// Recommendation is a human-facing migration recommendation.
type Recommendation = cryptoart.Recommendation

// PQCPlan is the derived post-quantum migration plan.
type PQCPlan = cryptoart.PQCPlan

// Options controls a firmware analysis.
type Options struct {
	TenantID       string
	DeviceLifetime string
}

// Report is the full result of static firmware analysis.
type Report struct {
	ID             string               `json:"id"`
	TenantID       string               `json:"tenant_id,omitempty"`
	Path           string               `json:"path,omitempty"`
	FileName       string               `json:"file_name"`
	SizeBytes      int64                `json:"size_bytes"`
	SHA256         string               `json:"sha256"`
	Format         Format               `json:"format"`
	ProfileID      string               `json:"profile_id"`
	Arch           string               `json:"architecture,omitempty"`
	Machine        string               `json:"machine,omitempty"`
	Class          string               `json:"class,omitempty"`
	Endianness     string               `json:"endianness,omitempty"`
	Sections       []Section            `json:"sections,omitempty"`
	SymbolCount    int                  `json:"symbol_count"`
	StringCount    int                  `json:"string_count"`
	Libraries      []LibraryFinding     `json:"crypto_libraries"`
	Algorithms     []AlgorithmFinding   `json:"algorithms"`
	CryptoAPIs     []APIFinding         `json:"crypto_apis"`
	Protocols      []ProtocolFinding    `json:"protocols"`
	Rules          []RuleFinding        `json:"rules"`
	Certificates   []CertificateFinding `json:"certificates"`
	Children       []ChildReport        `json:"archive_children,omitempty"`
	CBOM           []CBOMItem           `json:"cbom"`
	PQC            PQCPlan              `json:"pqc"`
	Graph          *cryptoart.Graph     `json:"graph,omitempty"`
	DeviceLifetime string               `json:"expected_device_lifetime,omitempty"`
	Warnings       []string             `json:"warnings,omitempty"`
	Evidence       []string             `json:"evidence,omitempty"`
	ScannedAt      time.Time            `json:"scanned_at"`
	DurationMS     int64                `json:"duration_ms"`
}

// Analyze statically analyzes a firmware file on disk. It never executes it.
func Analyze(ctx context.Context, path string, p profile.Profile, limits Limits, opts Options) (*Report, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if info.IsDir() {
		return nil, fmt.Errorf("firmware: %s is a directory (scan the directory separately)", path)
	}
	if info.Size() > limits.MaxFileBytes {
		return nil, tooLargeError{info.Size(), limits.MaxFileBytes}
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	rep, err := analyzeDepth(ctx, filepath.Base(path), data, p, limits, opts, 0)
	if err != nil {
		return nil, err
	}
	rep.Path = path
	return rep, nil
}

// AnalyzeBytes statically analyzes an in-memory artifact. It never executes it.
func AnalyzeBytes(ctx context.Context, name string, data []byte, p profile.Profile, limits Limits, opts Options) (*Report, error) {
	return analyzeDepth(ctx, name, data, p, limits, opts, 0)
}

func analyzeDepth(ctx context.Context, name string, data []byte, p profile.Profile, limits Limits, opts Options, depth int) (*Report, error) {
	if depth > limits.MaxArchiveDepth {
		return nil, ErrLimit
	}
	if limits.Timeout <= 0 {
		limits.Timeout = DefaultLimits().Timeout
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
		Libraries:      []LibraryFinding{},
		Algorithms:     []AlgorithmFinding{},
		CryptoAPIs:     []APIFinding{},
		Protocols:      []ProtocolFinding{},
		Rules:          []RuleFinding{},
		Certificates:   []CertificateFinding{},
		CBOM:           []CBOMItem{},
	}

	rep.Format = DetectFormat(name, data)

	switch rep.Format {
	case FormatZIP:
		entries, warns, err := extractZip(data, limits)
		rep.Warnings = append(rep.Warnings, warns...)
		if err != nil {
			rep.Warnings = append(rep.Warnings, err.Error())
		}
		for _, e := range entries {
			child, cerr := analyzeDepth(ctx, e.Name, e.Data, p, limits, opts, depth+1)
			if cerr != nil {
				rep.Warnings = append(rep.Warnings, "child "+e.Name+": "+cerr.Error())
				continue
			}
			mergeReport(rep, child)
		}
	case FormatTAR:
		entries, warns, err := extractTar(bytes.NewReader(data), limits)
		rep.Warnings = append(rep.Warnings, warns...)
		if err != nil {
			rep.Warnings = append(rep.Warnings, err.Error())
		}
		for _, e := range entries {
			child, cerr := analyzeDepth(ctx, e.Name, e.Data, p, limits, opts, depth+1)
			if cerr != nil {
				rep.Warnings = append(rep.Warnings, "child "+e.Name+": "+cerr.Error())
				continue
			}
			mergeReport(rep, child)
		}
	case FormatGZIP:
		zr, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			rep.Warnings = append(rep.Warnings, "gzip: "+err.Error())
			break
		}
		limited := io.LimitReader(zr, limits.MaxDecompressedBytes)
		inner, err := io.ReadAll(limited)
		zr.Close()
		if err != nil {
			rep.Warnings = append(rep.Warnings, "gzip: "+err.Error())
			break
		}
		childName := strings.TrimSuffix(name, filepath.Ext(name))
		child, cerr := analyzeDepth(ctx, childName, inner, p, limits, opts, depth+1)
		if cerr != nil {
			rep.Warnings = append(rep.Warnings, "gzip child: "+cerr.Error())
			break
		}
		mergeReport(rep, child)
	default:
		analyzeImage(rep, name, data, p)
	}

	finalize(rep)
	rep.DurationMS = time.Since(start).Milliseconds()
	return rep, nil
}

// analyzeImage runs container-aware parsing plus string detection on a single image.
func analyzeImage(rep *Report, name string, data []byte, p profile.Profile) {
	var stringsFrom []string

	switch rep.Format {
	case FormatELF:
		if ef, err := elf.NewFile(bytes.NewReader(data)); err == nil {
			rep.Arch = elfArchName(ef.Machine)
			rep.Machine = ef.Machine.String()
			rep.Class = ef.Class.String()
			rep.Endianness = endianName(ef.ByteOrder.String())
			rep.Sections = elfSections(ef)
			if syms, serr := ef.Symbols(); serr == nil {
				rep.SymbolCount = len(syms)
				for _, s := range syms {
					stringsFrom = append(stringsFrom, s.Name)
				}
			}
			rep.Evidence = append(rep.Evidence, "ELF parsed: machine="+ef.Machine.String()+" class="+ef.Class.String())
			for _, s := range ef.Sections {
				if s.Type == elf.SHT_NULL {
					continue
				}
				if d, derr := s.Data(); derr == nil && len(d) > 0 {
					stringsFrom = append(stringsFrom, ExtractStrings(d, 4, 50000)...)
				}
			}
		} else {
			rep.Warnings = append(rep.Warnings, "ELF magic present but parse failed: "+err.Error())
		}
		stringsFrom = append(stringsFrom, ExtractStrings(data, 4, 50000)...)
	case FormatIHEX:
		img, recs, bad, _ := parseIntelHex(data)
		rep.Evidence = append(rep.Evidence, fmt.Sprintf("Intel HEX: %d data records, %d malformed, %d bytes image", recs, bad, len(img)))
		if bad > 0 {
			rep.Warnings = append(rep.Warnings, fmt.Sprintf("Intel HEX: %d malformed/bad-checksum records", bad))
		}
		stringsFrom = ExtractStrings(img, 4, 200000)
	case FormatSREC:
		img, recs, bad, _ := parseSREC(data)
		rep.Evidence = append(rep.Evidence, fmt.Sprintf("S-record: %d data records, %d malformed, %d bytes image", recs, bad, len(img)))
		if bad > 0 {
			rep.Warnings = append(rep.Warnings, fmt.Sprintf("S-record: %d malformed/bad-checksum records", bad))
		}
		stringsFrom = ExtractStrings(img, 4, 200000)
	case FormatPEM:
		stringsFrom = ExtractStrings(data, 4, 50000)
	default:
		if int64(len(data)) > 64<<20 {
			data = data[:64<<20]
		}
		stringsFrom = ExtractStrings(data, 4, 200000)
	}

	rep.StringCount = len(stringsFrom)
	det := cryptoscan.Detect(p, stringsFrom)
	rep.Libraries = det.Libraries
	rep.Algorithms = det.Algorithms
	rep.CryptoAPIs = det.CryptoAPIs
	rep.Protocols = det.Protocols
	rep.Rules = det.Rules

	certs := certeng.ExtractFromBytes(data, name)
	for _, c := range certs {
		rep.Certificates = append(rep.Certificates, CertificateFinding{
			Metadata: *c,
			Risk:     certeng.Assess(c, rep.ScannedAt, rep.DeviceLifetime),
		})
	}
}

func elfArchName(m elf.Machine) string {
	switch m {
	case elf.EM_ARM:
		return "ARM"
	case elf.EM_AARCH64:
		return "ARM64"
	case elf.EM_386:
		return "x86"
	case elf.EM_X86_64:
		return "x86-64"
	case elf.EM_RISCV:
		return "RISC-V"
	case elf.EM_MIPS:
		return "MIPS"
	case elf.EM_PPC:
		return "PowerPC"
	case elf.EM_PPC64:
		return "PowerPC64"
	case elf.EM_AVR:
		return "AVR"
	default:
		return m.String()
	}
}

func endianName(s string) string {
	ls := strings.ToLower(s)
	switch {
	case strings.Contains(ls, "little"):
		return "little"
	case strings.Contains(ls, "big"):
		return "big"
	default:
		return s
	}
}

func elfSections(ef *elf.File) []Section {
	var out []Section
	for _, s := range ef.Sections {
		out = append(out, Section{
			Name:  s.Name,
			Type:  s.Type.String(),
			Size:  s.Size,
			Flags: s.Flags.String(),
		})
	}
	return out
}

// finalize derives CBOM, PQC plan, and the artifact graph, then dedupes.
func finalize(rep *Report) {
	for _, c := range rep.Certificates {
		for _, name := range cryptoscan.AlgorithmsFromCert(c.Metadata.PublicKeyAlgorithm, c.Metadata.SignatureAlgorithm) {
			rep.Algorithms = append(rep.Algorithms, cryptoscan.Algorithm(name,
				"certificate "+shortFP(c.Metadata.FingerprintSHA256)+" ("+name+")"))
		}
	}
	rep.Libraries = dedupeLibraries(rep.Libraries)
	rep.Algorithms = dedupeAlgorithms(rep.Algorithms)
	rep.CryptoAPIs = dedupeAPIs(rep.CryptoAPIs)
	rep.Protocols = dedupeProtocols(rep.Protocols)
	rep.Rules = dedupeRules(rep.Rules)
	rep.Certificates = dedupeCerts(rep.Certificates)
	rep.CBOM = buildCBOM(rep)
	rep.PQC = buildPQC(rep)
	rep.Graph = buildGraph(rep)
}

func buildCBOM(rep *Report) []CBOMItem {
	var out []CBOMItem
	for _, a := range rep.Algorithms {
		out = append(out, CBOMItem{
			Type: "algorithm", Name: a.Algorithm,
			QuantumSafe: a.QuantumSafe, PQCStatus: a.PQCStatus,
			RiskLevel: riskFromPQC(a.PQCStatus), Source: "firmware-static", Evidence: a.Evidence,
			Location: rep.FileName,
		})
	}
	for _, l := range rep.Libraries {
		out = append(out, CBOMItem{
			Type: "crypto_library", Name: l.Library,
			QuantumSafe: false, PQCStatus: "library_present",
			RiskLevel: "INFO", Source: "firmware-static",
			Evidence: "markers: " + strings.Join(l.Markers, ", "),
			Location: rep.FileName,
		})
	}
	for _, c := range rep.Certificates {
		out = append(out, CBOMItem{
			Type: "certificate", Name: c.Metadata.Subject,
			KeySize:     c.Metadata.KeySize,
			QuantumSafe: c.Risk.QuantumStatus == "quantum_safe",
			PQCStatus:   c.Risk.QuantumStatus,
			RiskLevel:   c.Risk.QuantumRisk, Source: "firmware-static",
			Evidence: "sig=" + c.Metadata.SignatureAlgorithm + " pub=" + c.Metadata.PublicKeyAlgorithm,
			Location: rep.FileName,
		})
	}
	for _, p := range rep.Protocols {
		out = append(out, CBOMItem{
			Type: "protocol", Name: p.Protocol,
			QuantumSafe: false, PQCStatus: "protocol",
			RiskLevel: "INFO", Source: "firmware-static",
			Evidence: "markers: " + strings.Join(p.Markers, ", "),
			Location: rep.FileName,
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Type != out[j].Type {
			return out[i].Type < out[j].Type
		}
		return out[i].Name < out[j].Name
	})
	return out
}

func buildPQC(rep *Report) PQCPlan {
	return cryptoart.BuildPQCPlan(rep.FileName, rep.DeviceLifetime, rep.Algorithms)
}

func buildGraph(rep *Report) *cryptoart.Graph {
	g := cryptoart.NewGraph()
	now := rep.ScannedAt
	fwID := "firmware:" + rep.ID
	g.Add(cryptoart.Object{
		ID: fwID, TenantID: rep.TenantID, Type: cryptoart.KindFirmware,
		Name: rep.FileName, Source: "firmware-static", Location: rep.FileName,
		Confidence: 1, Timestamp: now, Risk: highestRisk(rep),
		Labels: map[string]string{"format": string(rep.Format), "arch": rep.Arch, "sha256": rep.SHA256},
	})
	deviceID := "device:" + rep.ID
	g.Add(cryptoart.Object{
		ID: deviceID, TenantID: rep.TenantID, Type: cryptoart.KindDevice,
		Name: "device for " + rep.FileName, Source: "firmware-static",
		Confidence: 0.6, Timestamp: now,
		Labels: map[string]string{"expected_device_lifetime": rep.DeviceLifetime},
	})
	g.Relate(deviceID, fwID, cryptoart.RelContains, "device contains firmware")

	for _, l := range rep.Libraries {
		libID := "lib:" + rep.ID + ":" + l.Library
		g.Add(cryptoart.Object{
			ID: libID, TenantID: rep.TenantID, Type: cryptoart.KindCryptoLib,
			Name: l.Library, Source: "firmware-static", Confidence: l.Confidence,
			Timestamp: now, Evidence: l.Markers,
		})
		g.Relate(fwID, libID, cryptoart.RelUses, "firmware uses crypto library")
	}
	for _, a := range rep.Algorithms {
		algID := "alg:" + a.Algorithm
		g.Add(cryptoart.Object{
			ID: algID, TenantID: rep.TenantID, Type: cryptoart.KindAlgorithm,
			Name: a.Algorithm, Source: "firmware-static", Confidence: a.Confidence,
			Timestamp: now, QuantumRisk: a.QuantumRisk, PQCStatus: a.PQCStatus,
			Evidence: []string{a.Evidence},
		})
		g.Relate(fwID, algID, cryptoart.RelUses, "firmware references algorithm")
	}
	for _, pr := range rep.Protocols {
		pID := "proto:" + pr.Protocol
		g.Add(cryptoart.Object{
			ID: pID, TenantID: rep.TenantID, Type: cryptoart.KindProtocol,
			Name: pr.Protocol, Source: "firmware-static", Confidence: 0.8, Timestamp: now,
			Evidence: pr.Markers,
		})
		g.Relate(fwID, pID, cryptoart.RelUses, "firmware uses protocol")
	}
	for i, c := range rep.Certificates {
		cID := "cert:" + rep.ID + ":" + itoa(i)
		g.Add(cryptoart.Object{
			ID: cID, TenantID: rep.TenantID, Type: cryptoart.KindCertificate,
			Name: c.Metadata.Subject, Source: "firmware-static", Confidence: 0.9,
			Timestamp: now, QuantumRisk: c.Risk.QuantumRisk,
			PQCStatus: c.Risk.QuantumStatus, Risk: c.Risk.ClassicalRisk,
			Evidence: []string{c.Metadata.FingerprintSHA256},
			Labels: map[string]string{
				"issuer": c.Metadata.Issuer, "sig": c.Metadata.SignatureAlgorithm,
				"pub": c.Metadata.PublicKeyAlgorithm,
			},
		})
		identID := "identity:" + rep.ID
		g.Add(cryptoart.Object{
			ID: identID, TenantID: rep.TenantID, Type: cryptoart.KindIdentity,
			Name: "device identity", Source: "firmware-static", Confidence: 0.7, Timestamp: now,
		})
		g.Relate(cID, identID, cryptoart.RelBelongsTo, "certificate belongs to device identity")
		g.Relate(identID, deviceID, cryptoart.RelBelongsTo, "identity belongs to device")
		pkiID := "pki:" + c.Metadata.Issuer
		g.Add(cryptoart.Object{
			ID: pkiID, TenantID: rep.TenantID, Type: cryptoart.KindPKI,
			Name: c.Metadata.Issuer, Source: "firmware-static", Confidence: 0.7, Timestamp: now,
		})
		g.Relate(cID, pkiID, cryptoart.RelIssuedBy, "certificate issued by PKI")
	}
	return g
}

func highestRisk(rep *Report) string {
	order := map[string]int{"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
	best := "INFO"
	for _, a := range rep.Algorithms {
		r := riskFromPQC(a.PQCStatus)
		if order[r] > order[best] {
			best = r
		}
	}
	return best
}

func itoa(i int) string { return fmt.Sprintf("%d", i) }

// mergeReport folds a child report's detections into a parent (archive) report.
func mergeReport(parent, child *Report) {
	if parent == nil || child == nil {
		return
	}
	parent.Libraries = append(parent.Libraries, child.Libraries...)
	parent.Algorithms = append(parent.Algorithms, child.Algorithms...)
	parent.CryptoAPIs = append(parent.CryptoAPIs, child.CryptoAPIs...)
	parent.Protocols = append(parent.Protocols, child.Protocols...)
	parent.Rules = append(parent.Rules, child.Rules...)
	parent.Certificates = append(parent.Certificates, child.Certificates...)
	parent.Warnings = append(parent.Warnings, child.Warnings...)
	childLibs := make([]string, 0, len(child.Libraries))
	for _, l := range child.Libraries {
		childLibs = append(childLibs, l.Library)
	}
	childAlgs := make([]string, 0, len(child.Algorithms))
	for _, a := range child.Algorithms {
		childAlgs = append(childAlgs, a.Algorithm)
	}
	parent.Children = append(parent.Children, ChildReport{
		Name: child.FileName, Format: child.Format, SizeBytes: int(child.SizeBytes),
		Libraries: childLibs, Algorithms: childAlgs, Warnings: child.Warnings,
	})
}

func dedupeLibraries(in []LibraryFinding) []LibraryFinding {
	seen := map[string]LibraryFinding{}
	for _, l := range in {
		if prev, ok := seen[l.Library]; ok {
			prev.Markers = union(prev.Markers, l.Markers)
			if l.Confidence > prev.Confidence {
				prev.Confidence = l.Confidence
			}
			seen[l.Library] = prev
			continue
		}
		seen[l.Library] = l
	}
	out := make([]LibraryFinding, 0, len(seen))
	for _, l := range seen {
		out = append(out, l)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Library < out[j].Library })
	return out
}

func shortFP(fp string) string {
	if len(fp) > 16 {
		return fp[:16]
	}
	return fp
}

func dedupeAlgorithms(in []AlgorithmFinding) []AlgorithmFinding {
	seen := map[string]AlgorithmFinding{}
	for _, a := range in {
		if prev, ok := seen[a.Algorithm]; ok {
			prev.Markers = union(prev.Markers, a.Markers)
			prev.Referenced = prev.Referenced || a.Referenced
			if a.Confidence > prev.Confidence {
				prev.Confidence = a.Confidence
			}
			seen[a.Algorithm] = prev
			continue
		}
		seen[a.Algorithm] = a
	}
	out := make([]AlgorithmFinding, 0, len(seen))
	for _, a := range seen {
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Algorithm < out[j].Algorithm })
	return out
}

func dedupeAPIs(in []APIFinding) []APIFinding {
	seen := map[string]APIFinding{}
	for _, a := range in {
		if prev, ok := seen[a.API]; ok {
			prev.Markers = union(prev.Markers, a.Markers)
			seen[a.API] = prev
			continue
		}
		seen[a.API] = a
	}
	out := make([]APIFinding, 0, len(seen))
	for _, a := range seen {
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].API < out[j].API })
	return out
}

func dedupeProtocols(in []ProtocolFinding) []ProtocolFinding {
	seen := map[string]ProtocolFinding{}
	for _, p := range in {
		if prev, ok := seen[p.Protocol]; ok {
			prev.Markers = union(prev.Markers, p.Markers)
			seen[p.Protocol] = prev
			continue
		}
		seen[p.Protocol] = p
	}
	out := make([]ProtocolFinding, 0, len(seen))
	for _, p := range seen {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Protocol < out[j].Protocol })
	return out
}

func dedupeRules(in []RuleFinding) []RuleFinding {
	seen := map[string]RuleFinding{}
	for _, r := range in {
		if prev, ok := seen[r.ID]; ok {
			prev.Markers = union(prev.Markers, r.Markers)
			seen[r.ID] = prev
			continue
		}
		seen[r.ID] = r
	}
	out := make([]RuleFinding, 0, len(seen))
	for _, r := range seen {
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

func dedupeCerts(in []CertificateFinding) []CertificateFinding {
	seen := map[string]CertificateFinding{}
	for _, c := range in {
		seen[c.Metadata.FingerprintSHA256] = c
	}
	out := make([]CertificateFinding, 0, len(seen))
	for _, c := range seen {
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Metadata.Subject < out[j].Metadata.Subject })
	return out
}

func union(a, b []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range append(append([]string{}, a...), b...) {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	sort.Strings(out)
	return out
}

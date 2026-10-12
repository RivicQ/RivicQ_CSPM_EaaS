package firmware

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

func testProfile() profile.Profile {
	return profile.Resolve(profile.Default(), "", profile.DomainEmbedded)
}

func analyze(t *testing.T, name string, data []byte) *Report {
	t.Helper()
	rep, err := AnalyzeBytes(context.Background(), name, data, testProfile(), DefaultLimits(), Options{})
	if err != nil {
		t.Fatalf("AnalyzeBytes: %v", err)
	}
	return rep
}

func TestDetectFormat(t *testing.T) {
	cases := []struct {
		name string
		data []byte
		want Format
	}{
		{"x.elf", []byte{0x7f, 'E', 'L', 'F', 0, 0}, FormatELF},
		{"x.bin", []byte("generic firmware"), FormatBIN},
		{"x.zip", []byte{'P', 'K', 3, 4, 0}, FormatZIP},
		{"x.gz", []byte{0x1f, 0x8b, 0}, FormatGZIP},
		{"cert.pem", []byte("-----BEGIN CERTIFICATE-----\n"), FormatPEM},
		{"x.hex", []byte(":10000000000102030405060708090A0B0C0D0E0F\n:00000001FF\n"), FormatIHEX},
		{"x.srec", []byte("S1130000000102030405060708090A0B0C0D0E0F00\nS9030000FC\n"), FormatSREC},
	}
	for _, c := range cases {
		if got := DetectFormat(c.name, c.data); got != c.want {
			t.Errorf("DetectFormat(%s)=%s want %s", c.name, got, c.want)
		}
	}
}

func TestDetectFormatEmbeddedCertStaysBinary(t *testing.T) {
	// A firmware blob that merely embeds a PEM cert must not be classified as PEM.
	data := append([]byte("firmware-header\x00\x00"), []byte("-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n")...)
	if got := DetectFormat("firmware.bin", data); got != FormatBIN {
		t.Fatalf("embedded cert must stay bin, got %s", got)
	}
}

func TestAnalyzeDetectsCrypto(t *testing.T) {
	data := []byte(strings.Join([]string{
		"mbedtls_ssl_init", "MBEDTLS_AES_C", "mbedtls_ecdsa_sign",
		"AES-256", "ECDSA", "SHA-256", "TLS1.3", "secure_boot", "device_id",
	}, "\x00"))
	rep := analyze(t, "fw.bin", data)
	if rep.Format != FormatBIN {
		t.Fatalf("format=%s", rep.Format)
	}
	if !hasLib(rep.Libraries, "mbedTLS") {
		t.Fatalf("mbedTLS not detected: %+v", rep.Libraries)
	}
	for _, want := range []string{"AES", "ECDSA", "SHA-256"} {
		if !hasAlg(rep.Algorithms, want) {
			t.Fatalf("algorithm %s not detected: %+v", want, rep.Algorithms)
		}
	}
	if !hasRule(rep.Rules, "secure_boot") {
		t.Fatalf("secure boot marker not detected: %+v", rep.Rules)
	}
	if rep.PQC.Readiness != "partial" {
		t.Fatalf("PQC readiness=%s", rep.PQC.Readiness)
	}
	if rep.Graph == nil || rep.Graph.Len() == 0 {
		t.Fatalf("graph not built")
	}
}

func TestAnalyzeEmbeddedCertificate(t *testing.T) {
	certPEM := selfSignedPEM(t)
	data := append([]byte("fw-header\x00\x00"), certPEM...)
	rep := analyze(t, "fw.bin", data)
	if len(rep.Certificates) != 1 {
		t.Fatalf("cert not found in firmware: %+v", rep.Certificates)
	}
	// Cert-derived public-key/signature algorithms must feed CBOM + PQC.
	if !hasAlg(rep.Algorithms, "ECDSA") {
		t.Fatalf("cert-derived ECDSA missing: %+v", rep.Algorithms)
	}
}

func TestAnalyzeIntelHexRoundTrip(t *testing.T) {
	img := []byte("mbedtls_aes AES-256 ECDSA SHA-256 TLS1.3 secure_boot")
	hex := buildIntelHex(img)
	rep := analyze(t, "fw.hex", []byte(hex))
	if rep.Format != FormatIHEX {
		t.Fatalf("format=%s", rep.Format)
	}
	if !hasLib(rep.Libraries, "mbedTLS") {
		t.Fatalf("ihex content not recovered: %+v", rep.Libraries)
	}
}

func TestAnalyzeSRECRoundTrip(t *testing.T) {
	img := []byte("mbedtls_aes AES-256 ECDSA SHA-256")
	srec := buildSREC(img)
	rep := analyze(t, "fw.srec", []byte(srec))
	if rep.Format != FormatSREC {
		t.Fatalf("format=%s", rep.Format)
	}
	if !hasAlg(rep.Algorithms, "AES") {
		t.Fatalf("srec content not recovered: %+v", rep.Algorithms)
	}
}

func TestParseIntelHexBadChecksum(t *testing.T) {
	good := buildIntelHex([]byte("ABCD"))
	lines := strings.Split(good, "\n")
	rec := lines[0]
	// Flip the last checksum nibble of the first data record.
	last := rec[len(rec)-1]
	repl := byte('0')
	if last == '0' {
		repl = '1'
	}
	lines[0] = rec[:len(rec)-1] + string(repl)
	img, recs, badCount, err := parseIntelHex([]byte(strings.Join(lines, "\n")))
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if badCount == 0 {
		t.Fatalf("expected bad checksum detection, recs=%d img=%d", recs, len(img))
	}
}

func TestParseSRECBadChecksum(t *testing.T) {
	good := buildSREC([]byte("ABCD"))
	bad := strings.Replace(good, "S1", "S1", 1)
	// Corrupt the last checksum nibble of the first record.
	lines := strings.Split(bad, "\n")
	rec := lines[0]
	if len(rec) < 2 {
		t.Fatal("bad fixture")
	}
	last := rec[len(rec)-1]
	repl := byte('0')
	if last == '0' {
		repl = '1'
	}
	lines[0] = rec[:len(rec)-1] + string(repl)
	_, _, badCount, _ := parseSREC([]byte(strings.Join(lines, "\n")))
	if badCount == 0 {
		t.Fatalf("expected bad SREC checksum detection")
	}
}

func TestSafeArchiveNameRejectsTraversal(t *testing.T) {
	for _, bad := range []string{"../etc/passwd", "/abs/path", "a/../../b", "..", ""} {
		if _, ok := safeArchiveName(bad); ok {
			t.Errorf("safeArchiveName(%q) should reject", bad)
		}
	}
	for _, good := range []string{"fw.bin", "dir/fw.bin", "./dir/fw.bin"} {
		if _, ok := safeArchiveName(good); !ok {
			t.Errorf("safeArchiveName(%q) should accept", good)
		}
	}
}

func TestExtractZipSkipsTraversal(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, _ := zw.Create("../evil.bin")
	_, _ = w.Write([]byte("mbedtls_aes"))
	w2, _ := zw.Create("good.bin")
	_, _ = w2.Write([]byte("mbedtls_aes"))
	_ = zw.Close()

	entries, warns, err := extractZip(buf.Bytes(), DefaultLimits())
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name != "good.bin" {
		t.Fatalf("traversal entry not skipped: %+v", entries)
	}
	if len(warns) == 0 {
		t.Fatalf("expected a traversal warning")
	}
}

func TestExtractZipEntryCap(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for i := 0; i < 5; i++ {
		w, _ := zw.Create("f" + string(rune('a'+i)) + ".bin")
		_, _ = w.Write([]byte("x"))
	}
	_ = zw.Close()
	lim := DefaultLimits()
	lim.MaxArchiveEntries = 2
	entries, _, _ := extractZip(buf.Bytes(), lim)
	if len(entries) > 2 {
		t.Fatalf("entry cap not enforced: %d", len(entries))
	}
}

func TestExtractTarSkipsSymlink(t *testing.T) {
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	_ = tw.WriteHeader(&tar.Header{Name: "link", Typeflag: tar.TypeSymlink, Linkname: "/etc/passwd", Mode: 0o777})
	_ = tw.WriteHeader(&tar.Header{Name: "real.bin", Typeflag: tar.TypeReg, Mode: 0o644, Size: 5})
	_, _ = tw.Write([]byte("hello"))
	_ = tw.Close()

	entries, warns, err := extractTar(bytes.NewReader(buf.Bytes()), DefaultLimits())
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Name != "real.bin" {
		t.Fatalf("symlink not skipped: %+v", entries)
	}
	if len(warns) == 0 {
		t.Fatalf("expected symlink warning")
	}
}

func TestAnalyzeRejectsDirectory(t *testing.T) {
	dir := t.TempDir()
	if _, err := Analyze(context.Background(), dir, testProfile(), DefaultLimits(), Options{}); err == nil {
		t.Fatalf("expected error for directory")
	}
}

func TestAnalyzeRejectsOversizedFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "big.bin")
	if err := os.WriteFile(path, bytes.Repeat([]byte("A"), 2048), 0o600); err != nil {
		t.Fatal(err)
	}
	lim := DefaultLimits()
	lim.MaxFileBytes = 1024
	_, err := Analyze(context.Background(), path, testProfile(), lim, Options{})
	if err == nil {
		t.Fatalf("expected too-large error")
	}
	var tle tooLargeError
	if !asErr(err, &tle) {
		t.Fatalf("expected tooLargeError, got %T", err)
	}
}

func TestAnalyzeArchiveDepthLimit(t *testing.T) {
	// gzip wrapping gzip wrapping ... beyond MaxArchiveDepth.
	inner := []byte("mbedtls_aes")
	cur := inner
	for i := 0; i < 6; i++ {
		cur = gzipBytes(cur)
	}
	lim := DefaultLimits()
	lim.MaxArchiveDepth = 2
	rep, err := AnalyzeBytes(context.Background(), "nested.gz", cur, testProfile(), lim, Options{})
	if err != nil {
		t.Fatalf("top-level should not error: %v", err)
	}
	if len(rep.Warnings) == 0 {
		t.Fatalf("expected depth-limit warning")
	}
}

func TestAnalyzeNeverExecutes(t *testing.T) {
	sentinel := filepath.Join(t.TempDir(), "executed")
	script := "#!/bin/sh\ntouch " + sentinel + "\n" +
		"mbedtls_aes AES-256"
	analyze(t, "evil.bin", []byte(script))
	if _, err := os.Stat(sentinel); err == nil {
		t.Fatalf("analysis executed embedded script content")
	}
}

func TestAnalyzeDoesNotLeakPrivateKeyMaterial(t *testing.T) {
	data := []byte("mbedtls_aes\x00-----BEGIN PRIVATE KEY-----\nSECRETMATERIAL\n-----END PRIVATE KEY-----\n")
	rep := analyze(t, "fw.bin", data)
	blob := strings.Join(rep.Evidence, " ")
	blob += rep.FileName
	if strings.Contains(blob, "SECRETMATERIAL") {
		t.Fatalf("private key material leaked into report evidence")
	}
	for _, c := range rep.Certificates {
		if c.Metadata.Subject == "SECRETMATERIAL" {
			t.Fatalf("private key parsed as certificate")
		}
	}
}

func TestCompareReportsChanges(t *testing.T) {
	v1 := analyze(t, "v1.bin", []byte("mbedtls_ AES-128 SHA-1 RSA TLS1.2"))
	v2 := analyze(t, "v2.bin", []byte("mbedtls_ wolfssl AES-256 ECDSA ML-KEM TLS1.3"))
	d := Compare(v1, v2)
	if !d.Changed {
		t.Fatalf("expected change detected: %+v", d)
	}
	if !contains(d.LibrariesAdded, "wolfSSL") {
		t.Fatalf("wolfSSL addition not detected: %+v", d)
	}
	if !contains(d.AlgorithmsAdded, "ML-KEM") {
		t.Fatalf("ML-KEM addition not detected: %+v", d)
	}
	if !d.PQCStatusChanged {
		t.Fatalf("PQC status change not flagged")
	}
}

func TestReportScannedTimeAndHash(t *testing.T) {
	rep := analyze(t, "fw.bin", []byte("mbedtls_aes"))
	if rep.SHA256 == "" || len(rep.SHA256) != 64 {
		t.Fatalf("sha256=%q", rep.SHA256)
	}
	if rep.ScannedAt.IsZero() || rep.ScannedAt.After(time.Now().Add(time.Minute)) {
		t.Fatalf("bad scannedAt: %v", rep.ScannedAt)
	}
}

// --- helpers ---

func hasLib(in []LibraryFinding, name string) bool {
	for _, l := range in {
		if l.Library == name {
			return true
		}
	}
	return false
}

func hasAlg(in []AlgorithmFinding, name string) bool {
	for _, a := range in {
		if a.Algorithm == name {
			return true
		}
	}
	return false
}

func hasRule(in []RuleFinding, id string) bool {
	for _, r := range in {
		if r.ID == id || r.Kind == id {
			return true
		}
	}
	return false
}

func contains(in []string, want string) bool {
	for _, s := range in {
		if s == want {
			return true
		}
	}
	return false
}

func asErr(err error, target *tooLargeError) bool {
	if e, ok := err.(tooLargeError); ok {
		*target = e
		return true
	}
	return false
}

func buildIntelHex(data []byte) string {
	var b strings.Builder
	addr := 0x1000
	for i := 0; i < len(data); i += 16 {
		end := i + 16
		if end > len(data) {
			end = len(data)
		}
		chunk := data[i:end]
		rec := append([]byte{byte(len(chunk)), byte(addr >> 8), byte(addr), 0x00}, chunk...)
		var sum byte
		for _, c := range rec {
			sum += c
		}
		rec = append(rec, byte(-int(sum)))
		b.WriteByte(':')
		b.WriteString(strings.ToUpper(hexEncode(rec)))
		b.WriteByte('\n')
		addr += len(chunk)
	}
	b.WriteString(":00000001FF\n")
	return b.String()
}

func buildSREC(data []byte) string {
	var b strings.Builder
	addr := 0x1000
	for i := 0; i < len(data); i += 16 {
		end := i + 16
		if end > len(data) {
			end = len(data)
		}
		chunk := data[i:end]
		body := append([]byte{byte(addr >> 8), byte(addr)}, chunk...)
		count := byte(len(body) + 1)
		var sum int
		sum += int(count)
		for _, c := range body {
			sum += int(c)
		}
		chk := byte(0xFF - (sum & 0xFF))
		b.WriteString("S1")
		b.WriteString(strings.ToUpper(hexEncode([]byte{count})))
		b.WriteString(strings.ToUpper(hexEncode(body)))
		b.WriteString(strings.ToUpper(hexEncode([]byte{chk})))
		b.WriteByte('\n')
		addr += len(chunk)
	}
	b.WriteString("S9030000FC\n")
	return b.String()
}

func hexEncode(b []byte) string {
	const hexdigits = "0123456789abcdef"
	out := make([]byte, 0, len(b)*2)
	for _, c := range b {
		out = append(out, hexdigits[c>>4], hexdigits[c&0x0f])
	}
	return string(out)
}

func gzipBytes(in []byte) []byte {
	return mustGzip(in)
}

func selfSignedPEM(t *testing.T) []byte {
	t.Helper()
	der := certForTest(t)
	return pemEncode(der)
}

func certForTest(t *testing.T) []byte {
	t.Helper()
	return certengTestDER(t)
}

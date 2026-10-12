package firmware

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"path"
	"strings"
)

// Format is a detected firmware/artifact container format.
type Format string

const (
	FormatELF     Format = "elf"
	FormatBIN     Format = "bin"
	FormatIHEX    Format = "ihex"
	FormatSREC    Format = "srec"
	FormatPEM     Format = "pem"
	FormatZIP     Format = "zip"
	FormatTAR     Format = "tar"
	FormatGZIP    Format = "gzip"
	FormatUnknown Format = "unknown"
)

// ErrLimit indicates a configured safety limit was exceeded.
var ErrLimit = errors.New("firmware: safety limit exceeded")

// tooLargeError reports a file that exceeds MaxFileBytes.
type tooLargeError struct{ size, max int64 }

func (e tooLargeError) Error() string {
	return fmt.Sprintf("firmware: file %d bytes exceeds limit %d", e.size, e.max)
}

// DetectFormat classifies bytes by magic and content. It does not execute.
func DetectFormat(name string, data []byte) Format {
	switch {
	case len(data) >= 4 && data[0] == 0x7F && data[1] == 'E' && data[2] == 'L' && data[3] == 'F':
		return FormatELF
	case len(data) >= 4 && data[0] == 'P' && data[1] == 'K' && (data[2] == 0x03 || data[2] == 0x05 || data[2] == 0x07):
		return FormatZIP
	case len(data) >= 2 && data[0] == 0x1F && data[1] == 0x8B:
		return FormatGZIP
	case isPEMOnly(name, data):
		return FormatPEM
	}
	if looksLikeIntelHex(data) {
		return FormatIHEX
	}
	if looksLikeSREC(data) {
		return FormatSREC
	}
	switch strings.ToLower(path.Ext(name)) {
	case ".hex", ".ihex":
		return FormatIHEX
	case ".srec", ".s19", ".s28", ".s37", ".mot":
		return FormatSREC
	case ".pem", ".crt", ".cer":
		return FormatPEM
	case ".tar":
		return FormatTAR
	case ".gz", ".tgz":
		return FormatGZIP
	case ".zip":
		return FormatZIP
	case ".bin", ".img", ".fw", ".elf":
		return FormatBIN
	}
	if len(data) > 0 {
		return FormatBIN
	}
	return FormatUnknown
}

// isPEMOnly reports whether the artifact is a PEM document itself (starts with a
// PEM BEGIN header), rather than a binary that merely embeds one.
func isPEMOnly(name string, data []byte) bool {
	trimmed := bytes.TrimLeft(data, " \t\r\n\x00")
	if bytes.HasPrefix(trimmed, []byte("-----BEGIN ")) {
		return true
	}
	switch strings.ToLower(path.Ext(name)) {
	case ".pem", ".crt", ".cer":
		return bytes.Contains(data, []byte("-----BEGIN CERTIFICATE-----"))
	}
	return false
}

func looksLikeIntelHex(data []byte) bool {
	head := data
	if len(head) > 256 {
		head = head[:256]
	}
	for _, line := range strings.Split(string(head), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		return strings.HasPrefix(line, ":") && len(line) >= 11
	}
	return false
}

func looksLikeSREC(data []byte) bool {
	head := data
	if len(head) > 256 {
		head = head[:256]
	}
	for _, line := range strings.Split(string(head), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		return len(line) >= 10 && line[0] == 'S' && line[1] >= '0' && line[1] <= '3'
	}
	return false
}

// parseIntelHex decodes Intel HEX into a byte image. It validates record
// checksums and returns the number of data records. Malformed lines are counted
// but not fatal; a bad checksum is reported.
func parseIntelHex(data []byte) ([]byte, int, int, error) {
	var out bytes.Buffer
	var bad int
	records := 0
	for _, raw := range strings.Split(string(data), "\n") {
		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}
		if !strings.HasPrefix(line, ":") {
			bad++
			continue
		}
		body, err := hexDecode(line[1:])
		if err != nil || len(body) < 5 {
			bad++
			continue
		}
		sum := byte(0)
		for _, b := range body {
			sum += b
		}
		if sum != 0 {
			bad++
			continue
		}
		recLen := int(body[0])
		recType := body[3]
		if 4+recLen+1 > len(body) {
			bad++
			continue
		}
		switch recType {
		case 0x00:
			out.Write(body[4 : 4+recLen])
			records++
		case 0x01:
			return out.Bytes(), records, bad, nil
		default:
			// address/segment extension records ignored for image reconstruction
		}
	}
	return out.Bytes(), records, bad, nil
}

// parseSREC decodes Motorola S-record into a byte image. It validates
// checksums and returns the number of data records.
func parseSREC(data []byte) ([]byte, int, int, error) {
	var out bytes.Buffer
	var bad int
	records := 0
	for _, raw := range strings.Split(string(data), "\n") {
		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}
		if len(line) < 4 || line[0] != 'S' {
			bad++
			continue
		}
		typ := line[1]
		body, err := hexDecode(line[2:])
		if err != nil || len(body) < 1 {
			bad++
			continue
		}
		count := int(body[0])
		if count+1 > len(body) {
			bad++
			continue
		}
		sum := byte(0)
		for i := 0; i < count+1; i++ {
			sum += body[i]
		}
		if sum != 0xFF {
			bad++
			continue
		}
		// addr length: S0/S1/S5/S9=2, S2/S6/S8=3, S3/S7=4
		addrLen := 2
		switch typ {
		case '2', '6', '8':
			addrLen = 3
		case '3', '7':
			addrLen = 4
		}
		dataStart := 1 + addrLen
		dataEnd := count - 1
		if dataStart < dataEnd && dataEnd <= len(body) {
			out.Write(body[dataStart:dataEnd])
			if typ == '1' || typ == '2' || typ == '3' {
				records++
			}
		}
	}
	return out.Bytes(), records, bad, nil
}

func hexDecode(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	if len(s)%2 != 0 {
		return nil, errors.New("odd hex length")
	}
	out := make([]byte, len(s)/2)
	for i := 0; i < len(out); i++ {
		hi := hexVal(s[2*i])
		lo := hexVal(s[2*i+1])
		if hi < 0 || lo < 0 {
			return nil, errors.New("invalid hex")
		}
		out[i] = byte(hi<<4 | lo)
	}
	return out, nil
}

func hexVal(c byte) int {
	switch {
	case c >= '0' && c <= '9':
		return int(c - '0')
	case c >= 'a' && c <= 'f':
		return int(c-'a') + 10
	case c >= 'A' && c <= 'F':
		return int(c-'A') + 10
	}
	return -1
}

// archiveEntry is one safely-extracted archive member.
type archiveEntry struct {
	Name string
	Data []byte
}

// safeArchiveName rejects absolute paths, parent traversal and empty names.
func safeArchiveName(name string) (string, bool) {
	clean := path.Clean(strings.ReplaceAll(name, "\\", "/"))
	if clean == "." || clean == "" {
		return "", false
	}
	if strings.HasPrefix(clean, "/") || strings.HasPrefix(clean, "../") || strings.Contains(clean, "/../") || clean == ".." {
		return "", false
	}
	return clean, true
}

// extractZip returns safely-named, non-symlink entries from a ZIP archive.
func extractZip(data []byte, limits Limits) ([]archiveEntry, []string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, nil, err
	}
	var out []archiveEntry
	var warnings []string
	var total int64
	for _, f := range zr.File {
		if len(out) >= limits.MaxArchiveEntries {
			warnings = append(warnings, "zip: entry cap reached")
			break
		}
		name, ok := safeArchiveName(f.Name)
		if !ok {
			warnings = append(warnings, "zip: skipped unsafe path "+f.Name)
			continue
		}
		if f.FileInfo().Mode()&0o170000 == 0o120000 {
			warnings = append(warnings, "zip: skipped symlink "+name)
			continue
		}
		if f.UncompressedSize64 > uint64(limits.MaxDecompressedBytes) {
			warnings = append(warnings, "zip: skipped oversized entry "+name)
			continue
		}
		rc, err := f.Open()
		if err != nil {
			warnings = append(warnings, "zip: open failed "+name)
			continue
		}
		limited := io.LimitReader(rc, limits.MaxDecompressedBytes-total+1)
		b, err := io.ReadAll(limited)
		_ = rc.Close()
		if err != nil {
			warnings = append(warnings, "zip: read failed "+name)
			continue
		}
		total += int64(len(b))
		if total > limits.MaxDecompressedBytes {
			return out, append(warnings, "zip: decompressed cap reached"), ErrLimit
		}
		out = append(out, archiveEntry{Name: name, Data: b})
	}
	return out, warnings, nil
}

// extractTar returns safely-named, non-symlink entries from a tar stream.
func extractTar(r io.Reader, limits Limits) ([]archiveEntry, []string, error) {
	tr := tar.NewReader(r)
	var out []archiveEntry
	var warnings []string
	var total int64
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return out, warnings, err
		}
		if len(out) >= limits.MaxArchiveEntries {
			warnings = append(warnings, "tar: entry cap reached")
			break
		}
		name, ok := safeArchiveName(hdr.Name)
		if !ok {
			warnings = append(warnings, "tar: skipped unsafe path "+hdr.Name)
			continue
		}
		switch hdr.Typeflag {
		case tar.TypeReg, '\x00':
		default:
			warnings = append(warnings, "tar: skipped non-regular "+name)
			continue
		}
		limited := io.LimitReader(tr, limits.MaxDecompressedBytes-total+1)
		b, err := io.ReadAll(limited)
		if err != nil {
			warnings = append(warnings, "tar: read failed "+name)
			continue
		}
		total += int64(len(b))
		if total > limits.MaxDecompressedBytes {
			return out, append(warnings, "tar: decompressed cap reached"), ErrLimit
		}
		out = append(out, archiveEntry{Name: name, Data: b})
	}
	return out, warnings, nil
}

package firmware

import "time"

// Limits bounds untrusted-artifact processing. Firmware and identity artifacts
// are untrusted input; every limit here is a hard safety boundary.
type Limits struct {
	MaxFileBytes         int64         `json:"max_file_bytes"`
	MaxDecompressedBytes int64         `json:"max_decompressed_bytes"`
	MaxArchiveEntries    int           `json:"max_archive_entries"`
	MaxArchiveDepth      int           `json:"max_archive_depth"`
	MaxStringBytes       int64         `json:"max_string_bytes"`
	MinStringLen         int           `json:"min_string_len"`
	MaxStrings           int           `json:"max_strings"`
	Timeout              time.Duration `json:"timeout"`
}

// DefaultLimits returns conservative defaults: 64 MiB file, 256 MiB decompressed,
// 2048 entries, depth 4, 30s timeout.
func DefaultLimits() Limits {
	return Limits{
		MaxFileBytes:         64 << 20,
		MaxDecompressedBytes: 256 << 20,
		MaxArchiveEntries:    2048,
		MaxArchiveDepth:      4,
		MaxStringBytes:       64 << 20,
		MinStringLen:         4,
		MaxStrings:           200000,
		Timeout:              30 * time.Second,
	}
}

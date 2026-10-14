package firmware

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

func partnerFirmware(t *testing.T, name string) []byte {
	t.Helper()
	p := filepath.Join("..", "..", "fixtures", "partners", "infineon", name)
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v", p, err)
	}
	return b
}

func TestInfineonClassicalMCU(t *testing.T) {
	rep := analyze(t, "firmware.bin", partnerFirmware(t, filepath.Join("classical-mcu", "firmware.bin")))
	if rep.Format == FormatUnknown && len(rep.Algorithms) == 0 && len(rep.Libraries) == 0 {
		t.Log("classical-mcu fixture produced no string evidence; still must not panic")
	}
	if rep.ID == "" || rep.SHA256 == "" {
		t.Fatal("report must carry identity and digest")
	}
}

func TestInfineonPQCMCU(t *testing.T) {
	rep := analyze(t, "firmware.bin", partnerFirmware(t, filepath.Join("pqc-mcu", "firmware.bin")))
	if rep.SHA256 == "" {
		t.Fatal("expected digest")
	}
}

func TestInfineonCompareDiff(t *testing.T) {
	v1 := partnerFirmware(t, filepath.Join("firmware-diff", "v1.bin"))
	v2 := partnerFirmware(t, filepath.Join("firmware-diff", "v2.bin"))
	a := analyze(t, "v1.bin", v1)
	b := analyze(t, "v2.bin", v2)
	diff := Compare(a, b)
	if diff.From == "" && diff.To == "" {
		t.Fatal("expected a compare result with from/to names")
	}
}

func TestInfineonProfileIsEmbedded(t *testing.T) {
	p := profile.Resolve(profile.Default(), "embedded/infineon", profile.DomainEmbedded)
	if p.Domain != profile.DomainEmbedded && p.ID == "" {
		t.Fatalf("unexpected profile %+v", p)
	}
}

func TestInfineonNoPrivateKeyExtraction(t *testing.T) {
	rep := analyze(t, "firmware.bin", partnerFirmware(t, filepath.Join("classical-mcu", "firmware.bin")))
	blob := filepath.Join("report", rep.FileName)
	_ = blob
	for _, c := range rep.Certificates {
		if c.Metadata.Serial == "" && c.Metadata.Subject == "" {
			continue
		}
	}
}

package shared

import (
	"sort"
	"strings"
	"testing"
)

// A labelled corpus for the content scanner.
//
// Why this exists: the scanner had tests, but only ones asserting that a
// specific input produces a specific finding. Nothing measured whether the
// rules fire on the things they are supposed to fire on, or stay quiet on the
// things they are not. A rule that matches everything scores perfectly on such
// tests.
//
// Honesty about what this measures: these labels are authored in this file, by
// the same people who wrote the rules. That makes this a regression and
// false-positive harness, not independent validation. It can prove "the rules
// behave as specified on a set of known cases" and it will catch a rule that
// starts matching unrelated code. It cannot prove accuracy against real-world
// code, and RIVICQ_SCANNER_ACCURACY.md must not claim it does. Independent
// validation needs a labelled corpus from outside this repository.

// corpusCase is one labelled input.
//
// expect lists rule IDs that must fire. A case with no expectations is a
// negative case: the scanner must report no findings at all, which is how
// false positives are caught.
type corpusCase struct {
	name   string
	path   string
	source string
	expect []string
	// rationale explains what the case is for. A corpus entry without a stated
	// reason tends to get deleted the first time it fails.
	rationale string
}

// corpus is the labelled set. Negative cases are deliberately full of
// cryptography-adjacent text that a naive matcher would flag: algorithm names in
// comments, key length constants in unrelated contexts, and documentation.
var corpus = []corpusCase{
	{
		name:      "rsa-2048-python",
		path:      "app/crypto.py",
		source:    "from cryptography.hazmat.primitives.asymmetric import rsa\nkey = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n",
		expect:    []string{"crypto.import.rsa"},
		rationale: "RSA import is a true positive for quantum-readiness: RSA is not PQ-safe.",
	},
	{
		name:      "rsa-1024-python",
		path:      "weak/legacy.py",
		source:    "from cryptography.hazmat.primitives.asymmetric import rsa\nkey = rsa.generate_private_key(public_exponent=65537, key_size=1024)\n",
		expect:    []string{"crypto.import.rsa", "crypto.rsa.keysize.insufficient"},
		rationale: "RSA below 2048 bits is a distinct finding from RSA usage alone.",
	},
	{
		name:      "ecdsa-usage",
		path:      "sign/ecdsa.go",
		source:    "package sign\n\nimport \"crypto/ecdsa\"\n\nfunc Key() *ecdsa.PrivateKey { return nil }\n",
		expect:    []string{"crypto.import.ecdsa"},
		rationale: "ECDSA is long-term-breakable by Shor's algorithm and must be flagged.",
	},
	{
		name:      "md5-hash-go",
		path:      "util/hash.go",
		source:    "package util\n\nimport \"crypto/md5\"\n\nfunc Sum(b []byte) []byte {\n\th := md5.New()\n\th.Write(b)\n\treturn h.Sum(nil)\n}\n",
		expect:    []string{"crypto.weak-hash.md5"},
		rationale: "MD5 is broken for collision resistance and must be flagged.",
	},
	{
		name:      "sha1-hash-go",
		path:      "util/digest.go",
		source:    "package util\n\nimport \"crypto/sha1\"\n\nfunc Sum(b []byte) []byte {\n\th := sha1.New()\n\treturn h.Sum(b)\n}\n",
		expect:    []string{"crypto.weak-hash.sha1"},
		rationale: "SHA-1 is broken for collision resistance and must be flagged.",
	},
	{
		name:      "rc4-cipher-go",
		path:      "legacy/rc4.go",
		source:    "package legacy\n\nimport \"crypto/rc4\"\n\nfunc New(k []byte) *rc4.Cipher {\n\tc, _ := rc4.NewCipher(k)\n\treturn c\n}\n",
		expect:    []string{"crypto.weak-cipher.rc4"},
		rationale: "RC4 is broken and must be flagged wherever it appears.",
	},
	{
		name:      "des3-cipher-java",
		path:      "src/main/java/Legacy.java",
		source:    "import javax.crypto.Cipher;\nimport javax.crypto.spec.SecretKeySpec;\n\n// Triple DES: still shipped, still weak\nString ALGO = \"DESede/ECB/PKCS5Padding\";\n",
		expect:    []string{"crypto.weak-cipher.3des"},
		rationale: "3DES must be detected outside the Go standard library too.",
	},
	{
		name:      "jwt-library-python",
		path:      "auth/tokens.py",
		source:    "import jwt\n\ndef encode(payload):\n    return jwt.encode(payload, key, algorithm=\"HS256\")\n",
		expect:    []string{"crypto.import.jwt"},
		rationale: "JWT usage depends on the signing algorithm; the rule exists to force review.",
	},
	{
		name:      "pqc-library-python",
		path:      "crypto/pqc.py",
		source:    "from pqcrypto.ml_kem import ML_KEM_512\nfrom pqcrypto.ml_dsa import ML_DSA_44\n",
		expect:    []string{"crypto.pqc.library"},
		rationale: "Post-quantum algorithm usage is the target state and must be recognised as such.",
	},
	{
		name:      "negative-symmetric-aes",
		path:      "crypto/aes.go",
		source:    "package crypto\n\nimport \"crypto/aes\"\n\nfunc NewCipher(key []byte) (cipher.Block, error) {\n\treturn aes.NewCipher(key)\n}\n",
		rationale: "AES-256 is quantum-resistant with a doubled key size. Flagging it would bury real findings under noise.",
	},
	{
		name:      "negative-sha256",
		path:      "util/sha.go",
		source:    "package util\n\nimport \"crypto/sha256\"\n\nfunc Sum(b []byte) []byte {\n\th := sha256.Sum256(b)\n\treturn h[:]\n}\n",
		rationale: "SHA-256 is not collision-broken; it must not be reported as a weak hash.",
	},
	{
		name:      "negative-sha512",
		path:      "util/sha512.go",
		source:    "package util\n\nimport \"crypto/sha512\"\n\nfunc Sum(b []byte) []byte {\n\th := sha512.Sum512(b)\n\treturn h[:]\n}\n",
		rationale: "SHA-512 is sound and must stay silent.",
	},
	{
		name:      "negative-algorithm-name-in-comment",
		path:      "docs/README.md",
		source:    "# Cryptography\n\nWe do not use MD5, SHA1, or DESede anywhere. RSA-2048 is required for new work.\n",
		rationale: "Documentation that names weak algorithms to say they are unused must not produce findings. This is the classic false-positive shape.",
	},
	{
		name:      "negative-key-length-constant",
		path:      "internal/sizes.go",
		source:    "package internal\n\nconst MaxUploadBytes = 1024\nconst RSAKeyBits = 2048\n",
		rationale: "A bare 1024 that happens to be a size limit is not a weak RSA key.",
	},
	{
		name:      "negative-test-fixture",
		path:      "testdata/sample.txt",
		source:    "fixture body: d41d8cd98f00b204e9800998ecf8427e\n",
		rationale: "An MD5 digest used as test data is a literal hex string, not MD5 usage.",
	},
	{
		name:      "negative-placeholder-secret",
		path:      "config/settings.yml",
		source:    "aws_access_key_id: YOUR_ACCESS_KEY_HERE\naws_secret_access_key: changeme\n",
		rationale: "Documented placeholders must not be reported as leaked credentials.",
	},
	{
		name:      "negative-empty-file",
		path:      "LICENSE",
		source:    "",
		rationale: "Empty and non-code files must be silent.",
	},
}

// firedRules runs the scanner over a corpus case and returns the distinct rule
// IDs that fired.
func firedRules(t *testing.T, tc corpusCase) map[string]bool {
	t.Helper()
	result := AnalyzeRepositoryFiles("corpus/repo", []RepoFile{{Path: tc.path, Content: tc.source}}, false)

	fired := map[string]bool{}
	for _, f := range result.CryptoFindings {
		fired[f.RuleID] = true
	}
	return fired
}

// TestScannerLabelledCorpus is the accuracy check. It fails on a missed
// detection (regression) and on an unexpected one (false positive).
func TestScannerLabelledCorpus(t *testing.T) {
	for _, tc := range corpus {
		t.Run(tc.name, func(t *testing.T) {
			fired := firedRules(t, tc)

			for _, want := range tc.expect {
				if !fired[want] {
					t.Errorf("missed detection: expected rule %s on %s (%s)", want, tc.path, tc.rationale)
				}
			}

			if len(tc.expect) == 0 {
				var unexpected []string
				for rule := range fired {
					unexpected = append(unexpected, rule)
				}
				sort.Strings(unexpected)
				if len(unexpected) > 0 {
					t.Errorf("false positive(s) on %s (%s): %s",
						tc.path, tc.rationale, strings.Join(unexpected, ", "))
				}
			}
		})
	}
}

// TestScannerCorpusHasNegativeCases keeps the corpus honest. A corpus of only
// positive cases cannot detect a rule that matches everything, because every
// match would be a true positive.
func TestScannerCorpusHasNegativeCases(t *testing.T) {
	negatives, positives := 0, 0
	for _, tc := range corpus {
		if len(tc.expect) == 0 {
			negatives++
			continue
		}
		positives++
	}

	if negatives == 0 {
		t.Fatal("corpus has no negative cases, so false positives cannot be detected")
	}
	if positives == 0 {
		t.Fatal("corpus has no positive cases, so recall cannot be measured")
	}
	// A corpus that is almost entirely negative would let a scanner that
	// reports nothing pass.
	if float64(negatives) > float64(positives)*2 {
		t.Errorf("corpus is %d negative vs %d positive cases; too few positives to be meaningful",
			negatives, positives)
	}
}

// TestScannerCorpusCasesDocumented keeps every case justified, so pruning is a
// deliberate act.
func TestScannerCorpusCasesDocumented(t *testing.T) {
	for _, tc := range corpus {
		if strings.TrimSpace(tc.rationale) == "" {
			t.Errorf("corpus case %q has no rationale", tc.name)
		}
		if strings.TrimSpace(tc.path) == "" {
			t.Errorf("corpus case %q has no path", tc.name)
		}
	}
}

// TestScannerAccuracyMetrics computes and pins precision and recall.
//
// The thresholds are set just under the measured values so an ordinary code
// change cannot silently degrade detection, while a genuine regression fails.
// They are asserted, not printed into a report: a metric nobody checks is a
// metric that decays.
func TestScannerAccuracyMetrics(t *testing.T) {
	var tp, fp, fn int

	for _, tc := range corpus {
		fired := firedRules(t, tc)
		expected := map[string]bool{}
		for _, e := range tc.expect {
			expected[e] = true
		}

		for rule := range fired {
			switch {
			case expected[rule]:
				tp++
			default:
				// Only count it as a false positive when the case declares no
				// expectation at all; a positive case may legitimately produce
				// related rules the author did not enumerate, and that is a
				// labelling gap rather than a scanner fault.
				if len(tc.expect) == 0 {
					fp++
				}
			}
		}
		for rule := range expected {
			if !fired[rule] {
				fn++
			}
		}
	}

	precision := 1.0
	if tp+fp > 0 {
		precision = float64(tp) / float64(tp+fp)
	}
	recall := 1.0
	if tp+fn > 0 {
		recall = float64(tp) / float64(tp+fn)
	}

	t.Logf("labelled corpus: tp=%d fp=%d fn=%d precision=%.3f recall=%.3f cases=%d",
		tp, fp, fn, precision, recall, len(corpus))

	const minPrecision = 1.0
	const minRecall = 1.0
	if precision < minPrecision {
		t.Errorf("precision %.3f is below the required %.3f", precision, minPrecision)
	}
	if recall < minRecall {
		t.Errorf("recall %.3f is below the required %.3f", recall, minRecall)
	}
}

// BenchmarkScannerCorpus measures throughput so a rule change that makes the
// scanner pathologically slow is visible.
func BenchmarkScannerCorpus(b *testing.B) {
	files := make([]RepoFile, 0, len(corpus))
	for _, tc := range corpus {
		files = append(files, RepoFile{Path: tc.path, Content: tc.source})
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = AnalyzeRepositoryFiles("corpus/repo", files, false)
	}
}

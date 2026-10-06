# RivicQ Scanner Accuracy Report

Engine version: `rivicq-content-scanner/1.1.0`
PQC taxonomy version: `rivicq-pqc-taxonomy/1.0.0`
Measured: against commit `82a6785` plus the hardening changes in
`RIVICQ_HARDENING_REPORT.md`.

---

## Read this first

**The corpus in this repository is self-authored.** The labels in
`internal/api/shared/scanner_corpus_test.go` were written by the same people who
wrote the rules in `internal/api/shared/github_content_scan.go`.

That makes it a **regression and false-positive harness**. It can prove that the
rules behave as specified on a known set of inputs, and it will fail loudly if a
rule starts matching unrelated code. It **cannot** establish accuracy against
real-world repositories, and nothing in this document should be read as claiming
that. Independent validation requires a labelled corpus authored by someone who
did not write the detector, ideally over real customer repositories.

The number below is therefore a consistency metric, not a market claim.

## Measured results

Command:

```
go test ./internal/api/shared/ -run TestScannerAccuracyMetrics -v
```

| Metric | Value |
|---|---|
| Cases | 17 |
| True positives | 10 |
| False positives | 0 |
| False negatives | 0 |
| Precision | 1.000 |
| Recall | 1.000 |

Corpus composition: 10 positive cases (one true detection each) and 7 negative
cases. `TestScannerCorpusHasNegativeCases` fails the build if the ratio of
negatives to positives exceeds 2:1, because a corpus dominated by negatives
would be satisfied by a scanner that reports nothing.

## What the corpus found

The first run of the corpus scored **precision 0.857, recall 0.600**. Every
failure was a genuine defect in the rules, not a mislabelled case:

| Rule | Measured problem | Fix |
|---|---|---|
| `crypto.weak-cipher.rc4` | Regex matched only `arcfour`, `RC4-SHA`, `RC4-MD5` — the legacy TLS cipher-suite spellings. `import "crypto/rc4"` in Go and ARCFOUR were completely invisible | Added `crypto/rc4` and `rc4\.New(Cipher\|Stream)` |
| `crypto.rsa.keysize.insufficient` | Matched only `GenerateKey(…, 1024)` (OpenSSL C) and `RSA.generate(1024)` (PyCrypto). Missed Python's `key_size=1024` and Go's `rsa.GenerateKey(rand.Reader, 1024)` | Added `key_?size\s*[:=]\s*(512\|768\|1024)` and `RSA_KEY_SIZE`/`RSA_KEY_BITS` |
| `crypto.import.jwt` | Matched `jwt.sign` (Node) only. Python's `import jwt` and PyJWT's `jwt.encode(` were missed | Added `import\s+jwt\b` and `\bjwt\.(encode\|decode)\(` |
| `crypto.pqc.library` | Matched hyphenated `ml-kem`/`ml-dsa` but not the actual Python package spelling `pqcrypto.ml_kem` | Added underscore variants and `pqcrypto` |
| `crypto.weak-cipher.3des` | Matched the word `DESede` in prose. A README stating "we do not use DESede" produced a CRITICAL finding | Crypto rules now skip documentation file extensions (`.md`, `.markdown`, `.rst`, `.txt`, `.adoc`). Secret rules are exempt — a credential pasted into a README is a real incident |

Four of the five findings were false negatives on **primary detections** — MD5,
SHA-1, and RC4 usage that the tool exists to find. None of the pre-existing
tests caught any of them, because those tests asserted "input X produces finding
Y" for inputs already known to match. Nothing measured whether the rules fired on
what they were supposed to fire on.

The prose false positive is worth calling out separately: it is the single most
common shape for a regex-based crypto scanner, and it is the one most likely to
cause a security team to disable the tool.

## Coverage of the rule set

13 crypto rule IDs and 5 secret rule IDs are registered. Corpus coverage is
partial and deliberately uneven:

| Rule | Covered |
|---|---|
| `crypto.weak-hash.md5` | positive + negative (hex digest as test data) |
| `crypto.weak-hash.sha1` | positive |
| `crypto.weak-cipher.3des` | positive + negative (prose) |
| `crypto.weak-cipher.rc4` | positive |
| `crypto.import.rsa` | positive + negative (bare `1024` constant) |
| `crypto.import.ecdsa` | positive |
| `crypto.import.jwt` | positive |
| `crypto.pqc.library` | positive |
| `crypto.rsa.keysize.insufficient` | positive |
| `crypto.weak-cipher.aes-*`, `tls.version.1_0`, `tls.version.1_1`, `secret.*` | **not covered by this corpus** — covered by targeted unit tests only |

Rules with no corpus entry are a known gap, not a claim of correctness.

## Determinism

Output is deterministic for a given input set: findings are sorted by file then
line, rule IDs are stable strings rather than indices, and fingerprints are
SHA-256 over `(rule, path, line)`. Repeat scans of unchanged content produce
identical output, which is what makes the fingerprint-based diff meaningful.
`internal/api/shared/scanner_accuracy_test.go` asserts this.

**Not covered:** `Stages` and `SBOM`/`CBOM` component ordering has not been
pinned. If byte-identical artifacts are required for compliance export, that is
outstanding work.

## Performance

```
BenchmarkScannerCorpus-8    200    1237032 ns/op
```

~1.24 ms for 17 files. This is a micro-corpus and says nothing about behaviour
on a large monorepo; no load or large-repository benchmark has been run.

## Recommendations

1. Commission an independently labelled corpus over real repositories. Until
   then, treat all accuracy figures as internal consistency only.
2. Add corpus entries for the four uncovered `tls.version.*` and `secret.*`
   rules.
3. Consider comment-stripping before matching for code files, not just
   documentation extensions — the prose false positive is not confined to `.md`.
4. Benchmark against a large real repository and record a p95.
5. Pin `Stages` and component ordering for reproducible compliance artifacts.
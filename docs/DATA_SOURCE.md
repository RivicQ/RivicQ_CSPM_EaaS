# Data Sources: Where RivicQ Facts Come From

This document inventories where scanning data, fixtures, and reference data originate, their provenance and licensing, and refresh cadence. Data minimization and synthetic-fixture rules are governed by `DATASETS.md`, `docs/KNOWN_LIMITATIONS.md`, and `PRIVACY.md`.

## 1. Scanner-produced data (live)

| Source | Mechanism | Files |
|---|---|---|
| TLS endpoints | Outbound TLS connection against an allow-listed host/port; policy blocks private, loopback, and cloud-metadata destinations | `internal/discovery/tls_scanner.go`, `target_policy.go`, `safe_dial.go` |
| SSH | SSH banner + cipher list probe; port 22/2222 only | `internal/discovery/ssh_scanner.go` |
| HTTP/HTTPS | Single GET of `/?data=test` reading up to 1 KiB; MD5-response detection and security-header checks (HSTS, XCTO, XFO, CSP, cookies). User-Agent `RivicQ-CryptoBOM-Scanner/1.0` | `internal/discovery/http_scanner.go` |
| Local SBOM / path scan | Reads dependency manifests under an allow-listed root, maps cryptographic libraries to CBOM components via `cryptoLibraries` profile map | `internal/discovery/sbom_scanner.go`, `ScanDirectoryForSBOM` |
| GitHub repository content | GitHub REST API tree + file contents for up to 40 (80 deep) "interesting" files per repo using `GITHUB_TOKEN`; file content capped at 512 KiB | `internal/api/shared/github_scanning.go` |
| GitHub webhook | HMAC-SHA256 signed push/PR deliveries, replay-protected, 8 MiB body cap, 4-way scan concurrency | `internal/api/shared/github_scanning.go` |
| Declared inventory | k8s pod / hardware / QSIC catalog entries supplied by the operator (not probed live) | `internal/discovery/demo_targets.go`, `internal/hardware/catalog.go` |
| Cloud connectors (Enterprise) | AWS (EC2/EKS/KMS/RDS/S3/CloudHSM/CloudTrail), Azure resource managers, GCP compute/container/storage, IBM Cloud HPCS — only with customer credentials | `internal/awscloud/`, `internal/azurecloud/`, `internal/gcpcloud/`, `internal/ibmcloud/` |
| Optional PATH tools | Syft, Trivy, Grype, Gitleaks, OSV Scanner run against local scans when installed (`RIVICQ_EXTERNAL_TOOLS=0` disables) | `internal/intelligence/adapters_external.go`, `docs/INTEGRATIONS.md` |

## 2. Reference / knowledge data

| Dataset | Purpose | Location |
|---|---|---|
| `cryptoLibraries` profile map | Package/library name to algorithm, risk, PQC status, BSI reference | `internal/discovery/sbom_scanner.go` |
| Default policies | RSA >= 2048, no MD5/SHA-1 for security, TLS >= 1.2, no 3DES/RC4, CISA KEV + CVE BLOCK, PQC WARN, secret patterns | `internal/intelligence/policy.go` |
| PQC taxonomy | Local classical classification (ML-KEM/ML-DSA/SLH-DSA) with version string | `internal/intelligence/pqc_class.go`, `internal/quantum/qiskitprofile` |
| CVE overlay | Exact package-version matching to advisories; rejected NVD entries are not treated as vulns | `docs/KNOWN_LIMITATIONS.md` |
| Embedded/identity profiles | Vendor-neutral domain detector profiles (embedded/*, identity/*) | `internal/profile/builtin.go`, `internal/firmware/analyze.go`, `internal/identity/identity.go` |
| Compliance mappings | DORA Art. 9(2), eIDAS 2.0 ETSI TS 119 312, BSI TR-02102, ISO/NIST control mappings | `internal/compliance/engine.go`, `internal/controls/checklists.go`, `docs/SECURITY_CONTROL_MATRIX.md` |

All compliance/data mappings are **mappings, not certifications**; framework names in the UI reference operator guidance only.

## 3. Fixtures and synthetic datasets

Location: `fixtures/` and `datasets/`.

| Tree | Content | Usage |
|---|---|---|
| `fixtures/vulnerable-go|node|java|python|crypto-test|terraform-test` | Intentional weak-crypto samples | Scanner regression + dataset harness |
| `fixtures/vulnerable-container` | Dockerfile/image samples | Container scan tests |
| `fixtures/partners/infineon` | Synthetic firmware images for embedded static analysis | `rivicq firmware scan` POC, `scripts/poc/partner_artifact_analysis.sh` |
| `fixtures/partners/gd` | Synthetic certificate/identity artifacts | `rivicq identity scan` |
| `datasets/known-bad/{crypto-go,node-sca,terraform}` | `expected.json` describing findings that must appear (`must_match`, `min_findings`) | `make analyze-datasets` |
| `datasets/known-good/self-scan` | Eigen-scan asserting no BLOCK (`max_block`) | CI self-scan gate |
| `datasets/containers/openssl-sample` | Sample `expected.json` for container images | Dataset harness |
| `web/src/data/`, `web/src/demo/` | Synthetic dashboard/graph data for the labeled demo | GitHub Pages / demo session |

Rules (from `DATASETS.md`, `README.md`):

- Fixtures are synthetic. No production keys, tokens, PII, or customer hostnames.
- `expected.json` fields: `license` (SPDX), `sensitive` (must be `false`), `source`, `include_fixtures`, `must_match`/`must_not_match`, `min_findings`, `max_block`.
- `must_match` values are taken from actual scanner output; never invent CVEs.
- Fixture and `testdata/` directories are excluded from default `rivicq scan .` so the engine does not fail its own self-scan (`internal/intelligence/policy.go` `defaultExcludes`).

## 4. Provenance and licensing

- Fixtures in this repository are Apache-2.0 unless a nested `LICENSE` says otherwise; third-party samples require an explicit license file in the dataset folder (`DATASETS.md`).
- Companion GitHub Pages demo content (`fabric/`) uses synthetic Northbridge Exchange data only and never renders secret values.
- OpenTelemetry, SBOM/SLSA artifacts produced in CI are generated from the repo itself; image SBOMs are produced by Syft (`anchore/sbom-action`) in `.github/workflows/ci-cd.yml`.
- Live cloud/GitHub data has provenance from the provider API (repo path, commit SHA, cloud account id) recorded in scan results (`GHScanResult.CommitSHA`, `cloud_accounts.account_id`).

## 5. Refresh cadence

| Data | Cadence | Trigger |
|---|---|---|
| Live scans (TLS/SSH/HTTP/SBOM/GitHub) | On-demand | API/CLI/GitHub Action; one-shot results, no scheduler today (scheduled scanning is a roadmap item per `docs/ROADMAP.md`) |
| GitHub webhook scans | Per push/PR delivery | `POST /api/v1/github/webhook` |
| CVE / PQC knowledge | Versioned at runtime | Pinned `pqc_taxonomy_version` / `engine_version` on scan results; no live feed dependency |
| Dataset harness `expected.json` baselines | Repo-driven | Updated in PRs when detectors change; `make analyze-datasets` |
| Benchmark baseline | On "schedule" or `[benchmark]` commit | `tests/benchmark-baseline.json`, updated by `.github/workflows/update-benchmark-baseline.yml` + `scripts/compare_benchmarks.py` |

## 6. Data minimization and retention

- HTTP scanner reads at most 1 KiB of response body; GitHub file content capped at 512 KiB; webhook bodies capped at 8 MiB; firmware/identity artifacts capped by `internal/firmware/limits.go`.
- Gitleaks findings never include secret values; identity analysis never emits private keys, SIM, or secure-element secrets.
- Audit events retain request metadata (ip, user agent, actor) tenant-scoped for Enterprise audit viewer; retention policy is operator-managed.
- Demo mode data is fabricated, in-memory, and ephemeral; it never passes `/readyz`.
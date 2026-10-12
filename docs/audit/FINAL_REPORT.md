# RivicQ CSPM — Repository Audit: Final Report

Date: 2026-10-12. Audited commit: `1fa09106f5439798b96d2858c8db9ca147b6f95b`
(branch `cursor/cspm-enterprise-boms-86cc`), plus the fixes on this branch.

Purpose: a defensible technical evaluation for **G+D** and **Infineon**. Every
claim here is backed by a command that was run or a file that was read; nothing
is copied from marketing.

## Headline result

The repository **builds, vets, and tests green**, the CBOM/DevSecOps/partner
vertical slices **run end to end on synthetic fixtures**, and tenant isolation is
**enforced and tested**. Two substantive defects were found and fixed; the
remaining gaps are documented honestly rather than papered over.

## What was verified (evidence)

| Area | Result |
|---|---|
| `go build ./...` / `go vet ./...` | PASS |
| `go test ./... -count=1` | 27 packages ok, 0 fail (385 test funcs) |
| `golangci-lint run ./...` | 19 pre-existing issues (errcheck/ineffassign/staticcheck/unused) |
| `web` type-check / lint / tests | PASS / PASS / 11 suites, 27 tests |
| CBOM golden corpus (`make analyze-datasets`) | **7/7 pass** |
| Policy gate + exit codes | BLOCK→1, clean→0, usage→2 (verified) |
| Firmware/identity/compare on partner fixtures | PASS (real output captured) |
| Tenant isolation (`tests/*isolation*`) | PASS (incl. new `/report` test) |

## Defects found and fixed on this branch

1. **P0 — build break from a scaffold.** `integrations/stripe/server/stripe.go`
   declared `successURL`/`cancelURL` but only used them in comments, so
   `go build ./...` failed. Fixed (values surfaced in the response); build green.

2. **CBOM components were empty (High for evaluations).**
   `internal/intelligence/cyclonedx.go` accepted a `findings` argument it never
   used, and the content-scan path supplies no discovery components, so the
   embedded CycloneDX BOM shipped with `components: []`. Findings that name an
   algorithm are now folded into `components` (deduped, library-presence-only
   records excluded), `serialNumber` is a real `urn:uuid:<v4>`, and the tool
   version is `ScannerVersion`. Verified: `components` **0 → 5** for the weak
   fixture. Regression test added.

3. **Golden corpus was not enforced in CI.** Added a `datasets` job to
   `.github/workflows/ci.yml` that builds `bin/rivicq` and runs
   `scripts/analyze-datasets.py` (fails on any `must_match`/`must_not_match`/
   `min_findings`/`max_block` regression).

4. **Added Phase 2 corpus coverage.** New fixtures/datasets:
   `fixtures/crypto-test-ec` (ECDSA + PQC identifiers) and `fixtures/malformed`
   (negative/robustness — arbitrary binary: 0 findings, no crash, no BLOCK).

5. **Added Phase 6 coverage.** `TestScanReportIsTenantScoped` asserts a
   cross-tenant `/scans/:id/report` returns 404.

## Findings documented, not fixed (by design)

- **19 lint issues** (pre-existing) — hygiene PR.
- **CLI flag-value validation** — `--fail-on BOGUS`/`--format bogus` exit 0
  instead of 2.
- **Weak Helm default passwords** (`postgresPassword: "cryptobom123"`,
  `adminPassword: "cryptobom-admin"`) surfaced as WARN.
- **No scheduler/retry/backoff**; **no automated backup/restore**;
  **`govulncheck` not in CI**; **`internal/database` untested**.
- **No SSO/IdP**; do not claim it.
- **Team/Graph BOM is a flat multi-layer view**, not a provenance/relationship
  graph (no stable IDs/edges) — see GRAPH_BOM.md.
- Historical encrypted SSH keys remain in git history → rotate (owner decision).

## Classification summary

- **Real + tested:** static crypto SAST, secrets, SBOM/CBOM generation, IaC,
  compliance mapping, policy gate, PQC classification, firmware static analysis,
  device identity, auth/authn (JWT/bcrypt/TOTP), RBAC, multi-tenancy, editions.
- **Partial:** SCA, container scan, hardware attestation, unified BOM, DB,
  observability, scheduling.
- **Connector-dependent (unverified here):** AWS/Azure/GCP/IBM connectors,
  Kubernetes/Cilium.
- **Demo-only:** `integrations/*` pivot scaffolds (inert); `fabric` graph data.
- **Not implemented:** SSO/IdP, firmware execution/key extraction (out of scope),
  auto key-rotation.

## Guardrails upheld

No firmware execution, flashing, or key extraction; no silicon/RE claims; no
"auto key rotation"; compliance mappings presented as mappings, not
certifications; all partner fixtures synthetic; no real secrets used.

## Change list (this branch)

- `internal/intelligence/cyclonedx.go` (+ `cyclonedx_test.go`) — populate CBOM.
- `.github/workflows/ci.yml` — enforce the CBOM golden corpus.
- `tests/scan_tenant_isolation_test.go` — cross-tenant report test.
- `integrations/stripe/server/stripe.go` — fix build break.
- `fixtures/crypto-test-ec/`, `fixtures/malformed/`,
  `datasets/known-bad/crypto-ec/`, `datasets/known-good/malformed/`.
- `docs/audit/*` (BASELINE, TEST_RESULTS, FEATURE_MATRIX, SECURITY_FINDINGS,
  CBOM_CORRECTNESS, DEVSECOPS_VERIFICATION, SECURITY_TENANCY, RELIABILITY,
  GRAPH_BOM, FINAL_REPORT), `docs/partners/GD_VALIDATION.md`,
  `docs/partners/INFINEON_VALIDATION.md`.

## Recommended next steps (priority order)

1. Wire `govulncheck` + fix the 19 lint issues.
2. Add scheduler + bounded retry/backoff for scans (enterprise reliability).
3. Backup/restore runbook + script, and `internal/database` tests.
4. Explicit cross-tenant negative tests for api-keys/connectors/graph.
5. Provenance model for the unified BOM if traceability is a partner gate.
6. Rotate the historically committed SSH keys.

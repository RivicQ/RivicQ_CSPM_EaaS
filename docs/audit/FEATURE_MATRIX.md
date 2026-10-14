# Feature matrix

Classification is from **source + commands in this session**, not marketing copy.

Legend: **T** tested · **I** implemented, thin tests · **P** partial · **C** connector-dependent · **D** demo/synthetic · **N** not implemented.

| Capability | Class | Evidence |
|---|---|---|
| Content SAST (regex crypto rules) | **T** | `internal/api/shared/github_content_scan.go`; labelled corpus; CLI fixtures |
| Secrets (placeholder-aware) | **T** | `secretRules`; terraform fixture AKIA example |
| SCA (lockfile advisories) | **P** | npm/go.mod/requirements parsers; lodash fixture; no live OSV unless tool on PATH |
| SBOM | **T** | scan JSON `summary.sbom`; CycloneDX app SBOM is **not** a full Syft document unless Syft is on PATH |
| CBOM (CycloneDX 1.6 crypto-asset) | **T** | `CycloneDXBOM` + `ValidateCycloneDX`; crypto-test → 5 components |
| Library presence vs confirmed usage | **T** | `presence_kind`; RSA import vs `crypto.rsa.keysize.insufficient` |
| Inventory of AES/SHA-256/TLS1.2+/X.509 | **T** | golden fixtures; policy skips `inventory` |
| ECDH / X25519 / FF-DH / ssh-rsa | **T** | new rules + golden/corpus |
| IaC (Terraform CIDR/ACL) | **T** | `fixtures/terraform-test` |
| Container Dockerfile | **P** | USER root / EXPOSE 22 only |
| Policy gate BLOCK/WARN/ALLOW | **T** | `internal/intelligence/policy.go`; CLI exit 1 on BLOCK |
| CLI flag validation | **T** | invalid `--fail-on`/`--format` → exit 2 |
| PQC taxonomy | **T** | `rivicq-pqc-taxonomy/1.0.0`; RSA-2048 = `migration_required`, not auto-BLOCK |
| Firmware static analysis | **T** | `internal/firmware` + Infineon fixtures |
| Identity / X.509 parse | **T** | `internal/identity` + G+D PEMs |
| Unified BOM view | **P** | `internal/bom`; Q/H/AI/I layers license-gated |
| RivicQ Graph (`fabric/`) | **D** | Synthetic Northbridge fixture; not live scan graph |
| Archify | **I** | Static `archify/site` + `archify/diagrams`; not a runtime tool in CI |
| REA | **N** | No module, package, or API named REA in this repository |
| JWT / bcrypt / TOTP | **T** | `internal/authn` tests |
| RBAC | **T** | `internal/auth` tests |
| Tenant isolation | **T** | `internal/tenant`, `internal/api/enterprise` tenancy tests, `tests/scan_tenant_isolation_test.go` |
| Cloud connectors | **C** | `internal/{aws,azure,gcp,ibm}cloud` — **no tests**, credentials required |
| SSO / SAML ACS | **N/P** | Config store exists; IdP handshake **not** E2E tested |
| Production key rotation | **N** | Must not be claimed |
| Firmware execution / SE key extract | **N** | Out of scope; CLI banners say so |

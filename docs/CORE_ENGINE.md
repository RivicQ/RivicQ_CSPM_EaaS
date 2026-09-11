# RivicQ CBOM / Crypto-CSPM core

This is the production engine contract. It describes **what the code does today**, not a roadmap.

RivicQ is **not** labelled Enterprise Ready. See [ENGINEERING_AUDIT.md](ENGINEERING_AUDIT.md) and the gate list at the end of this file.

## Architecture boundaries

```
Web (React)  →  API /api/v1  →  AuthN (JWT) + AuthZ (server RBAC)
                              →  Tenant (JWT tenant_id)
                              →  Discovery scanners (tls/ssh/http/sbom)
                              →  Intelligence (normalize → fingerprint → risk → policy → PQC class)
                              →  CBOM (CycloneDX 1.6)
                              →  CLI (rivicq scan .)
```

| Component | Path | Allowed to contain |
|---|---|---|
| Web | `web/` | Presentation. Not authorization. |
| API | `internal/api/` | HTTP, validation, tenancy lookup. Not crypto scoring. |
| AuthN | `internal/auth` | Passwords, JWT, MFA, OAuth. |
| AuthZ | `internal/auth.RequireRole` | Server-side role checks. |
| Tenant | `internal/tenant` | JWT `tenant_id`. `X-Tenant-ID` is ignored. |
| Scanner | `internal/discovery` | Deterministic probes. UUIDs are per-scan instance IDs. |
| Detection | `internal/api/shared/github_content_scan.go`, PATH tools | Rules/parsers. Not an LLM. |
| CBOM | `internal/intelligence` CycloneDX | Deterministic BOM from components + findings. |
| Risk | `ScoreCrypto` | Explainable factor list. |
| Policy | `Evaluate` | BLOCK / WARN / ALLOW. |
| Reporting | intelligence `Report` | Findings + gate + PQC + Qiskit taxonomy. |
| Integrations | optional PATH + cloud connectors | Empty when credentials missing. |
| Audit | Enterprise `GET /audit/events` | JWT tenant. Empty without Enterprise DB. |
| Observability | `/healthz` `/readyz` request IDs | Not traces/SLO alerts. |

Business logic for crypto risk lives in `internal/intelligence`, not in React.

## Finding identity

Normalized findings use `fingerprint` = SHA-256 of scanner, rule, algorithm, key length, location, line, CVE, component, compacted evidence.

`id` is `rvq-` plus the first 16 hex characters. Scanner UUIDs are kept as `labels.instance_id`. `DedupFindings` merges repeats so a second scan of the same evidence does not create a second open finding in the intelligence report.

`discovery.ScanResult` JSON is unchanged (per-scan UUIDs remain on the discovery contract).

## PQC classes

| Class | Meaning |
|---|---|
| `pqc-ready` | NIST PQC primitive in the local taxonomy (ML-KEM / ML-DSA / SLH-DSA). Not CAVP. |
| `hybrid-ready` | Grover-sized symmetric/hash or hybrid marker. |
| `migration-required` | Shor-class (RSA-2048+, ECDSA, ECDH, DH). RSA-2048 is **classified**, not auto-vulnerable. |
| `high-risk` | Broken classically (MD5, SHA-1, RC4, 3DES, RSA &lt; 2048, TLS &lt; 1.2). |
| `unknown` | No mapped algorithm. |

Do not claim quantum safety unless `quantum_safe` is true **and** the class is `pqc-ready`.

## CLI

```
rivicq scan .
rivicq scan . --fail-on critical
rivicq scan . --fail-on high
```

Exit 0 pass, 1 fail-on, 2 usage. GitHub Action example: [examples/github-actions/](../examples/github-actions/).

## RBAC (server)

Persisted JWT roles remain `viewer | analyst | operator | admin`.

Aliases (normalized before compare): Owner/Administrator/Security Manager → admin; Security Analyst → analyst; Developer → operator. Frontend hiding a button is not authorization.

## Not in this core (do not build yet)

HBOM, IBOM, AIBOM, Q-BOM engines, QKD, live Stripe, IBM Partner Plus APIs, mailbox password reset, live SAML ACS.

## Enterprise gate (unchecked)

This product must not be labelled **RIVICQ ENTERPRISE READY** until the checklist in ENGINEERING_AUDIT.md is demonstrably true. It is not true today.

# RivicQ CSPM Backend Implementation Plan

## Phase 1: OSS startup hardening
- Ensure OSS auth boots without manual env setup.
- Use a default bootstrap identity for local OSS installs.
- Keep registration open when `AUTH_ALLOWED_DOMAINS` is unset.
- Verify GitHub scanning routes remain enabled in OSS.

## Phase 2: Core engine stability
- Keep CBOM scanner orchestration in `internal/discovery`.
- Normalize scan outputs into canonical asset and finding records.
- Persist scan jobs, results, and audit events in PostgreSQL.

## Phase 3: Security and compliance
- Keep JWT + RBAC + tenant scoping in the API layer.
- Add versioned policy packs for DORA, NIS2, BSI TR-02102, eIDAS 2.0, NIST PQC, and SOC 2.
- Emit auditable events for login, register, scan, attestation, and repo scan actions.

## Phase 4: Enterprise integrations
- Replace mock quantum attestation with IBM Quantum-backed providers.
- Add cloud HSM adapters for AWS, GCP, and IBM.
- Expand GitHub repository scanning for orgs, webhooks, and scheduled scans.

## Phase 5: Scale and operations
- Move long-running scans to workers and background jobs.
- Cache dashboard rollups in Redis.
- Add OpenTelemetry, rate limits, and CI security gates.

## Repo-specific file map
- `cmd/server/oss/main.go` - OSS entrypoint
- `internal/api/oss/handlers.go` - OSS route setup and bootstrap auth
- `internal/auth/store.go` - bootstrap users and registration policy
- `internal/api/shared/github_scanning.go` - GitHub repo scanning
- `internal/compliance/engine.go` - compliance rules
- `internal/quantum/*` - quantum attestation and PQC planning
- `internal/database/database.go` - schema and connection management
- `internal/middleware/*` - security, audit, tracing, rate limiting
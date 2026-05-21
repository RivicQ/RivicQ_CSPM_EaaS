Post-Quantum Cryptography (PQC) Migration Plan
=============================================

Status overview
- Project edition: Open Source (OSS) — server, tests, and frontend build pass.
- Enterprise features (IBM Quantum-backed attestation) are implemented as a provider but currently mocked in `core-engine/providers/ibmq/ibm_quantum_client.go`.
- Current completion: core infra and UX for PQC analysis exist; real IBM API calls and CI-safe tests are pending.

Goals
- Provide clear, executable plan to migrate cryptographic systems to post-quantum algorithms (PQC).
- Deliver reproducible tooling, tests, and documentation for OSS and Enterprise users.

High-level phases
1. Discovery & Assessment (done / partial)
   - Inventory crypto algorithms and key sizes (implemented in discovery).
   - Produce CBOM reports containing `IBMQuantumScore` field (exists).
2. Risk Analysis & Recommendations (done / partial)
   - Provider-based risk scoring (mocked IBM provider implemented).
   - Generate recommended PQC algorithms and migration timelines (mocked logic in provider).
3. Validation & Proof (in progress)
   - Integrate with real IBM Quantum API to validate attestation results (requires `IBMQ_API_KEY`).
   - Add CI mocks so PRs do not require live IBM credentials.
4. Migration Toolkit (next)
   - Scripts to rotate keys, replace RSA/ECC keys with PQC alternatives (Kyber, Dilithium), and validate interoperability.
   - Migration playbooks for production HSMs (AWS CloudHSM, IBM HPCS, GCP KMS).
5. Monitoring & Verification (next)
   - Add runtime checks in health endpoints to surface PQC migration status.
   - Continuous scans and CBOM regeneration to track migration progress.

Key deliverables (short-term)
- `docs/PQC_MIGRATION.md` (this file)
- CI mocks for IBMQ provider to allow PRs without secrets
- Real IBMQ client implementation in `core-engine/providers/ibmq` (non-blocking: fall back to mocks)
- Migration scripts and example playbooks in `scripts/` and `deploy/`

Required secrets & environment vars
- `IBMQ_API_KEY` — required for live IBM Quantum calls (Enterprise only)
- `IBM_CLOUD_API_KEY`, `IBM_HPCS_INSTANCE` — for IBM cloud/HSM features
- `AUTH_ALLOWED_DOMAINS`, `JWT_SECRET` — for production auth enforcement

Immediate next actions (pick priority)
- Priority A (OSS-focused):
  - Remove remaining demo markers from frontend and docs (`web/` files).
  - Document required auth env vars for CI/deploy (create `docs/DEPLOY_ENV.md`).
- Priority B (Enterprise-focused):
  - Implement real IBM API calls in `core-engine/providers/ibmq/ibm_quantum_client.go` and unit tests.
  - Add CI mocks/stubs for IBMQ provider and add a workflow matrix for `ibmq: mock|real`.

How to run locally with Enterprise+IBMQ (developer steps)
1. Export IBM credentials locally (DO NOT commit):

```bash
export IBMQ_API_KEY="your_real_ibmq_api_key"
export IBM_CLOUD_API_KEY="your_ibm_cloud_key"
export IBM_HPCS_INSTANCE="your_hpcs_instance"
export JWT_SECRET="change-this-in-prod"
export AUTH_ALLOWED_DOMAINS="example.com"
```

2. Start enterprise edition and verify IBMQ status:

```bash
./run-edition.sh enterprise start
./run-edition.sh status
./validate.sh
```

3. Run targeted IBMQ provider tests (when implemented):

```bash
go test ./core-engine/providers/ibmq -v
```

Ownership & contacts
- Core maintainers: see `MAINTAINERS.md` and GitHub team.
- For IBM integration assistance, coordinate with the Security Strategy lead (IBM Quantum contact in `Website` pages).

Notes
- The project is OSS-ready for production use without Enterprise IBM features. Enterprise enhancements are optional but recommended for hardware-backed attestation workflows.

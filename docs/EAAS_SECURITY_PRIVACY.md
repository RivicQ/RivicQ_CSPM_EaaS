# EaaS security & privacy

Evidence-based description of what the standalone EaaS service protects, what it stores, and what it does not do. Sources: `internal/eaas/crypto.go`, `internal/eaas/service.go`, `internal/eaas/store.go`, `internal/eaas/http.go`, `cmd/eaas/main.go`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`.

Companions: [Product status](EAAS_PRODUCT_STATUS.md) · [API](EAAS_API.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Limitations](EAAS_LIMITATIONS.md)

## Cryptographic implementations

| Primitive / operation | Library | Status | Notes |
|---|---|---|---|
| AES-256-GCM encrypt/decrypt | Go standard library (`crypto/aes`, `crypto/cipher`) | Beta implemented | Fresh `crypto/rand` nonce per encryption; tampering with ciphertext or AAD fails closed with `E_DECRYPT_FAILED` (`internal/eaas/crypto.go:126-153`) |
| HMAC-SHA-256 sign/verify | Go standard library (`crypto/hmac`, `crypto/sha256`) | Beta implemented | Constant-time `hmac.Equal`; this is a MAC, not a digital signature (`internal/eaas/crypto.go:155-169`) |
| SHA-256 digest | Go standard library | Beta implemented | Unkeyed (`internal/eaas/crypto.go:171-176`) |
| Random bytes | Go `crypto/rand` | Beta implemented | 1–1024 bytes per call (`internal/eaas/crypto.go:178-186`) |
| ML-KEM-768 (FIPS 203) keygen/encapsulate/decapsulate | `github.com/cloudflare/circl` v1.6.1 | Experimental | Labelled `Experimental` in catalogue and every response; only public keys returned (`internal/eaas/crypto.go:36-38,188-228`) |
| ML-DSA-65 (FIPS 204) keygen/sign/verify | `github.com/cloudflare/circl` v1.6.1 | Experimental | Labelled `Experimental`; signature length and public key validated (`internal/eaas/crypto.go:39-41,230-269`) |
| SLH-DSA | none | Planned | Portal says "SLH-DSA planned"; no operation implemented |

FIPS 203/204 appear as algorithm labels only. FIPS/CAVP validation of this service is **NOT_IMPLEMENTED**; the portal explicitly says it is not a certified cryptographic module (`web/eaas/index.html:70`).

## Credentials and key custody

- Passwords are hashed with bcrypt at default cost; plaintext passwords are not persisted (`internal/eaas/service.go:119-142`; `internal/eaas/store.go:34-46`). A local test asserts the password and API key do not appear in the state file (`internal/eaas/eaas_test.go:434-453`).
- API keys are shown to the caller **once** (`shown_once: true`) and stored only as SHA-256 hashes plus an 8-character-derived prefix (`internal/eaas/service.go:393-441,552-560`; `internal/eaas/store.go:65-77`). Revoked keys are rejected on authentication; rotation revokes the old key and issues a new one (`internal/eaas/service.go:466-500,537-550`).
- Bearer session tokens are stored as SHA-256 hashes and expire after 7 days; logout deletes the session hash (`internal/eaas/service.go:143-148,239-279`).
- Six-digit verification codes are stored as SHA-256 hashes, expire after 24 hours, and allow up to five failed attempts. In non-production the code is returned once at registration with a notice that email delivery is pending; in production it is omitted (`internal/eaas/service.go:124-177,189-223`).
- Server-held crypto keys (AES, HMAC, ML-KEM, ML-DSA) are generated with `crypto/rand` or the PQC library. Private bytes are base64-encoded in the sandbox JSON state (`SigningKey.PrivateB64`); public keys are returned by key creation/keygen, private bytes are **never** returned by any API response (`internal/eaas/store.go:79-89`; `internal/eaas/service.go:502-533,679-694,720-741`). This is a filesystem-protection responsibility, not HSM custody (`web/eaas/index.html:84,163`).
- Tenant identity for operations comes from the stored credential (`user_id`, `key_id`, `project_id` resolved in `AuthenticateAPIKey`), never from a client-supplied tenant header; cross-tenant keys/projects return `404` (`internal/eaas/service.go:535-560,720-741`; `internal/eaas/eaas_test.go:323-348`).

## Transport and browser controls

- Strict CORS allowlist: only exact origins from `EAAS_ALLOWED_ORIGINS` receive allow-origin/credentials headers; no wildcard and no `*` default (`internal/eaas/http.go:80-102`; `cmd/eaas/main.go:20,62-74`). `TestCORSAllowsConfiguredOriginOnly` verifies one configured origin is allowed and another is not (`internal/eaas/eaas_test.go:478-492`).
- Security headers on all responses: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` (`internal/eaas/http.go:70-78`).
- JSON bodies limited to 2 MiB (`internal/eaas/http.go:108-115`); operation inputs have additional per-field byte limits (`internal/eaas/service.go:566-718`).
- The portal stores the session token in `sessionStorage`, displays secrets in a `.secret` block, and states that API keys are shown once (`web/eaas/index.html:167,190-195,220-224`).

## Usage data privacy

Usage events record metadata only: id, user, project, key, operation, category, status, error code, latency and timestamp (`internal/eaas/store.go:91-105`; `internal/eaas/service.go:754-770`). No message, ciphertext, plaintext, signature, shared secret or key is written to a usage event (`web/eaas/index.html:84`; `internal/eaas/eaas_test.go:273-284`). The target SQL schema carries the same restriction as a comment: "never add plaintext, ciphertext, signatures or secrets" (`deploy/migrations/004_eaas_schema.sql:60-74`). The service does not log payloads or key material in the operation path (`internal/eaas/crypto.go:121-124`).

## Beta registrations

The beta form collects name, work email, organisation, role, use case, edition/deployment/integration interests and explicit consent (`internal/eaas/service.go:862-909`; `web/eaas/index.html:144-159,273-276`). Submissions are stored with status `received_pending_review` and a message that this is not an invitation or approval. Listing requires `X-Admin-Token` matching `EAAS_ADMIN_TOKEN`; without a configured token the endpoint returns `403` (`internal/eaas/http.go:374-382`; `internal/eaas/service.go:928-943`). No email delivery, marketing subscription, or CRM integration is evidenced.

## Not provided

Email delivery, Stripe/payment collection, payment webhooks, hosted deployment, production Postgres repository, HSM/KMS custody, FIPS/CAVP validation, AI operations, quantum hardware and wireless operations are **NOT_IMPLEMENTED** or **Integration pending** in the evidence scope. Plan flags named `SSO`, `HSM`, `AuditLog`, `AdvancedAnalytics` and `PQCExperimental` are display-only: no feature gate reads them in the EaaS service (`internal/eaas/plans.go:16-25`; `internal/eaas/service.go`). EaaS also has no TOTP/OAuth login path in these files; those belong to the CSPM requirements in `docs/PRD.md`.

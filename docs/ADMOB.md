# Mobile Applications and Ads: Out-of-Scope Boundary

This document records an explicit product decision: RivicQ CSPM does **not** scan mobile applications, mobile SDKs, or advertising/monetization components (for example Google AdMob). It exists so the repo has a stable answer to scope questions that repeat in PRs and issues.

## 1. What is out of scope

- Mobile app packages (APK/AAB/IPA) static or dynamic analysis.
- Mobile SDK cryptographic inventory (e.g. `com.google.android.gms:play-services-ads`, `firebase-analytics`, attribution SDKs) as a supported target class.
- Ad SDK credential / privacy-consent validation (AdMob app-ads.txt, GDPR message config, consent SDK) and any ad-quality metrics.
- Mobile device-farm or emulator scanning.

## 2. Why it remains out of scope

- The product's scan surface is deliberately bounded to server, repository, and declared infra targets (`docs/PRD.md` §4, `internal/discovery/targetclass.go`).
- Mobile/ads scanning implies store dynamics, SDK provenance, and consent data that are a separate threat model; shipping partial results here would undercut the accuracy discipline in `docs/TESTING.md` (§5).
- The repo's known-limitations policy is to state a scope gap honestly rather than implement a half-open detector (`docs/KNOWN_LIMITATIONS.md`).

## 3. Guardrails for contributions

- A PR that adds `.apk`, `.aab`, `.ipa`, or ad-SDK matching patterns is treated as scope creep and should be redirected: if the detection is real, it belongs in a roadmap proposal (see `docs/ROADMAP.md`), not in the scan engine.
- Do not add "AdMob", "play-services-ads", or consent-SDK entries to `cryptoLibraries` or default policies in `internal/discovery/sbom_scanner.go` or `internal/intelligence/policy.go`; those maps govern server/repo/library scanning only.
- Do not render ad-related metrics or consent states in the dashboard (`web/src/pages/`); the UI stays crypto/venue/certificate focused.
- Mobile artifacts that appear in fixtures or datasets must carry an explicit `LICENSE` and `synthetic: true`; they are currently not represented in `datasets/known-bad/*` on purpose.

## 4. What the repo does instead (adjacent, in scope)

| Adjacent capability | Where | Status |
|---|---|---|
| Server/repo/library SBOM + CBOM | `internal/discovery/sbom_scanner.go` | in scope |
| Container image SBOM/scan data path | `datasets/containers/openssl-sample`, CI Trivy | in scope |
| Firmware and identity (certificate) static analysis | `internal/firmware`, `internal/identity` (metadata only, no execution) | in scope, roadmap P2 connectors |
| Cloud inventory + quantum attestation | `internal/api/enterprise/` | enterprise, customer credentials |
| GitHub content scanning | `internal/api/shared/github_scanning.go` | in scope |

## 5. Future signal tracking

- Mobile/ads scanning is tracked as a **possible** future exploration, not a roadmap commitment. Any proposal must first answer: artifact ingestion rules (`fixtures/`), an `expected.json` dataset for CI, privacy policy for consent data (`PRIVACY.md`), and a separate target class in `internal/discovery/targetclass.go`.
- Until a roadmap proposal lands, issues and docs keep treating mobile apps and ads as out of scope (`docs/PRD.md` §4, this document, `docs/KNOWN_LIMITATIONS.md`).
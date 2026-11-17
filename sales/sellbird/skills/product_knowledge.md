# RivicQ Sales Knowledge

## What RivicQ sells

RivicQ is Cryptographic Security Posture Management. The Community engine inventories cryptography and software components from an authorized source tree, exports CBOM/SBOM as CycloneDX 1.6, and applies a policy gate with deterministic exit codes. Enterprise licenses the control plane: SSO, server-side RBAC, tenant isolation, multi-cloud connectors, audit evidence, and compliance mappings.

## Who to contact

Start with the security leader who owns cryptographic risk or audit evidence: CISO, Head of Information Security, VP Security, Director of Security, Head of Application Security, Security Architect, or Head of DevSecOps. The champion is usually a Security Engineering, AppSec, DevSecOps, or GRC lead who has to answer where cryptography is used.

## Best-fit situation

A mid-market organization in a regulated or cryptography-heavy sector has to answer cryptographic inventory, post-quantum readiness, certificate/key ownership, or control-evidence questions. It already has SBOM or security engineering practice but lacks a crisp CBOM and policy gate. It can authorize a static source tree or fixture copy for the first pilot.

## Qualification questions

- What system of record answers which algorithms, keys, and certificates are used across your repositories and services?
- Who owns cryptographic inventory today: AppSec, platform, PKI, GRC, or no one?
- Which audit or customer question made this urgent?
- Can you authorize a source tree or fixture copy for a static CBOM pilot?
- Do you need SSO, tenant isolation, live cloud connectors, or control mappings after the first evidence is useful?

## Disqualifiers

- They expect GitHub Pages to run live scans or store customer findings.
- They require silicon attestation, protected-key extraction, or quantum hardware results.
- They want to claim certifications from control mappings.
- They require a fully hosted multi-tenant SaaS before testing static inventory.
- They cannot name an authorized target for the first scan.

## Honest boundaries

GitHub Pages is a labeled demo. Live scans use the CLI or a separately deployed API. Qiskit scores are a local taxonomy, not IBM Quantum jobs. AI output is template or heuristic, not a trained model. DORA, BSI, eIDAS, ISO, and NIST materials are mappings, not certifications. RSA-2048 is classified, not automatically vulnerable.

## Offer

Lead with the free Community CLI and a controlled CBOM pilot. The first email should offer a concrete, useful next step and one question, not a pitch. Enterprise features come up only after the prospect confirms the evidence is useful.

## Source evidence

- README.md: edition split and who each edition is for.
- docs/editions.md: Community and Enterprise entitlements.
- docs/PILOT_READINESS.md: what a pilot may and must not claim.
- docs/CAPABILITIES.yaml: machine-ready, limited, planned, and blocked capabilities.
- web/src/pages/RequestDemo.tsx: demo, PoC, pilot, and partner intents.

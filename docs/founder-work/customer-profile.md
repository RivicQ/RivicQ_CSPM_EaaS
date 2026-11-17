# Customer Profile — 2026-11-17

## Primary Customer

The beachhead buyer is the security leader who owns cryptographic risk and audit evidence in a 50–1000 employee organization in the EU/DACH region, especially financial services, fintech/payments, identity and PKI, regulated SaaS, industrial IoT/manufacturing, or healthcare.

Buyer roles, in priority order:

1. CISO, Chief Information Security Officer, Head of Information Security, VP Security, or Director of Security — economic buyer.
2. Head of Application Security, Security Engineering Manager, Security Architect, or Head of DevSecOps — technical champion.
3. Security analyst, platform engineer, PKI owner, or GRC analyst — day-to-day user and evidence gatherer.

Sellbird titles map to those roles: `CISO`, `Chief Information Security Officer`, `Head of Information Security`, `VP Security`, `Director of Security`, `Head of Application Security`, `Security Engineering Manager`, `Security Architect`, `Head of DevSecOps`.

## Situation

The organization has a real security engineering function and probably an SBOM or vulnerability program, but cannot answer a precise question: which algorithms, keys, certificates, and cryptographic dependencies are used across authorized source trees and services. The answer matters when a customer security review, DORA/NIS2/eIDAS preparation, ISO evidence request, post-quantum readiness question, or internal risk review asks for cryptographic inventory.

RivicQ's current pilot is ready for static cryptographic inventory, not hosted live scanning. The first customer must be able to authorize a source tree or fixture copy and accept a labeled pilot boundary.

## Current Workaround

- Spreadsheets or wiki pages that go stale.
- Generic SBOM tooling that lists components but not cryptographic posture.
- Ad hoc scripts, `openssl`, `nmap`, or repository search.
- Manual screenshots and notes assembled before audits.
- Broad CSPM tools that do not provide a CBOM-first evidence trail.
- No single owner for cryptographic assets across AppSec, platform, PKI, and GRC.

## Trigger / Why Now

- A DORA, NIS2, eIDAS, ISO, or customer-security request asks for cryptographic asset evidence.
- The company is hiring security, AppSec, DevSecOps, GRC, PKI, or cryptography roles.
- Post-quantum migration is moving from discussion to inventory.
- The company is preparing for a security audit, funding round, enterprise customer review, or integration.
- A certificate, key-management, or algorithm-policy incident exposed a visibility gap.

Sellbird hiring signals map to: `Security Engineer`, `Application Security Engineer`, `DevSecOps Engineer`, `Security Architect`, `GRC Analyst`, `Compliance Manager`, `PKI Engineer`, `Cryptography Engineer`.

## Consequence

Without a reliable cryptographic inventory, the buyer cannot produce defensible evidence quickly, cannot prove where weak or legacy crypto is used, and cannot connect inventory findings to a CI policy gate. Work stays manual, evidence is hard to reproduce, and security leadership has to answer audits with anecdotes instead of exports.

## Why This Beachhead

RivicQ can deliver a credible first result here today:

- Community CLI performs static CBOM/SBOM inventory and CycloneDX 1.6 export from authorized source trees (`docs/PILOT_READINESS.md:17`, `docs/CAPABILITIES.yaml:34-57`).
- The policy gate has deterministic exit codes suitable for CI (`docs/PILOT_READINESS.md:18`, `docs/CAPABILITIES.yaml:42-48`).
- Enterprise adds SSO, server-side RBAC, tenant isolation, connectors, audit evidence, and control mappings when the buyer needs them (`README.md:26-52`, `docs/editions.md:42-53`).
- The official CTA already supports enterprise demo, PoC, CBOM pilot, and partner conversations (`web/src/pages/RequestDemo.tsx:13-18`).
- The pilot gate is conservative and explicit about what must not be claimed (`docs/PILOT_READINESS.md:3-11`, `41-49`).

This segment is better than adjacent segments because the pain is audit-visible, the first test can be static and bounded, and the buyer has budget authority or direct access to it.

## Adjacent Segments to Ignore For Now

- Individual developers looking only for a free scanner: good for OSS growth, poor for the first paid sales cycle.
- Large enterprises demanding a fully hosted multi-tenant SaaS, live connectors, and certification claims before any static pilot.
- Buyers expecting GitHub Pages to scan or store customer findings.
- Buyers whose main need is generic network CSPM with no cryptographic inventory requirement.
- Hardware or silicon attestation programs expecting protected-key extraction or quantum hardware results.
- Teams that cannot name an authorized source tree or fixture copy for the first scan.

## Validation Questions

The fastest disconfirming question: **who currently owns the answer to “where is cryptography used across our source trees and services,” and what artifact do they produce today?**

Additional questions:

1. What audit or customer request last forced you to assemble cryptographic evidence, and how long did it take?
2. Can you authorize one source tree or fixture copy for a static CBOM pilot this month?
3. What would make a CBOM export useful enough to repeat: CycloneDX, policy findings, CI gate, or audit mapping?
4. Who signs off on security tooling: CISO, security engineering lead, platform lead, or procurement?
5. Are you hiring for security, DevSecOps, GRC, PKI, or cryptography roles in the next two quarters?
6. Which capability is a hard requirement before a pilot: SSO, RBAC, tenant isolation, live cloud connector, or none?
7. What would make you stop: no live SaaS, no certification, no real-time detection, or no HSM integration?

## Customer Hypothesis

We believe a security leader in a 50–1000 employee EU/DACH regulated or cryptography-heavy organization struggles to produce a trustworthy cryptographic inventory, currently solves it with spreadsheets, generic SBOM tools, scripts, or manual audit notes, and will care now because an audit, customer review, post-quantum plan, or security hiring wave made the gap visible.

## Sellbird Translation

- Industries: Financial Services, Fintech and Payments, Identity and PKI, Regulated SaaS, Industrial IoT and Manufacturing, Healthcare.
- Company size: 50-1000 employees.
- Geography: Germany, European Union, United Kingdom.
- Titles: see Primary Customer.
- Hiring signals: see Trigger / Why Now.
- Offer: free Community CBOM pilot first; Enterprise conversation after the evidence is useful.
- Confirmed free signals: `TECH_STACK`, `SITE_PAGE_COUNT`, `BLOG_STALE`, `BLOCKS_AI_CRAWLERS`, `FUNDING_ROUND`, `HIRING_ROLE`, `OPEN_ROLES`, `CONTACT_FOUND`, `DECISION_MAKER_TITLE`, `LIKELY_OWNER`, `EMAIL_PATTERN`, `EMAIL_STATUS`, `CONTACT_FORM_URL`.

## Evidence Used

- `README.md:3-5,26-52,58-70`
- `docs/editions.md:3-21,42-53,86-91`
- `docs/PILOT_READINESS.md:3-11,15-30,32-49,50-85,103-109`
- `docs/CAPABILITIES.yaml:15-80`
- `web/src/pages/RequestDemo.tsx:13-18,31-42,54-87`
- `web/src/pages/Pricing.tsx:21-40,54-89`

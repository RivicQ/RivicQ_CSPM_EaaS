# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.3.x (latest) | ✅ |
| 1.2.x | ✅ Security fixes only |
| < 1.2 | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

Email: **security@cryptobom.io** (PGP key available on request)

Include:
- Description of the vulnerability and potential impact
- Steps to reproduce (proof of concept if possible)
- Affected component(s) and version(s)
- Any suggested remediation

### What to Expect

| Timeline | Action |
|---|---|
| Within 24 hours | Acknowledgement of your report |
| Within 5 business days | Initial assessment and severity classification |
| Within 30 days | Remediation or accepted-risk decision (for Critical/High, sooner) |
| After fix | CVE assignment (if applicable) and credit in release notes |

We follow coordinated disclosure: we ask that you give us reasonable time to remediate before public disclosure. We will keep you informed throughout the process.

### Scope

**In scope**:
- CryptoBOM SaaS application (`github.com/rivic-q/cryptobom-saas`)
- CryptoBOM API endpoints
- Authentication and authorization logic
- Cryptographic implementations
- Infrastructure-as-Code (Terraform modules in this repo)

**Out of scope**:
- Third-party services and dependencies (report to the respective maintainer)
- Social engineering attacks
- Physical attacks
- Denial of service

## Security Advisories

Security advisories for this project are published as [GitHub Security Advisories](https://github.com/rivic-q/cryptobom-saas/security/advisories).

## Security Controls

For an overview of security controls implemented in CryptoBOM, see:
- [`docs/compliance/soc2-iso27001-controls.md`](docs/compliance/soc2-iso27001-controls.md)
- [`docs/compliance/access-control-policy.md`](docs/compliance/access-control-policy.md)
- [`docs/compliance/vulnerability-management.md`](docs/compliance/vulnerability-management.md)
- [`docs/quantum-attestation.md`](docs/quantum-attestation.md)

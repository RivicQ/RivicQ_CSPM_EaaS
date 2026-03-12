# CryptoBOM Enterprise Beta Program

> **Version**: 1.0.0-beta1 · **Status**: Open · **Launch date**: March 2026

---

## What Is the Beta Program?

The CryptoBOM Enterprise Beta gives qualified organisations early access to the full Enterprise edition of CryptoBOM SaaS — the industry's first post-quantum–ready Cryptographic Bill of Materials platform for regulated industries.

Beta participants receive:

- ✅ Full Enterprise edition access at no cost during the beta period
- ✅ Priority onboarding and dedicated support channel
- ✅ Direct input into the product roadmap
- ✅ Early access to new features before general availability
- ✅ Reference customer status (optional, with your consent)

---

## Who Is the Beta For?

The beta is designed for **security and engineering teams in regulated industries** who need to:

- Understand their current cryptographic posture (CBOM)
- Assess quantum risk exposure before Q-Day
- Meet DORA, BSI TR-02102-1, eIDAS 2.0, or NIST PQC compliance requirements
- Plan post-quantum migration before 2030 regulatory deadlines

**Ideal profiles**:

| Role | Why CryptoBOM |
|------|--------------|
| CISO / Security Director | Board-level quantum risk reporting; compliance evidence for auditors |
| DevSecOps Engineer | CBOM in CI/CD pipelines; shift-left cryptography hygiene |
| Cloud Architect | Multi-cloud HSM inventory (AWS CloudHSM, IBM HPCS, GCP KMS) |
| Compliance Officer | DORA Article 9, BSI TR-02102-1, eIDAS 2.0 control mapping |
| Platform Engineer | Kubernetes-native CBOM operator; eBPF live scanning via Cilium |

---

## Features Included in Beta

### Core (OSS – available now)

- 🔐 **CBOM scanning** – Generate a Cryptographic Bill of Materials for repos, containers, and live endpoints via REST API or CLI (`scripts/scan-cbom.sh`)
- 📊 **Algorithm inventory** – Detect RSA, AES, ECDSA, ECC, and 30+ algorithms with key-size validation
- ⚛️ **Quantum vulnerability detection** – Flag algorithms vulnerable to Shor's and Grover's algorithms
- 🛡️ **Compliance scanning** – NIST, ISO 27001, BSI, PCI-DSS, SOC 2 framework support
- 🔄 **PQC migration planning** – Prioritised roadmap to NIST FIPS 203/204/205 (ML-KEM, ML-DSA, SLH-DSA)
- 🐳 **Docker Compose** – Full-stack local deployment in under 5 minutes

### Enterprise (beta access)

- 🌐 **Multi-cloud CBOM** – Scan cryptographic keys and certificates in AWS CloudHSM, IBM Cloud HPCS, and GCP KMS
- ⚛️ **IBM Quantum attestation** – Hardware-backed quantum risk scoring via the IBM Quantum Network
- 📋 **Regulatory compliance reports** – DORA Article 9, BSI TR-02102-1, eIDAS 2.0, FedRAMP, SOC 2 Type II
- 🔍 **eBPF live scanning** – Real-time network traffic cryptography analysis via Cilium
- ☸️ **Kubernetes operator** – `CbomReport` CRD for automated, scheduled CBOM generation in-cluster
- 🏢 **Multi-tenancy** – Organisation isolation, RBAC (admin/operator/analyst/viewer), audit logs
- 🔗 **Enterprise SSO** – SAML 2.0 / LDAP integration
- 📈 **Advanced analytics** – Historical trend analysis, algorithm deprecation timeline, risk heatmaps

---

## Security Posture During Beta

CryptoBOM is built with a security-first architecture. During beta, the following posture applies:

| Area | Status |
|------|--------|
| Authentication | JWT with RBAC; SSO available in Enterprise |
| Data encryption at rest | AES-256-GCM via managed KMS (GCP/AWS/IBM) |
| Data encryption in transit | TLS 1.3 minimum; certificate pinning for cloud integrations |
| Network isolation | Kubernetes NetworkPolicies; Cloud Armor WAF on GCP |
| Secret management | GCP Secret Manager / AWS Secrets Manager – no secrets in code |
| Vulnerability scanning | CodeQL, Trivy, gosec in CI/CD on every commit |
| SBOM | Generated automatically on every release tag |
| Penetration testing | Scheduled for GA; findings tracked in private security advisory |
| Compliance certification | SOC 2 Type II and ISO 27001 audits planned for GA |

### Beta Limitations and Caveats

- **IBM Quantum attestation** requires a valid IBM Quantum Network API key. Without credentials the system falls back to classical risk scoring — all other features remain fully functional.
- **Multi-cloud HSM scanning** requires cloud credentials to be configured in Kubernetes secrets. The system gracefully degrades if credentials are absent.
- **Database**: PostgreSQL is required for production deployments. Docker Compose provides a local instance for evaluation.
- **SLAs**: During beta, best-effort support is provided. Production SLAs begin at GA.
- **Data residency**: Beta deployments are scoped to the customer's own GCP/AWS/IBM account. No scan data is sent to RivicQ servers.
- **API stability**: The v1 API is stable. Breaking changes (if any) will be communicated with a 30-day notice.

---

## How to Enroll

### Option A – GitHub Discussions (recommended)

1. Open a new discussion: <https://github.com/rivic-q/cryptobom-saas/discussions>
2. Select the **Beta Access Request** category
3. Describe your organisation, use case, and estimated scale (assets, cloud providers)

### Option B – Email

Send a brief introduction to the email address in the repository's [SECURITY.md](SECURITY.md) with subject line: **"Enterprise Beta Access Request"**.

We aim to respond to all requests within 2 business days.

---

## Onboarding Process

After your request is approved:

1. **Kickoff call** (30 min) – We walk through your environment and set up credentials
2. **Environment setup** – Deploy CryptoBOM to your GCP/AWS/IBM account using our Terraform modules (`deploy/terraform/`)
3. **First CBOM scan** – Run `scripts/scan-cbom.sh` against your first target; review results together
4. **Integration** – Optionally wire CBOM scanning into your CI/CD pipeline
5. **Feedback loop** – Weekly or bi-weekly check-in during the beta period

**Total time to first CBOM**: typically under 1 hour from kickoff.

---

## Roadmap: Beta → GA

| Feature | Beta | GA |
|---------|------|----|
| Core CBOM scanning | ✅ | ✅ |
| Multi-cloud HSM inventory | ✅ Beta | ✅ |
| IBM Quantum attestation | ✅ Beta | ✅ |
| DORA / BSI compliance reports | ✅ Beta | ✅ |
| eBPF live scanning | ✅ Beta | ✅ |
| Kubernetes operator | ✅ Beta | ✅ |
| SOC 2 Type II certification | ❌ | ✅ |
| ISO 27001 certification | ❌ | ✅ |
| Multi-region HA deployment | ❌ | ✅ |
| Advanced ML threat detection | Roadmap | ✅ |
| SBOM ↔ CBOM correlation | Roadmap | ✅ |
| Hardware attestation (TPM/SGX) | Roadmap | Post-GA |

**Target GA date**: Q3 2026

---

## FAQ

**Q: Is the beta free?**  
A: Yes. Enterprise beta access is free for qualified organisations. Commercial terms begin at GA.

**Q: Do you support air-gapped environments?**  
A: Yes. The Enterprise edition can be deployed fully offline. IBM Quantum attestation falls back to classical scoring without outbound connectivity.

**Q: What data leaves our environment?**  
A: Nothing. All scan data stays in your environment. Telemetry is opt-in and anonymised.

**Q: How is CBOM different from SBOM?**  
A: An SBOM (Software Bill of Materials) lists all software components. A CBOM specifically inventories the *cryptographic* components — algorithms, key sizes, libraries — and assesses quantum risk and compliance posture for each one.

**Q: Which quantum algorithms do you support?**  
A: NIST FIPS 203 (ML-KEM / Kyber), FIPS 204 (ML-DSA / Dilithium), FIPS 205 (SLH-DSA / SPHINCS+), and Falcon. Classical algorithms are assessed for quantum vulnerability using NIST and BSI guidance.

---

*For security issues, please follow the [responsible disclosure process](SECURITY.md).*

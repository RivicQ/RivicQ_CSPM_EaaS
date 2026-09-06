# Legal information — RivicQ

**Copyright © 2026 RivicQ GmbH, Berlin, Germany.**

This document is informational. It does not replace the Apache License 2.0 text in [LICENSE](LICENSE) or a signed Enterprise agreement. For binding commercial terms, contact [rivicq.com](https://rivicq.com).

---

## 1. Dual licensing

| Edition | License | What you may do |
|---------|---------|-----------------|
| **Community (Open Source)** | [Apache License 2.0](LICENSE) | Use, modify, and distribute the Community source under Apache-2.0, including the obligation to preserve copyright, license, and [NOTICE](NOTICE) attributions. |
| **Enterprise** | Written commercial license from RivicQ GmbH | Access licensed control-plane features (SSO, RBAC enforcement, multi-cloud connectors, compliance report packs, contracted support). Enterprise rights are **not** granted by cloning this repository. |

The same CBOM / intelligence **engine** powers both editions. Enterprise is a licensed feature set and support entitlement, not a public fork of the scanner.

If you combine Community code with proprietary modules, Apache-2.0 still applies to the Community portions. Do not remove license headers.

---

## 2. Contributions

By submitting a pull request or patch to this repository you agree that your contribution is licensed to RivicQ GmbH and recipients under the same Apache License 2.0 that covers Community source, unless a different inbound license is agreed in writing.

Do not contribute material you do not have the right to license (including customer data, secrets, or third-party code without a compatible license). See [CONTRIBUTING.md](CONTRIBUTING.md) and [DATASETS.md](DATASETS.md).

---

## 3. No warranty; limitation of liability

Community software is provided **on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND**, as stated in Apache-2.0 sections 7 and 8.

RivicQ GmbH does not warrant that scans are complete, that findings match any regulator’s interpretation, or that use of the software will make you compliant with any law. Operators remain responsible for their own security programme, vendor due diligence, and legal obligations.

---

## 4. No certification, audit, or legal advice

Control mappings shown in the product (including ISO/IEC 27001, NIS2, DORA, GDPR, BSI TR-02102, eIDAS 2.0, NIST CSF, CIS, SOC 2 TSC, PCI DSS, HIPAA, FedRAMP, EU AI Act, and EU CRA) are **engineering mappings for operators**.

They are **not**:

- an audit opinion
- a certification of RivicQ or of the customer
- evidence that RivicQ GmbH itself is SOC 2, ISO 27001, PCI DSS, FedRAMP, HIPAA, or TÜV certified
- legal, regulatory, or cryptographic advice

Do not represent GitHub Pages, the labeled demo, or sample datasets as a live customer estate.

---

## 5. Cryptography and export

This repository includes cryptographic inventory, scanning, and related documentation. Cryptographic software can be subject to export, import, and dual-use rules (including EU dual-use regulation and U.S. EAR). **You** are responsible for determining whether your download, use, or distribution is lawful in your jurisdiction. RivicQ GmbH does not provide export-control advice.

---

## 6. Trademarks

“RivicQ”, the RivicQ logo, “Security Cloud”, and “CryptoBOM” product names are trademarks of RivicQ GmbH.

The RivicQ console visual identity is a **sky-blue and white** Security Cloud theme (`#0284c7` on `#ffffff`) with Outfit and JetBrains Mono.

AWS, Azure, Google Cloud, GitHub, CycloneDX, Qiskit, Kubernetes, and other vendor or project names are trademarks of their respective owners. Use of those names is for interoperability description only and does not imply affiliation, sponsorship, or certification.

Control mappings are not certifications, audit opinions, or legal advice.

Full list: [TRADEMARKS.md](TRADEMARKS.md).

---

## 7. Privacy and data

- Do not submit production secrets, personal data, or customer telemetry in issues, pull requests, or datasets.
- GitHub Pages hosts a **static demo**. See [PRIVACY.md](PRIVACY.md).
- If you self-host RivicQ, you determine the processing of data in your deployment.

---

## 8. Third-party software

Go modules, npm packages, fonts, and other dependencies retain their own licenses. See [NOTICE](NOTICE) and the lockfiles (`go.mod` / `go.sum`, `web/package-lock.json`).

---

## 9. Security reports

Report vulnerabilities privately per [SECURITY.md](SECURITY.md). Do not open a public issue for an exploitable defect.

---

## 10. Governing law

Unless a signed Enterprise agreement states otherwise, disputes relating to Community use of this repository are governed by the laws applicable to RivicQ GmbH in Berlin, Germany, without prejudice to mandatory consumer protections.

---

## Contact

Public directory: [docs/contact.html](docs/contact.html) ([CONTACT.md](docs/CONTACT.md)). Domain: **@rivicq.com**.

- General: hello@rivicq.com
- Sales / Enterprise: sales@rivicq.com
- Support: support@rivicq.com
- Security: security@rivicq.com ([SECURITY.md](SECURITY.md))
- Privacy / GDPR: privacy@rivicq.com
- Legal and conduct: legal@rivicq.com ([CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md))
- Partnerships: partnerships@rivicq.com
- Research / grants: research@rivicq.com · grants@rivicq.com
- Innovation Hub: innovationhub@rivicq.com
- Investors: investors@rivicq.com
- Company: https://rivicq.com
- Source: https://github.com/RivicQ/RivicQ_CSPM_EaaS

`admin@rivicq.com` is not a public mailbox.

---

## NEXUS Quantum Security Fabric

NEXUS is an original product identity and labeled Community demo in this repository (`nexus/`, `/nexus` on GitHub Pages). It does not copy the Community console’s visual brand. It does **not** store or display customer secrets, private keys, or production credentials. Control mappings and PQC algorithm names are not certifications or completed-migration claims. Enterprise rights remain licensed as in §1.


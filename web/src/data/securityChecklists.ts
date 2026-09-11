/** Operator checklists mapped into RivicQ. These are not certifications or audit scores. */

export type ChecklistItem = {
  id: string;
  title: string;
  rivicq: string;
};

export type SecurityChecklist = {
  id: string;
  name: string;
  source: string;
  sourceUrl: string;
  honesty: string;
  items: ChecklistItem[];
};

export const SECURITY_CHECKLISTS: SecurityChecklist[] = [
  {
    id: 'owasp-api-2023',
    name: 'OWASP API Security Top 10',
    source: 'OWASP API Security Top 10:2023',
    sourceUrl: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/',
    honesty: 'Published OWASP awareness list. RivicQ maps TLS/HTTPS scan evidence and inventory — it does not certify APIs.',
    items: [
      { id: 'API1:2023', title: 'Broken Object Level Authorization', rivicq: 'Enterprise identity inventory (IBOM). Community flags unauthenticated TLS surfaces.' },
      { id: 'API2:2023', title: 'Broken Authentication', rivicq: 'JWT RBAC, MFA, demo-token refuse in production.' },
      { id: 'API3:2023', title: 'Broken Object Property Level Authorization', rivicq: 'API responses omit emails/secrets on public lead create.' },
      { id: 'API4:2023', title: 'Unrestricted Resource Consumption', rivicq: 'Public /leads rate limit. Scan jobs are tenant-scoped.' },
      { id: 'API5:2023', title: 'Broken Function Level Authorization', rivicq: 'RequireRole on admin, CRM, API keys, webhooks.' },
      { id: 'API6:2023', title: 'Unrestricted Access to Sensitive Business Flows', rivicq: 'Checkout stub — no live charge without a PSP adapter.' },
      { id: 'API7:2023', title: 'Server-Side Request Forgery', rivicq: 'Scans target operator-supplied hosts; GitHub uses Contents API only.' },
      { id: 'API8:2023', title: 'Security Misconfiguration', rivicq: 'Website scan: HSTS, CSP, protocol, certificate hygiene.' },
      { id: 'API9:2023', title: 'Improper Inventory Management', rivicq: 'CBOM / SBOM / declared k8s and hardware inventory.' },
      { id: 'API10:2023', title: 'Unsafe Consumption of APIs', rivicq: 'Partner connectors stay disconnected without customer credentials.' },
    ],
  },
  {
    id: 'owasp-top10-2021',
    name: 'OWASP Top 10 (application publication)',
    source: 'OWASP Top 10:2021',
    sourceUrl: 'https://owasp.org/Top10/',
    honesty: 'Release/publication mapping for software we ship. Not a pentest report.',
    items: [
      { id: 'A01:2021', title: 'Broken Access Control', rivicq: 'Tenant isolation on Community scans; admin routes RequireRole.' },
      { id: 'A02:2021', title: 'Cryptographic Failures', rivicq: 'CBOM algorithm inventory and PQC replacement map.' },
      { id: 'A03:2021', title: 'Injection', rivicq: 'Parameterized SQL; Gitleaks never stores secret values.' },
      { id: 'A04:2021', title: 'Insecure Design', rivicq: 'Edition flags are server-side; UI switcher is not a license.' },
      { id: 'A05:2021', title: 'Security Misconfiguration', rivicq: 'Production refuses default JWT secret and bootstrap password.' },
      { id: 'A06:2021', title: 'Vulnerable and Outdated Components', rivicq: 'Optional Syft / Trivy / Grype / OSV when installed on PATH.' },
      { id: 'A07:2021', title: 'Identification and Authentication Failures', rivicq: 'Password + JWT; demo session is Community operator only.' },
      { id: 'A08:2021', title: 'Software and Data Integrity Failures', rivicq: 'CycloneDX CBOM/SBOM export; Cosign is PATH-probed, not assumed.' },
      { id: 'A09:2021', title: 'Security Logging and Monitoring Failures', rivicq: 'Scan jobs and findings queue; Pages has no API telemetry.' },
      { id: 'A10:2021', title: 'Server-Side Request Forgery', rivicq: 'No operator-controlled URL fetch into the control plane except scan targets.' },
    ],
  },
  {
    id: 'owasp-wstg-network',
    name: 'OWASP WSTG network hygiene',
    source: 'OWASP Web Security Testing Guide — network & configuration chapters',
    sourceUrl: 'https://owasp.org/www-project-web-security-testing-guide/',
    honesty: 'WSTG is a testing guide. RivicQ records TLS/SSH/HTTP discovery — it is not a packet capture or eBPF sensor.',
    items: [
      { id: 'WSTG-INFO', title: 'Information gathering', rivicq: 'Website / host / IP target classes and certificate inventory.' },
      { id: 'WSTG-CONF', title: 'Configuration management', rivicq: 'HTTPS header and cookie findings on website scans.' },
      { id: 'WSTG-IDNT', title: 'Identity management', rivicq: 'IBOM is Enterprise declared directory — Community still scans secrets into CBOM.' },
      { id: 'WSTG-ATHN', title: 'Authentication testing', rivicq: 'Login, MFA, demo token disabled in production runtime.' },
      { id: 'WSTG-ATHZ', title: 'Authorization testing', rivicq: 'RBAC viewer < analyst < operator < admin.' },
      { id: 'WSTG-CRYP', title: 'Cryptography', rivicq: 'TLS protocol, cipher, key length, PQC taxonomy (local, not IBM Quantum hardware).' },
      { id: 'WSTG-APIT', title: 'API testing', rivicq: 'See OWASP API Top 10 mapping above.' },
    ],
  },
  {
    id: 'rivicq-quantum',
    name: 'RivicQ quantum cryptography checklist',
    source: 'NIST FIPS 203/204/205 · NIST IR 8547-aligned operator list',
    sourceUrl: 'https://csrc.nist.gov/projects/post-quantum-cryptography',
    honesty: 'Not an OWASP publication. Local Shor/Grover/PQC taxonomy. Qiskit scores are classical profile math — not IBM Quantum jobs.',
    items: [
      { id: 'Q-INV', title: 'Cryptographic inventory', rivicq: 'CBOM of algorithms, certs, libraries from scans and optional PATH tools.' },
      { id: 'Q-SHOR', title: 'Shor-class public-key exposure', rivicq: 'RSA/ECDSA/ECDH flagged for ML-KEM / ML-DSA replacement.' },
      { id: 'Q-GROV', title: 'Grover-class symmetric length', rivicq: 'AES-128 vs AES-256 notes; not an automatic vulnerability on AES-256.' },
      { id: 'Q-HYB', title: 'Hybrid cut-over', rivicq: 'PQC migration hub recommends hybrid classical + PQC. Engine does not rotate keys.' },
      { id: 'Q-HNDL', title: 'Harvest-now-decrypt-later', rivicq: 'HNDL exposure field on scan intelligence when a scan exists.' },
      { id: 'Q-HSM', title: 'Hardware modules', rivicq: 'Declared HSM/TPM/QSIC inventory. QSIC is a research ASIC, not shipped silicon.' },
      { id: 'Q-FW', title: 'Firmware / semiconductor components', rivicq: 'Declared CycloneDX / hash inventory. No binary reverse-engineering or die inspection.' },
    ],
  },
];

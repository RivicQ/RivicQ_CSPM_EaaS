export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Mode = 'ciso' | 'engineer' | 'auditor';
export type Role =
  | 'CISO'
  | 'Security Admin'
  | 'SOC Analyst'
  | 'Cloud Security Engineer'
  | 'DevSecOps Engineer'
  | 'Compliance Officer'
  | 'Developer'
  | 'Auditor'
  | 'Finance Admin'
  | 'Viewer';

export const DEMO_NOTICE =
  'Labeled synthetic demo for Northbridge Exchange (fictional). No customer secrets, keys, or production credentials are stored or displayed.';

export const tenant = {
  org: 'Northbridge Exchange',
  unit: 'Payments',
  env: 'Production',
  region: 'eu-central-1',
  cloud: 'AWS',
};

export const tenants = [
  { org: 'Northbridge Exchange', unit: 'Payments', env: 'Production', region: 'eu-central-1', cloud: 'AWS' },
  { org: 'Northbridge Exchange', unit: 'Risk', env: 'Production', region: 'eu-west-1', cloud: 'Azure' },
  { org: 'Northbridge Exchange', unit: 'Compliance', env: 'Staging', region: 'us-east-1', cloud: 'GCP' },
];

export const posture = {
  overall: 86,
  label: 'Good',
  criticalFindings: 12,
  highRiskAssets: 47,
  cloudMisconfigs: 83,
  cryptoVulns: 19,
  expiredCerts: 7,
  secretsAtRisk: 4,
  quantumVulnerable: 128,
  compliance: 94,
  pqc: 61,
};

export const dimensions = [
  { id: 'cloud', name: 'Cloud Security', score: 81, trend: -2, critical: 31, assets: 18420, action: 'Close public S3 and unencrypted RDS.', href: '/app/cloud' },
  { id: 'identity', name: 'Identity Security', score: 74, trend: -4, critical: 8, assets: 612, action: 'Remove unused privileged roles.', href: '/app/identity' },
  { id: 'app', name: 'Application Security', score: 79, trend: 1, critical: 6, assets: 148, action: 'Patch log4j-class findings in payments-api.', href: '/app/vulns' },
  { id: 'data', name: 'Data Security', score: 83, trend: 0, critical: 5, assets: 94, action: 'Shorten retention on card-hold archives.', href: '/app/data' },
  { id: 'crypto', name: 'Cryptographic Security', score: 68, trend: -3, critical: 19, assets: 8421, action: 'Replace SHA-1 and TLS 1.0 endpoints.', href: '/app/cryptobom' },
  { id: 'supply', name: 'Supply Chain Security', score: 77, trend: 2, critical: 4, assets: 2204, action: 'Pin npm crypto libraries in ledger-web.', href: '/app/sbom' },
  { id: 'ai', name: 'AI Security', score: 71, trend: 0, critical: 3, assets: 18, action: 'Rotate model-endpoint service accounts.', href: '/app/ai' },
  { id: 'compliance', name: 'Compliance', score: 94, trend: 1, critical: 2, assets: 41, action: 'Attach evidence to DORA TRA-04.', href: '/app/compliance' },
  { id: 'quantum', name: 'Quantum Readiness', score: 61, trend: 3, critical: 128, assets: 8421, action: 'Plan ML-KEM hybrid for TLS termination.', href: '/app/pqc' },
];

export const changes = [
  { when: '09:14 UTC', title: 'New critical: public ALB still offers TLS 1.0', area: 'Cloud + Crypto' },
  { when: '08:02 UTC', title: 'Certificate old-settlement.nbx.example expired (−6 days)', area: 'PKI' },
  { when: 'Yesterday', title: 'Unused PAYMENTS_DB_PASSWORD reference flagged', area: 'Secrets' },
  { when: 'Yesterday', title: 'CIS AWS 2.1.4 failed on s3://nbx-pay-artifacts', area: 'Compliance' },
  { when: '2 days ago', title: 'ML-KEM hybrid canary healthy on pay-canary', area: 'PQC' },
];

export const actions = [
  { id: 'A-1', title: 'Disable TLS 1.0 on alb/pay-public', owner: 'payments-platform', risk: 'critical' as Severity, approval: 'Required' },
  { id: 'A-2', title: 'Renew old-settlement certificate', owner: 'pki', risk: 'critical' as Severity, approval: 'Required' },
  { id: 'A-3', title: 'Rotate GH_DEPLOY_TOKEN reference', owner: 'devsecops', risk: 'critical' as Severity, approval: 'Required' },
  { id: 'A-4', title: 'Remove unused pay-admin-role bindings', owner: 'identity', risk: 'high' as Severity, approval: 'Required' },
];

export const clouds = [
  { account: 'nbx-prod-core', provider: 'AWS', resources: 8420, critical: 12, high: 61, publicRes: 28, unencrypted: 9, identity: 17, owner: 'cloud-sec', region: 'eu-central-1' },
  { account: 'nbx-prod-pay', provider: 'AWS', resources: 3910, critical: 8, high: 33, publicRes: 11, unencrypted: 6, identity: 9, owner: 'payments-platform', region: 'eu-central-1' },
  { account: 'nbx-analytics', provider: 'Azure', resources: 2740, critical: 6, high: 28, publicRes: 19, unencrypted: 8, identity: 11, owner: 'data-eng', region: 'westeurope' },
  { account: 'nbx-ml', provider: 'GCP', resources: 1880, critical: 3, high: 14, publicRes: 15, unencrypted: 4, identity: 4, owner: 'ml-ops', region: 'europe-west3' },
  { account: 'nbx-edge', provider: 'OCI', resources: 620, critical: 2, high: 11, publicRes: 10, unencrypted: 2, identity: 1, owner: 'edge', region: 'eu-frankfurt-1' },
  { account: 'nbx-hybrid', provider: 'Hybrid', resources: 850, critical: 0, high: 0, publicRes: 0, unencrypted: 0, identity: 0, owner: 'infra', region: 'berlin-dc' },
];

export type CryptoRow = {
  asset: string;
  algorithm: string;
  keySize: string;
  protocol: string;
  location: string;
  application: string;
  environment: string;
  risk: Severity;
  quantum: Severity;
  compliance: string;
  lastSeen: string;
  owner: string;
};

export const cryptoRows: CryptoRow[] = [
  { asset: 'pay-edge-tls', algorithm: 'RSA', keySize: '1024', protocol: 'TLS 1.0', location: 'alb/pay-public', application: 'payments-api', environment: 'prod', risk: 'critical', quantum: 'critical', compliance: 'PCI DSS 4.2.1', lastSeen: '2026-09-05', owner: 'payments-platform' },
  { asset: 'legacy-hash', algorithm: 'SHA-1', keySize: '160', protocol: 'CMS', location: 'repo/ledger-web', application: 'ledger-web', environment: 'prod', risk: 'critical', quantum: 'high', compliance: 'BSI TR-02102', lastSeen: '2026-09-04', owner: 'appsec' },
  { asset: 'vpn-3des', algorithm: '3DES', keySize: '168', protocol: 'IPsec', location: 'fw/eu-transit', application: 'corp-vpn', environment: 'prod', risk: 'high', quantum: 'high', compliance: 'NIS2 Art. 21', lastSeen: '2026-09-03', owner: 'netsec' },
  { asset: 'ssh-weak-kex', algorithm: 'diffie-hellman-group1', keySize: '1024', protocol: 'SSH', location: 'ec2/bastion-a', application: 'ops-bastion', environment: 'prod', risk: 'high', quantum: 'high', compliance: 'CIS 5.2', lastSeen: '2026-09-05', owner: 'sre' },
  { asset: 'rc4-internal', algorithm: 'RC4', keySize: '128', protocol: 'TLS 1.1', location: 'svc/settlement-old', application: 'settlement', environment: 'prod', risk: 'critical', quantum: 'high', compliance: 'PCI DSS 4.2.1', lastSeen: '2026-08-29', owner: 'payments-platform' },
  { asset: 'api-cert-exp', algorithm: 'ECDSA', keySize: '256', protocol: 'TLS 1.2', location: 'acm/api.nbx.example', application: 'public-api', environment: 'prod', risk: 'high', quantum: 'high', compliance: 'SOC 2 CC6.7', lastSeen: '2026-09-06', owner: 'pki' },
  { asset: 'pay-mlkem-pilot', algorithm: 'ML-KEM', keySize: '768', protocol: 'TLS 1.3 hybrid', location: 'alb/pay-canary', application: 'payments-api', environment: 'prod-canary', risk: 'low', quantum: 'low', compliance: 'NIST FIPS 203', lastSeen: '2026-09-06', owner: 'crypto-eng' },
  { asset: 'internal-rsa2k', algorithm: 'RSA', keySize: '2048', protocol: 'TLS 1.3', location: 'acm/int.nbx.example', application: 'ledger-web', environment: 'prod', risk: 'medium', quantum: 'high', compliance: 'ISO 27001 A.8.24', lastSeen: '2026-09-06', owner: 'pki' },
  { asset: 'ecdsa-signing', algorithm: 'ECDSA', keySize: '256', protocol: 'JWT', location: 'svc/authz', application: 'idp-bridge', environment: 'prod', risk: 'medium', quantum: 'high', compliance: 'NIST CSF PR.DS', lastSeen: '2026-09-06', owner: 'identity' },
  { asset: 'ecdh-session', algorithm: 'ECDH', keySize: '256', protocol: 'TLS 1.3', location: 'alb/corp-int', application: 'intranet', environment: 'prod', risk: 'low', quantum: 'high', compliance: 'ISO 27001 A.8.24', lastSeen: '2026-09-05', owner: 'pki' },
];

export const secrets = [
  { name: 'PAYMENTS_DB_PASSWORD', status: 'unused', lastRotation: '2025-11-02', apps: 'payments-api', owner: 'payments-platform', risk: 'high' as Severity, vault: 'platform-vault' },
  { name: 'GH_DEPLOY_TOKEN', status: 'exposed-in-ci-log-ref', lastRotation: '2026-04-12', apps: 'ledger-web', owner: 'devsecops', risk: 'critical' as Severity, vault: 'ci-vault' },
  { name: 'MODEL_ENDPOINT_KEY', status: 'weak-entropy', lastRotation: '2026-01-19', apps: 'fraud-model', owner: 'ml-ops', risk: 'high' as Severity, vault: 'ml-vault' },
  { name: 'STRIPE_WEBHOOK_SECRET', status: 'ok', lastRotation: '2026-08-01', apps: 'billing-bridge', owner: 'finance-eng', risk: 'low' as Severity, vault: 'finance-vault' },
  { name: 'HSM_WRAP_REF', status: 'ok', lastRotation: '2026-07-14', apps: 'pki-service', owner: 'pki', risk: 'low' as Severity, vault: 'hsm-partition' },
];

export const certificates = [
  { name: 'api.nbx.example', issuer: 'Internal ICA', algo: 'ECDSA P-256', keySize: '256', days: 11, owner: 'pki', env: 'prod', risk: 'high' as Severity, status: '14 days' },
  { name: 'pay.nbx.example', issuer: "Let's Encrypt", algo: 'RSA 2048', keySize: '2048', days: 28, owner: 'payments-platform', env: 'prod', risk: 'medium' as Severity, status: '30 days' },
  { name: 'ml.nbx.example', issuer: 'Internal ICA', algo: 'RSA 2048', keySize: '2048', days: 74, owner: 'ml-ops', env: 'prod', risk: 'medium' as Severity, status: '90 days' },
  { name: 'old-settlement.nbx.example', issuer: 'Legacy CA', algo: 'RSA 1024', keySize: '1024', days: -6, owner: 'payments-platform', env: 'prod', risk: 'critical' as Severity, status: 'Expired' },
  { name: 'int.nbx.example', issuer: 'Internal ICA', algo: 'RSA 2048', keySize: '2048', days: 58, owner: 'pki', env: 'prod', risk: 'low' as Severity, status: '60 days' },
  { name: 'canary.nbx.example', issuer: 'Internal ICA', algo: 'ML-KEM hybrid', keySize: '768', days: 81, owner: 'crypto-eng', env: 'prod-canary', risk: 'low' as Severity, status: '90 days' },
];

export const frameworks = [
  { name: 'NIST CSF', score: 91, fails: 4, evidence: 38 },
  { name: 'ISO 27001', score: 88, fails: 6, evidence: 52 },
  { name: 'SOC 2', score: 93, fails: 3, evidence: 29 },
  { name: 'PCI DSS', score: 81, fails: 9, evidence: 44 },
  { name: 'GDPR', score: 90, fails: 2, evidence: 21 },
  { name: 'DORA', score: 86, fails: 5, evidence: 33 },
  { name: 'NIS2', score: 87, fails: 4, evidence: 27 },
  { name: 'BSI', score: 84, fails: 7, evidence: 18 },
  { name: 'CIS', score: 89, fails: 8, evidence: 61 },
  { name: 'FIPS', score: 72, fails: 11, evidence: 14 },
];

export const controls = [
  { id: 'CIS-2.1.4', framework: 'CIS AWS', title: 'S3 block public access', severity: 'critical' as Severity, pass: 412, fail: 18, exceptions: 2, regulation: 'PCI DSS 1.3 · DORA Art. 9' },
  { id: 'PCI-4.2.1', framework: 'PCI DSS', title: 'Strong cryptography in transit', severity: 'critical' as Severity, pass: 88, fail: 6, exceptions: 0, regulation: 'PCI DSS 4.2.1 · NIS2 Art. 21' },
  { id: 'ISO-A.8.24', framework: 'ISO 27001', title: 'Use of cryptography', severity: 'high' as Severity, pass: 120, fail: 11, exceptions: 3, regulation: 'ISO 27001 A.8.24 · BSI TR-02102' },
  { id: 'DORA-TRA-04', framework: 'DORA', title: 'ICT risk register completeness', severity: 'medium' as Severity, pass: 19, fail: 2, exceptions: 1, regulation: 'DORA Art. 6' },
  { id: 'SOC2-CC6.7', framework: 'SOC 2', title: 'Transmission encryption', severity: 'high' as Severity, pass: 54, fail: 3, exceptions: 0, regulation: 'SOC 2 CC6.7' },
];

export const findings = [
  { id: 'NX-1042', title: 'Public ALB allows TLS 1.0', sev: 'critical' as Severity, asset: 'alb/pay-public', owner: 'payments-platform', control: 'PCI-4.2.1', regulation: 'PCI DSS 4.2.1', env: 'prod' },
  { id: 'NX-1048', title: 'S3 bucket publicly listable', sev: 'critical' as Severity, asset: 's3://nbx-pay-artifacts', owner: 'cloud-sec', control: 'CIS-2.1.4', regulation: 'PCI DSS 1.3', env: 'prod' },
  { id: 'NX-1101', title: 'SHA-1 CMS signatures in ledger-web', sev: 'critical' as Severity, asset: 'repo/ledger-web', owner: 'appsec', control: 'ISO-A.8.24', regulation: 'BSI TR-02102', env: 'prod' },
  { id: 'NX-1114', title: 'Unused privileged role binding', sev: 'high' as Severity, asset: 'iam/pay-admin-role', owner: 'identity', control: 'CIS-1.16', regulation: 'SOC 2 CC6.1', env: 'prod' },
  { id: 'NX-1120', title: 'Expired settlement certificate', sev: 'critical' as Severity, asset: 'old-settlement.nbx.example', owner: 'pki', control: 'SOC2-CC6.7', regulation: 'SOC 2 CC6.7', env: 'prod' },
  { id: 'NX-1133', title: 'CVE-2022-24771 in node-forge', sev: 'high' as Severity, asset: 'pkg/node-forge@0.10.0', owner: 'devsecops', control: 'ISO-A.8.25', regulation: 'NIS2 Art. 21', env: 'prod' },
];

export const assets = [
  { name: 'nbx-prod-pay', kind: 'Cloud account', env: 'prod', owner: 'payments-platform', criticality: 'critical', exposure: 'high', findings: 8 },
  { name: 'payments-api', kind: 'Application', env: 'prod', owner: 'payments-platform', criticality: 'critical', exposure: 'high', findings: 6 },
  { name: 'pay-postgres', kind: 'Database', env: 'prod', owner: 'data-eng', criticality: 'critical', exposure: 'medium', findings: 3 },
  { name: 'prod-eks', kind: 'Kubernetes', env: 'prod', owner: 'sre', criticality: 'high', exposure: 'medium', findings: 5 },
  { name: 'fraud-xgb', kind: 'AI model', env: 'prod', owner: 'ml-ops', criticality: 'high', exposure: 'medium', findings: 2 },
  { name: 'hsm-eu-1', kind: 'Hardware', env: 'prod', owner: 'pki', criticality: 'critical', exposure: 'low', findings: 0 },
  { name: 'ledger-web', kind: 'Repository', env: 'prod', owner: 'appsec', criticality: 'high', exposure: 'medium', findings: 4 },
  { name: 'card-hold', kind: 'Sensitive data', env: 'prod', owner: 'compliance', criticality: 'critical', exposure: 'high', findings: 2 },
];

export const identities = [
  { principal: 'analyst.lee', type: 'User', privilege: 'read-only SOC', unused: false, risk: 'low' as Severity, owner: 'soc' },
  { principal: 'pay-pod-sa', type: 'Service account', privilege: 'rds:*, s3:*', unused: false, risk: 'critical' as Severity, owner: 'payments-platform' },
  { principal: 'pay-admin-role', type: 'IAM role', privilege: 'AdministratorAccess', unused: true, risk: 'high' as Severity, owner: 'identity' },
  { principal: 'fraud-infer-sa', type: 'Service account', privilege: 'invoke model-endpoint', unused: false, risk: 'high' as Severity, owner: 'ml-ops' },
  { principal: 'ci-deploy', type: 'Machine user', privilege: 'push to prod-eks', unused: false, risk: 'medium' as Severity, owner: 'devsecops' },
];

export const workloads = [
  { name: 'payments-api', image: 'pay:1.18.2', cluster: 'prod-eks', findings: 4, public: true, owner: 'payments-platform' },
  { name: 'ledger-web', image: 'ledger:3.4.1', cluster: 'prod-eks', findings: 3, public: false, owner: 'appsec' },
  { name: 'settlement', image: 'settle:0.9.8', cluster: 'prod-eks', findings: 5, public: false, owner: 'payments-platform' },
  { name: 'fraud-infer', image: 'fraud:2.1.0', cluster: 'ml-gke', findings: 2, public: false, owner: 'ml-ops' },
];

export const clusters = [
  { name: 'prod-eks', provider: 'AWS EKS', nodes: 12, privileged: 2, public: 1, findings: 9, owner: 'sre' },
  { name: 'ml-gke', provider: 'GKE', nodes: 6, privileged: 0, public: 1, findings: 3, owner: 'ml-ops' },
  { name: 'edge-oke', provider: 'OCI OKE', nodes: 3, privileged: 0, public: 1, findings: 2, owner: 'edge' },
];

export const sbom = [
  { pkg: 'node-forge', version: '0.10.0', license: 'BSD-3-Clause', cve: 'CVE-2022-24771', app: 'ledger-web', crypto: 'RSA', repo: 'github.com/nbx/ledger-web' },
  { pkg: 'openssl', version: '1.1.1w', license: 'Apache-2.0', cve: '—', app: 'payments-api', crypto: 'RSA-2048 / TLS 1.3', repo: 'github.com/nbx/payments-api' },
  { pkg: 'golang.org/x/crypto', version: '0.26.0', license: 'BSD-3-Clause', cve: '—', app: 'idp-bridge', crypto: 'ECDSA P-256', repo: 'github.com/nbx/idp-bridge' },
  { pkg: 'bcrypt', version: '5.1.1', license: 'MIT', cve: '—', app: 'ledger-web', crypto: 'password hash', repo: 'github.com/nbx/ledger-web' },
  { pkg: 'liboqs (pilot)', version: '0.10.1', license: 'MIT', cve: '—', app: 'payments-api', crypto: 'ML-KEM-768', repo: 'github.com/nbx/payments-api' },
];

export const hbom = [
  { asset: 'hsm-eu-1', type: 'CloudHSM', firmware: '3.2.1', crypto: 'RSA, AES, ML-KEM pilot', eol: '2030', owner: 'pki', linked: 'TLS private key' },
  { asset: 'tpm-bastion-a', type: 'TPM 2.0', firmware: '1.59', crypto: 'RSA-2048, SHA-256', eol: '2028', owner: 'sre', linked: 'ops-bastion' },
  { asset: 'fw-eu-transit', type: 'Network appliance', firmware: '18.4', crypto: '3DES, IPsec', eol: '2026-11', owner: 'netsec', linked: 'corp-vpn' },
  { asset: 'dc-berlin-r12', type: 'Server', firmware: 'BIOS 2.11', crypto: 'AES-NI', eol: '2029', owner: 'infra', linked: 'hybrid-k8s' },
];

export const ibom = [
  { asset: 'vpc-pay', kind: 'VPC', cloud: 'AWS', owner: 'cloud-sec', deps: 'subnets, ALB, RDS' },
  { asset: 'subnet-pay-a', kind: 'Subnet', cloud: 'AWS', owner: 'cloud-sec', deps: 'alb/pay-public' },
  { asset: 'tf-pay-edge', kind: 'Terraform module', cloud: 'AWS', owner: 'payments-platform', deps: 'ALB + ACM + WAF' },
  { asset: 'pay-postgres', kind: 'Database', cloud: 'AWS', owner: 'data-eng', deps: 'card-hold, secret ref' },
  { asset: 'prod-eks', kind: 'Cluster', cloud: 'AWS', owner: 'sre', deps: 'payments-api, ledger-web' },
  { asset: 'nbx-pay-artifacts', kind: 'Storage', cloud: 'AWS', owner: 'cloud-sec', deps: 'CI artifacts' },
];

export const aibom = [
  { model: 'fraud-xgb', provider: 'internal', dataset: 'txn-2024 (synthetic fixture)', endpoint: 'ml.nbx.example', identity: 'fraud-infer-sa', secret: 'MODEL_ENDPOINT_KEY', compliance: 'EU AI Act mapping' },
  { model: 'ops-summarizer', provider: 'hosted LLM (declared)', dataset: 'ticket-notes (synthetic)', endpoint: 'analyst-proxy', identity: 'soc-bot', secret: '—', compliance: 'SOC 2 CC7.2 mapping' },
  { model: 'kyc-embed', provider: 'internal', dataset: 'kyc-embeddings (synthetic)', endpoint: 'kyc-infer', identity: 'kyc-sa', secret: '—', compliance: 'GDPR Art. 32 mapping' },
];

export const policies = [
  { id: 'NET-01', domain: 'Network Security', control: 'No public 0.0.0.0/0 on data subnets', severity: 'critical' as Severity, framework: 'CIS AWS', pass: 86, fail: 4, exceptions: 1, version: '1.4' },
  { id: 'IAM-07', domain: 'Identity', control: 'No unused admin roles', severity: 'high' as Severity, framework: 'SOC 2', pass: 40, fail: 3, exceptions: 0, version: '2.0' },
  { id: 'ENC-03', domain: 'Encryption', control: 'TLS ≥ 1.2 on public listeners', severity: 'critical' as Severity, framework: 'PCI DSS', pass: 21, fail: 2, exceptions: 0, version: '3.1' },
  { id: 'LOG-02', domain: 'Logging', control: 'CloudTrail / Activity Log enabled', severity: 'high' as Severity, framework: 'CIS', pass: 24, fail: 0, exceptions: 0, version: '1.2' },
  { id: 'STO-04', domain: 'Storage', control: 'S3 / Blob public access blocked', severity: 'critical' as Severity, framework: 'CIS', pass: 412, fail: 18, exceptions: 2, version: '1.8' },
  { id: 'K8S-11', domain: 'Kubernetes', control: 'No privileged pods in prod', severity: 'high' as Severity, framework: 'CIS K8s', pass: 9, fail: 2, exceptions: 0, version: '1.1' },
  { id: 'CTR-05', domain: 'Containers', control: 'No latest tags in prod', severity: 'medium' as Severity, framework: 'NIST', pass: 31, fail: 6, exceptions: 1, version: '1.0' },
  { id: 'SEC-02', domain: 'Secrets', control: 'No unused production secrets', severity: 'high' as Severity, framework: 'ISO 27001', pass: 18, fail: 2, exceptions: 0, version: '1.3' },
  { id: 'DAT-09', domain: 'Data Protection', control: 'Retention aligned to purpose', severity: 'high' as Severity, framework: 'GDPR', pass: 11, fail: 2, exceptions: 1, version: '1.0' },
  { id: 'CMP-01', domain: 'Compliance', control: 'Finding mapped to a control', severity: 'medium' as Severity, framework: 'DORA', pass: 96, fail: 4, exceptions: 0, version: '2.2' },
];

export const integrations = [
  { name: 'AWS organizations', status: 'Disconnected', note: 'Customer credentials required. Not used on Pages.' },
  { name: 'Azure subscriptions', status: 'Disconnected', note: 'Customer credentials required.' },
  { name: 'Google Cloud projects', status: 'Disconnected', note: 'Customer credentials required.' },
  { name: 'Kubernetes (kubeconfig)', status: 'Disconnected', note: 'No live cluster attach in Community Pages.' },
  { name: 'GitHub / GitLab', status: 'Disconnected', note: 'Public metadata only in this demo.' },
  { name: 'OIDC / SAML IdP', status: 'Disconnected', note: 'Enterprise SSO is licensed separately.' },
  { name: 'Vault / HSM', status: 'Disconnected', note: 'References only. Values never imported here.' },
];

export const roles: Role[] = [
  'CISO',
  'Security Admin',
  'SOC Analyst',
  'Cloud Security Engineer',
  'DevSecOps Engineer',
  'Compliance Officer',
  'Developer',
  'Auditor',
  'Finance Admin',
  'Viewer',
];

export const rbac = [
  { role: 'CISO', org: 'read', tenant: 'read', module: 'all-read', action: 'approve' },
  { role: 'Security Admin', org: 'admin', tenant: 'admin', module: 'all', action: 'configure' },
  { role: 'SOC Analyst', org: 'read', tenant: 'read', module: 'findings', action: 'investigate' },
  { role: 'Cloud Security Engineer', org: 'read', tenant: 'write', module: 'cspm', action: 'remediate-request' },
  { role: 'Auditor', org: 'read', tenant: 'read', module: 'compliance', action: 'export' },
  { role: 'Viewer', org: 'read', tenant: 'read', module: 'dashboards', action: 'none' },
];

export const hndl = [
  { data: 'card-hold archive', value: 'Critical', crypto: 'RSA-1024 / TLS 1.0', retention: '7 years', window: 'Critical' },
  { data: 'settlement journal', value: 'High', crypto: 'RSA-2048 / TLS 1.3', retention: '7 years', window: 'High' },
  { data: 'session tokens', value: 'Medium', crypto: 'TLS 1.3 / AES-256', retention: '24 hours', window: 'Watch' },
  { data: 'public marketing', value: 'Low', crypto: 'TLS 1.3', retention: '90 days', window: 'Low' },
];

export const migrations = [
  { from: 'RSA', to: 'ML-KEM (FIPS 203) + ML-DSA (FIPS 204)', ready: '28%', effort: 'High', impact: 'Payments edge, VPN' },
  { from: 'ECC / ECDSA / ECDH', to: 'ML-DSA / ML-KEM hybrid', ready: '19%', effort: 'High', impact: 'JWT, internal TLS' },
  { from: 'DH / weak SSH KEX', to: 'ML-KEM or modern KEX', ready: '11%', effort: 'Medium', impact: 'Bastion estate' },
  { from: 'SHA-1 / 3DES / RC4', to: 'SHA-256+ / AES-GCM', ready: '64%', effort: 'Medium', impact: 'Legacy settlement' },
];

export const plans = [
  { id: 'starter', name: 'Starter', users: '10', accounts: '3', note: 'Community-adjacent lab use' },
  { id: 'pro', name: 'Professional', users: '50', accounts: '15', note: 'Single business unit' },
  { id: 'ent', name: 'Enterprise', users: 'Unlimited*', accounts: 'Custom', note: 'SSO, RBAC, connectors' },
  { id: 'quantum', name: 'Quantum Enterprise', users: 'Unlimited*', accounts: 'Custom', note: 'PQC planner + HSM + private deploy' },
];

export const pricingDims = [
  'Users',
  'Cloud accounts',
  'Assets',
  'Data volume',
  'Crypto assets',
  'Retention',
  'Compliance modules',
  'AI usage',
  'Automation',
  'Support',
  'Deployment (cloud / hybrid / on-prem / private cloud)',
  'HSM integration',
  'Enterprise SLA (contractual)',
];

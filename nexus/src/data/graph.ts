export type NodeKind =
  | 'cloud'
  | 'identity'
  | 'application'
  | 'database'
  | 'certificate'
  | 'key'
  | 'secret'
  | 'ai'
  | 'threat'
  | 'hardware'
  | 'user'
  | 'container'
  | 'kube';

export type EdgeKind =
  | 'data'
  | 'network'
  | 'identity'
  | 'dependency'
  | 'crypto'
  | 'attack'
  | 'compliance';

export type GNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  risk?: 'critical' | 'high' | 'quantum';
};

export type GEdge = { from: string; to: string; kind: EdgeKind };

export const nodes: GNode[] = [
  { id: 'user', label: 'Analyst', kind: 'user', x: 40, y: 40 },
  { id: 'id', label: 'IdP role', kind: 'identity', x: 160, y: 40 },
  { id: 'app', label: 'payments-api', kind: 'application', x: 300, y: 40, risk: 'high' },
  { id: 'ctr', label: 'pay-container', kind: 'container', x: 440, y: 40 },
  { id: 'k8s', label: 'prod-eks', kind: 'kube', x: 580, y: 40 },
  { id: 'acct', label: 'nbx-prod-pay', kind: 'cloud', x: 720, y: 40 },
  { id: 'db', label: 'pay-postgres', kind: 'database', x: 720, y: 160, risk: 'critical' },
  { id: 'data', label: 'card-hold', kind: 'database', x: 720, y: 280 },
  { id: 'dep', label: 'libcrypto 1.1', kind: 'application', x: 300, y: 160 },
  { id: 'rsa', label: 'RSA-2048', kind: 'key', x: 300, y: 280, risk: 'quantum' },
  { id: 'cert', label: 'pay.nbx.example', kind: 'certificate', x: 160, y: 280, risk: 'high' },
  { id: 'key', label: 'TLS private key', kind: 'key', x: 40, y: 280 },
  { id: 'model', label: 'fraud-xgb', kind: 'ai', x: 440, y: 160 },
  { id: 'ep', label: 'model-endpoint', kind: 'ai', x: 580, y: 160 },
  { id: 'sec', label: 'DB secret ref', kind: 'secret', x: 580, y: 280, risk: 'critical' },
  { id: 'hsm', label: 'CloudHSM', kind: 'hardware', x: 160, y: 160 },
  { id: 'threat', label: 'Public ALB', kind: 'threat', x: 440, y: 280, risk: 'critical' },
];

export const edges: GEdge[] = [
  { from: 'user', to: 'id', kind: 'identity' },
  { from: 'id', to: 'app', kind: 'identity' },
  { from: 'app', to: 'ctr', kind: 'dependency' },
  { from: 'ctr', to: 'k8s', kind: 'network' },
  { from: 'k8s', to: 'acct', kind: 'network' },
  { from: 'acct', to: 'db', kind: 'data' },
  { from: 'db', to: 'data', kind: 'data' },
  { from: 'app', to: 'dep', kind: 'dependency' },
  { from: 'dep', to: 'rsa', kind: 'crypto' },
  { from: 'rsa', to: 'cert', kind: 'crypto' },
  { from: 'cert', to: 'key', kind: 'crypto' },
  { from: 'app', to: 'model', kind: 'data' },
  { from: 'model', to: 'ep', kind: 'network' },
  { from: 'ep', to: 'data', kind: 'data' },
  { from: 'db', to: 'sec', kind: 'identity' },
  { from: 'hsm', to: 'key', kind: 'crypto' },
  { from: 'threat', to: 'ctr', kind: 'attack' },
  { from: 'threat', to: 'id', kind: 'attack' },
];

export const attackPath = [
  'Internet',
  'Public load balancer',
  'Vulnerable container',
  'Service account',
  'Privileged role',
  'PostgreSQL',
  'Card-hold archive',
];

export const ATTACK_NODE_IDS = ['threat', 'ctr', 'id', 'app', 'db', 'data', 'rsa'];

export const CRYPTO_NODE_IDS = ['rsa', 'cert', 'key', 'hsm', 'dep'];

export const DISCOVERY_STAGES: { label: string; add: string[] }[] = [
  { label: 'Connecting AWS (read-only, demo fixture)…', add: ['acct'] },
  { label: 'Connecting GitHub (public metadata only)…', add: ['dep'] },
  { label: 'Discovering Kubernetes workloads…', add: ['k8s', 'ctr'] },
  { label: 'Discovering certificates…', add: ['cert'] },
  { label: 'Discovering secret references (names only)…', add: ['sec'] },
  { label: 'Discovering cryptographic assets…', add: ['rsa', 'key', 'hsm'] },
  { label: 'Building SBOM…', add: ['app'] },
  { label: 'Building CryptoBOM…', add: ['rsa'] },
  { label: 'Building infrastructure graph…', add: ['user', 'id', 'db'] },
  { label: 'Mapping controls (not certifications)…', add: ['data', 'model', 'ep'] },
  { label: 'Calculating risk…', add: ['threat'] },
];

export function discoveryNodeIds(stageCount: number): string[] {
  const ids = new Set<string>();
  DISCOVERY_STAGES.slice(0, Math.max(0, stageCount)).forEach((s) => s.add.forEach((id) => ids.add(id)));
  return [...ids];
}

export const FINDING_NODE_IDS: Record<string, string[]> = {
  'QSF-1042': ['threat', 'cert', 'rsa', 'app', 'ctr', 'id'],
  'QSF-1048': ['acct', 'data', 'threat'],
  'QSF-1101': ['dep', 'rsa', 'app'],
  'QSF-1114': ['id', 'user', 'threat', 'app'],
  'QSF-1120': ['cert', 'key', 'hsm'],
  'QSF-1133': ['dep', 'app', 'ctr'],
};

export const ASSET_NODE_IDS: Record<string, string[]> = {
  'nbx-prod-pay': ['acct', 'db', 'data'],
  'payments-api': ['app', 'ctr', 'dep', 'rsa'],
  'pay-postgres': ['db', 'sec', 'data'],
  'alb/pay-public': ['threat', 'cert', 'app'],
  'prod-eks': ['k8s', 'ctr'],
  'fraud-xgb': ['model', 'ep'],
  'hsm-eu-1': ['hsm', 'key'],
  'ledger-web': ['dep', 'app'],
  'card-hold': ['data', 'db'],
};

export const DOMAIN_NODE_IDS: Record<string, string[]> = {
  command: ATTACK_NODE_IDS,
  cloud: ['acct', 'k8s', 'threat', 'db', 'data', 'ctr'],
  identity: ['user', 'id', 'app', 'threat'],
  crypto: CRYPTO_NODE_IDS,
  certs: ['cert', 'key', 'hsm', 'rsa'],
  secrets: ['sec', 'db', 'app', 'id'],
  kubernetes: ['k8s', 'ctr', 'app', 'id'],
  workloads: ['app', 'ctr', 'k8s', 'dep', 'threat'],
  data: ['db', 'data', 'sec', 'acct', 'rsa'],
  ai: ['model', 'ep', 'data', 'app', 'id'],
  pqc: ['rsa', 'cert', 'key', 'hsm', 'dep'],
  sbom: ['dep', 'app', 'ctr', 'rsa'],
  hbom: ['hsm', 'key', 'cert'],
  ibom: ['acct', 'k8s', 'db', 'threat', 'app'],
};

export const IDENTITY_NODE_IDS: Record<string, string[]> = {
  'analyst.lee': ['user', 'id'],
  'pay-pod-sa': ['id', 'app', 'ctr', 'db'],
  'pay-admin-role': ['id', 'user', 'threat', 'app'],
  'fraud-infer-sa': ['id', 'model', 'ep'],
  'ci-deploy': ['id', 'k8s', 'ctr'],
};

export const SECRET_NODE_IDS: Record<string, string[]> = {
  PAYMENTS_DB_PASSWORD: ['sec', 'db', 'app'],
  GH_DEPLOY_TOKEN: ['sec', 'dep', 'app'],
  MODEL_ENDPOINT_KEY: ['sec', 'model', 'ep'],
  STRIPE_WEBHOOK_SECRET: ['sec', 'app'],
  HSM_WRAP_REF: ['sec', 'hsm', 'key'],
};

export const CERT_NODE_IDS: Record<string, string[]> = {
  'api.nbx.example': ['cert', 'key', 'app'],
  'pay.nbx.example': ['cert', 'key', 'rsa', 'app', 'threat'],
  'ml.nbx.example': ['cert', 'model', 'ep'],
  'old-settlement.nbx.example': ['cert', 'key', 'rsa'],
  'int.nbx.example': ['cert', 'key'],
  'canary.nbx.example': ['cert', 'hsm', 'rsa'],
};

export const CRYPTO_ASSET_NODE_IDS: Record<string, string[]> = {
  'pay-edge-tls': ['threat', 'cert', 'rsa', 'app'],
  'legacy-hash': ['dep', 'app'],
  'vpn-3des': ['hsm', 'key'],
  'ssh-weak-kex': ['id', 'user'],
  'rc4-internal': ['cert', 'rsa'],
  'api-cert-exp': ['cert', 'key', 'app'],
  'pay-mlkem-pilot': ['rsa', 'cert', 'hsm'],
  'internal-rsa2k': ['rsa', 'cert', 'dep'],
  'ecdsa-signing': ['id', 'key'],
  'ecdh-session': ['cert', 'key'],
};

export const WORKLOAD_NODE_IDS: Record<string, string[]> = {
  'payments-api': ['app', 'ctr', 'k8s', 'dep', 'threat'],
  'ledger-web': ['dep', 'app'],
  settlement: ['app', 'db', 'data'],
  'fraud-infer': ['model', 'ep', 'ctr'],
};

export const CLUSTER_NODE_IDS: Record<string, string[]> = {
  'prod-eks': ['k8s', 'ctr', 'app'],
  'ml-gke': ['k8s', 'model', 'ep'],
  'edge-oke': ['k8s', 'threat'],
};

export const CONTROL_NODE_IDS: Record<string, string[]> = {
  'CIS-2.1.4': ['acct', 'data'],
  'PCI-4.2.1': ['threat', 'cert', 'rsa', 'app'],
  'ISO-A.8.24': ['dep', 'rsa', 'app'],
  'DORA-TRA-04': ['acct', 'data', 'id'],
  'SOC2-CC6.7': ['cert', 'key', 'hsm'],
};

export const POLICY_NODE_IDS: Record<string, string[]> = {
  'NET-01': ['threat', 'acct', 'db'],
  'IAM-07': ['id', 'user', 'app'],
  'ENC-03': ['threat', 'cert', 'rsa'],
  'LOG-02': ['acct', 'user'],
  'STO-04': ['acct', 'data'],
  'K8S-11': ['k8s', 'ctr'],
  'CTR-05': ['ctr', 'app'],
  'SEC-02': ['sec', 'db', 'app'],
  'DAT-09': ['data', 'db', 'rsa'],
  'CMP-01': ['acct', 'id', 'app'],
};

export const SBOM_NODE_IDS: Record<string, string[]> = {
  'node-forge': ['dep', 'app', 'ctr'],
  openssl: ['dep', 'rsa', 'app'],
  'golang.org/x/crypto': ['dep', 'id'],
  bcrypt: ['dep', 'app'],
  'liboqs (pilot)': ['dep', 'rsa', 'hsm'],
};

export const AIBOM_NODE_IDS: Record<string, string[]> = {
  'fraud-xgb': ['model', 'ep', 'data', 'id'],
  'ops-summarizer': ['model', 'user'],
  'kyc-embed': ['model', 'data'],
};

export const HBOM_NODE_IDS: Record<string, string[]> = {
  'hsm-eu-1': ['hsm', 'key'],
  'tpm-bastion-a': ['hsm', 'user'],
  'fw-eu-transit': ['threat', 'key'],
  'dc-berlin-r12': ['k8s', 'hsm'],
};

export const IBOM_NODE_IDS: Record<string, string[]> = {
  'vpc-pay': ['acct', 'threat', 'db'],
  'subnet-pay-a': ['threat', 'acct'],
  'tf-pay-edge': ['threat', 'cert', 'app'],
  'pay-postgres': ['db', 'sec', 'data'],
  'prod-eks': ['k8s', 'ctr'],
  'nbx-pay-artifacts': ['acct', 'data'],
};

export const CLOUD_ACCOUNT_NODE_IDS: Record<string, string[]> = {
  'nbx-prod-core': ['acct', 'k8s'],
  'nbx-prod-pay': ['acct', 'db', 'data', 'threat'],
  'nbx-analytics': ['acct', 'data'],
  'nbx-ml': ['acct', 'model', 'ep'],
  'nbx-edge': ['acct', 'threat'],
  'nbx-hybrid': ['acct', 'hsm', 'k8s'],
};

export function relatedFindingIds(nodeId: string): string[] {
  return Object.entries(FINDING_NODE_IDS)
    .filter(([, ids]) => ids.includes(nodeId))
    .map(([id]) => id);
}

export const topology = [
  { id: 'acct', label: 'AWS Account nbx-prod-pay', kind: 'cloud' as NodeKind, note: 'Production payments' },
  { id: 'vpc', label: 'VPC vpc-pay', kind: 'cloud' as NodeKind, note: '10.8.0.0/16' },
  { id: 'subnet', label: 'Subnet subnet-pay-a', kind: 'cloud' as NodeKind, note: 'public' },
  { id: 'alb', label: 'ALB pay-public', kind: 'threat' as NodeKind, note: 'TLS 1.0 listener' },
  { id: 'ec2', label: 'Node group', kind: 'hardware' as NodeKind, note: 'eks-pay-a' },
  { id: 'ctr', label: 'Container pay-api', kind: 'container' as NodeKind, note: 'pay:1.18.2' },
  { id: 'app', label: 'Application payments-api', kind: 'application' as NodeKind, note: 'PCI scope' },
  { id: 'db', label: 'PostgreSQL pay-postgres', kind: 'database' as NodeKind, note: 'card-hold' },
];

export const nodeDetails: Record<string, { overview: string; risk: string; config: string; network: string; identity: string; vulns: string; secrets: string; data: string; crypto: string; compliance: string; activity: string }> = {
  app: {
    overview: 'payments-api — synthetic production application in the Payments unit.',
    risk: 'High classical + quantum exposure via public TLS 1.0 and RSA-1024 edge.',
    config: 'Declared Terraform module tf-pay-edge. No live cloud attach.',
    network: 'Reached from alb/pay-public. Egress to pay-postgres and model-endpoint.',
    identity: 'Runs as pay-pod-sa (rds:*, s3:*).',
    vulns: 'QSF-1042, QSF-1101 related supply-chain hash.',
    secrets: 'Uses PAYMENTS_DB_PASSWORD reference (name only).',
    data: 'Reads card-hold through PostgreSQL.',
    crypto: 'Edge RSA-1024 / TLS 1.0. Canary ML-KEM-768 hybrid.',
    compliance: 'Mapped to PCI DSS 4.2.1 and DORA ICT risk — mappings only.',
    activity: 'Last fixture refresh 2026-09-06. No customer telemetry.',
  },
  db: {
    overview: 'pay-postgres — synthetic PCI-scope database.',
    risk: 'Critical if reached from public container via privileged role.',
    config: 'Encryption at rest declared AES-256. Unencrypted replica finding in analytics account is separate.',
    network: 'Private subnet. Path exists via service account.',
    identity: 'DB secret reference PAYMENTS_DB_PASSWORD.',
    vulns: 'Privilege path QSF-1114.',
    secrets: 'Secret name only. Value never stored.',
    data: 'card-hold archive, 7-year retention — HNDL hotspot.',
    crypto: 'In-transit TLS 1.3. Archive objects still wrapped with RSA-2048.',
    compliance: 'PCI DSS 3.5, GDPR storage limitation mapping.',
    activity: 'Fixture only.',
  },
};

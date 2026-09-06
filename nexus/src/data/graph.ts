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
    vulns: 'NX-1042, NX-1101 related supply-chain hash.',
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
    vulns: 'Privilege path NX-1114.',
    secrets: 'Secret name only. Value never stored.',
    data: 'card-hold archive, 7-year retention — HNDL hotspot.',
    crypto: 'In-transit TLS 1.3. Archive objects still wrapped with RSA-2048.',
    compliance: 'PCI DSS 3.5, GDPR storage limitation mapping.',
    activity: 'Fixture only.',
  },
};

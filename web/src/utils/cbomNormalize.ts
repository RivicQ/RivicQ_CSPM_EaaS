import { profileForAlgorithm, quantumRiskLabel, securityScore, type CbomRiskLevel } from './complianceCatalog';

export type CbomComponent = {
  id: string;
  name: string;
  algorithm: string;
  keySize?: number;
  quantumSafe: boolean;
  riskLevel: CbomRiskLevel;
  count: number;
  location?: string;
  bsiRef: string;
  doraRef: string;
  eidasRef: string;
  evidence?: string;
};

export type CbomSeverity = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type NormalizedCbomReport = {
  target: string;
  source: 'engine' | 'public-github';
  score: number;
  quantumRisk: string;
  severity: CbomSeverity;
  algorithms: CbomComponent[];
  fileCount?: number;
  commitSha?: string;
  defaultBranch?: string;
  generatedAt: string;
};

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as LooseRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function bool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function riskFromRaw(raw: string | undefined, fallback: CbomRiskLevel): CbomRiskLevel {
  const v = (raw || '').toUpperCase();
  switch (v) {
    case 'CRITICAL':
    case 'HIGH':
    case 'MEDIUM':
    case 'LOW':
      return v;
    default:
      return fallback;
  }
}

export function componentFromFinding(raw: unknown, index: number): CbomComponent {
  const row = asRecord(raw);
  const algorithm = str(row.algorithm ?? row.name ?? row.crypto_algorithm ?? row.cryptoAlgorithm, 'Unknown');
  const keySize = num(row.key_size ?? row.keySize, 0) || undefined;
  const profile = profileForAlgorithm(algorithm, keySize);
  const quantumSafe = bool(row.quantum_safe ?? row.quantumSafe) ?? profile.quantumSafe;
  const riskLevel = riskFromRaw(str(row.risk_level ?? row.riskLevel ?? row.severity), profile.risk);

  return {
    id: str(row.id, `cbom-${index}`),
    name: str(row.name ?? row.title ?? row.description, profile.name),
    algorithm: profile.name,
    keySize: keySize || profile.keySize,
    quantumSafe,
    riskLevel,
    count: Math.max(1, num(row.count, 1)),
    location: str(row.location ?? row.file_path ?? row.filePath ?? row.path, '') || undefined,
    bsiRef: str(row.bsi_ref ?? row.bsiRef, profile.bsiRef),
    doraRef: str(row.dora_ref ?? row.doraRef, profile.doraRef),
    eidasRef: str(row.eidas_ref ?? row.eidasRef, profile.eidasRef),
    evidence: str(row.evidence ?? row.description, '') || undefined,
  };
}

export function severityFromComponents(components: CbomComponent[]): CbomSeverity {
  return components.reduce<CbomSeverity>(
    (acc, c) => {
      const bucket = c.riskLevel.toLowerCase() as keyof CbomSeverity;
      acc[bucket] += c.count;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
}

export function normalizeEngineReport(target: string, data: unknown): NormalizedCbomReport {
  const row = asRecord(data);
  const findings = asRecord(row.findings || row.summary);
  const list = [
    ...asArray(row.algorithms),
    ...asArray(row.crypto_findings),
    ...asArray(row.cryptoFindings),
    ...asArray(row.components),
    ...asArray(row.cbom),
  ];
  const algorithms = list.map(componentFromFinding);
  const severity: CbomSeverity = {
    critical: num(findings.critical ?? row.critical, 0) || algorithms.filter((a) => a.riskLevel === 'CRITICAL').reduce((s, a) => s + a.count, 0),
    high: num(findings.high ?? row.high, 0) || algorithms.filter((a) => a.riskLevel === 'HIGH').reduce((s, a) => s + a.count, 0),
    medium: num(findings.medium ?? row.medium, 0) || algorithms.filter((a) => a.riskLevel === 'MEDIUM').reduce((s, a) => s + a.count, 0),
    low: num(findings.low ?? row.low, 0) || algorithms.filter((a) => a.riskLevel === 'LOW').reduce((s, a) => s + a.count, 0),
  };
  const vuln = algorithms.filter((a) => !a.quantumSafe).length;
  return {
    target,
    source: 'engine',
    score: num(row.security_score ?? row.score ?? findings.score, securityScore(severity.critical, severity.high, severity.medium, severity.low)),
    quantumRisk: str(row.quantum_risk ?? row.quantumRisk, quantumRiskLabel(vuln, algorithms.length)),
    severity,
    algorithms,
    fileCount: num(row.file_count ?? row.fileCount, 0) || undefined,
    commitSha: str(row.commit_sha ?? row.commitSha) || undefined,
    defaultBranch: str(row.default_branch ?? row.defaultBranch) || undefined,
    generatedAt: new Date().toISOString(),
  };
}

export function emptyInventorySummary() {
  return {
    total_assets: 0,
    compliance_score: 0,
    by_category: {} as Record<string, number>,
    by_cloud_provider: {} as Record<string, number>,
    quantum_safe_count: 0,
    non_quantum_safe: 0,
    vulnerable_assets: 0,
  };
}

export function liveAssetsFromPayload(data: unknown): any[] {
  const list = Array.isArray(data) ? data : ((data as any)?.assets ?? (data as any)?.items ?? []);
  return Array.isArray(list) ? list : [];
}

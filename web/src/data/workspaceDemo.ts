/** Demo payloads when live APIs return sparse or empty data. Sourced from the labelled enterprise simulation. */
import { getEnterpriseSimulation, simulationInventorySummary } from './enterprise/simulation';

const sim = getEnterpriseSimulation();

export const DEMO_ASSETS = sim.assets.map((a) => ({
  id: a.id,
  name: a.name,
  category: a.algorithm ? 'cryptographic' : a.type,
  cloud_provider: a.provider,
  algorithm: a.algorithm,
  crypto_algorithm: a.algorithm,
  risk_level: a.riskLevel,
  quantum_safe: !!a.quantumSafe,
  discovered_at: new Date().toISOString(),
  location: a.region,
  owner: a.identity,
  internet_exposed: a.internetExposed,
  data_kind: 'demo' as const,
}));

export const DEMO_INVENTORY_SUMMARY = simulationInventorySummary();

export const DEMO_SCAN_FINDINGS = sim.openFindings.slice(0, 8).map((f) => ({
  id: f.id,
  severity: f.severity,
  title: f.title,
  asset: f.assetName,
  recommendation: f.cveId
    ? `Real CVE ${f.cveId} on a simulated asset — patch or isolate ${f.assetName}.`
    : f.message,
}));

export const DEMO_SCAN_SCHEDULES = [
  { id: 'sch-1', name: 'Nightly full CBOM', cron: '0 2 * * *', target: 'all-connected-accounts', type: 'full', status: 'active', nextRun: 'Tonight 02:00 UTC' },
  { id: 'sch-2', name: 'Weekly compliance', cron: '0 6 * * 1', target: 'production/*', type: 'compliance', status: 'active', nextRun: 'Mon 06:00 UTC' },
  { id: 'sch-3', name: 'Container registry quick scan', cron: '0 */4 * * *', target: 'ghcr.io/org/*', type: 'quick', status: 'paused', nextRun: '—' },
];

export const DEMO_ANALYTICS_INSIGHTS = [
  { title: 'Post-quantum readiness improving', description: 'PQC-ready assets increased 8% week-over-week after ML-KEM rollout in Kubernetes secrets.', severity: 'medium', confidence: 0.88, type: 'posture_summary' },
  { title: '3DES keys require migration', description: 'Two legacy HSM keys still use 3DES — blocked for SOX and PCI-DSS conformance packs.', severity: 'critical', confidence: 0.92, type: 'critical_algorithm' },
  { title: 'Cloud KMS drift detected', description: '4 AWS KMS aliases lack automatic rotation; 1 GCP key ring missing uniform access.', severity: 'high', confidence: 0.81, type: 'config_drift' },
  { title: 'Scan coverage gap in Azure', description: 'Only 5 Azure resources inventoried vs 80 AWS — connect Azure subscription to improve coverage.', severity: 'low', confidence: 0.76, type: 'coverage' },
];

export const DEMO_POSTURE_TREND = [
  { label: 'Mon', score: 68 }, { label: 'Tue', score: 70 }, { label: 'Wed', score: 71 },
  { label: 'Thu', score: 72 }, { label: 'Fri', score: 74 }, { label: 'Sat', score: 74 }, { label: 'Sun', score: 75 },
];

export const DEMO_REPORTS = [
  { id: 'rpt-1', name: 'Weekly Posture Report', type: 'executive', generated_at: new Date().toISOString(), pages: 12, format: 'PDF' },
  { id: 'rpt-2', name: 'PQC Migration Readiness', type: 'technical', generated_at: new Date(Date.now() - 86400000).toISOString(), pages: 24, format: 'PDF' },
  { id: 'rpt-3', name: 'SOC 2 Crypto Controls', type: 'compliance', generated_at: new Date(Date.now() - 172800000).toISOString(), pages: 18, format: 'CSV' },
];

export const DEMO_FORECAST = [
  { quarter: 'Q3 2026', projected_score: 78, migration_pct: 62, note: 'Baseline with current velocity' },
  { quarter: 'Q4 2026', projected_score: 84, migration_pct: 71, note: 'After HSM PQC pilot' },
  { quarter: 'Q1 2027', projected_score: 91, migration_pct: 85, note: 'Target for NIST PQC cutover' },
];

export function normalizeAssets(data: unknown): any[] {
  const list = Array.isArray(data) ? data : ((data as any)?.assets ?? (data as any)?.items ?? []);
  if (list.length) return list;
  if ((data as any)?.source === 'cbom_scans') return [];
  if ((data as any)?.demo_mode === true) return DEMO_ASSETS;
  return DEMO_ASSETS;
}

export function normalizeSummary(data: unknown): typeof DEMO_INVENTORY_SUMMARY {
  if (!data || typeof data !== 'object') return DEMO_INVENTORY_SUMMARY;
  const d = data as Record<string, unknown>;
  if (d.source === 'cbom_scans' && Number(d.total_assets ?? 0) === 0) {
    return { ...DEMO_INVENTORY_SUMMARY, total_assets: 0, quantum_safe_count: 0, non_quantum_safe: 0, vulnerable_assets: 0, compliance_score: 0 };
  }
  const rawCategory = (d.by_category ?? d.byCategory ?? {}) as Record<string, number>;
  const rawCloud = (d.by_cloud_provider ?? d.byCloudProvider ?? {}) as Record<string, number>;
  return {
    ...DEMO_INVENTORY_SUMMARY,
    total_assets: Number(d.total_assets ?? d.totalAssets ?? DEMO_INVENTORY_SUMMARY.total_assets),
    compliance_score: Number(d.compliance_score ?? d.complianceScore ?? DEMO_INVENTORY_SUMMARY.compliance_score),
    by_category: { ...DEMO_INVENTORY_SUMMARY.by_category, ...rawCategory },
    by_cloud_provider: { ...DEMO_INVENTORY_SUMMARY.by_cloud_provider, ...rawCloud },
    quantum_safe_count: Number(d.quantum_safe_count ?? d.quantumSafeCount ?? DEMO_INVENTORY_SUMMARY.quantum_safe_count),
    non_quantum_safe: Number(d.non_quantum_safe ?? d.nonQuantumSafe ?? DEMO_INVENTORY_SUMMARY.non_quantum_safe),
    vulnerable_assets: Number(d.vulnerable_assets ?? d.vulnerableAssets ?? DEMO_INVENTORY_SUMMARY.vulnerable_assets),
  };
}

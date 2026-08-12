/** Rich demo payloads when live APIs return sparse or empty data. */
export const DEMO_ASSETS = [
  { id: 'asset-1', name: 'prod-api TLS cert', category: 'cryptographic', cloud_provider: 'aws', algorithm: 'RSA-2048', crypto_algorithm: 'RSA-2048', key_size: 2048, risk_level: 'HIGH', quantum_safe: false, discovered_at: new Date().toISOString(), location: 'us-east-1', owner: 'platform-team' },
  { id: 'asset-2', name: 'azure-keyvault-prod', category: 'cryptographic', cloud_provider: 'azure', algorithm: 'AES-256', crypto_algorithm: 'AES-256', key_size: 256, risk_level: 'LOW', quantum_safe: true, discovered_at: new Date().toISOString(), location: 'westeurope', owner: 'security-ops' },
  { id: 'asset-3', name: 'gcs-bucket-keys', category: 'cryptographic', cloud_provider: 'gcp', algorithm: 'ECDSA P-256', crypto_algorithm: 'ECDSA', key_size: 256, risk_level: 'MEDIUM', quantum_safe: false, discovered_at: new Date().toISOString(), location: 'europe-west1', owner: 'data-platform' },
  { id: 'asset-4', name: 'k8s-secrets-tls', category: 'cryptographic', cloud_provider: 'kubernetes', algorithm: 'ML-KEM-768', crypto_algorithm: 'ML-KEM', key_size: 768, risk_level: 'LOW', quantum_safe: true, discovered_at: new Date().toISOString(), location: 'cluster-prod', owner: 'devops' },
  { id: 'asset-5', name: 'legacy-3des-hsm', category: 'cryptographic', cloud_provider: 'aws', algorithm: '3DES', crypto_algorithm: '3DES', key_size: 168, risk_level: 'CRITICAL', quantum_safe: false, discovered_at: new Date().toISOString(), location: 'us-west-2', owner: 'payments' },
  { id: 'asset-6', name: 'jwt-signing-key', category: 'cryptographic', cloud_provider: 'aws', algorithm: 'RSA-4096', crypto_algorithm: 'RSA-4096', key_size: 4096, risk_level: 'HIGH', quantum_safe: false, discovered_at: new Date().toISOString(), location: 'us-east-1', owner: 'identity' },
  { id: 'asset-7', name: 'ibm-hpcs-master', category: 'hardware', cloud_provider: 'ibm_cloud', algorithm: 'AES-256-GCM', crypto_algorithm: 'AES-256-GCM', key_size: 256, risk_level: 'LOW', quantum_safe: true, discovered_at: new Date().toISOString(), location: 'eu-de', owner: 'crypto-services' },
  { id: 'asset-8', name: 'ml-model-signing', category: 'ai', cloud_provider: 'gcp', algorithm: 'Ed25519', crypto_algorithm: 'Ed25519', key_size: 256, risk_level: 'MEDIUM', quantum_safe: false, discovered_at: new Date().toISOString(), location: 'us-central1', owner: 'ml-platform' },
];

export const DEMO_INVENTORY_SUMMARY = {
  total_assets: 150,
  compliance_score: 74,
  by_category: { cryptographic: 89, ai: 12, hardware: 24, software: 18, infrastructure: 7 },
  by_cloud_provider: { aws: 80, gcp: 45, ibm_cloud: 20, azure: 5 },
  quantum_safe_count: 94,
  non_quantum_safe: 56,
  vulnerable_assets: 23,
};

export const DEMO_SCAN_FINDINGS = [
  { id: 'f-1', severity: 'critical', title: 'Weak TLS cipher suite', asset: 'prod-api TLS cert', recommendation: 'Disable RSA key exchange; enable TLS 1.3 with PFS.' },
  { id: 'f-2', severity: 'critical', title: 'Legacy 3DES in HSM', asset: 'legacy-3des-hsm', recommendation: 'Migrate to AES-256 or ML-KEM wrapped keys.' },
  { id: 'f-3', severity: 'high', title: 'JWT signing key size below policy', asset: 'jwt-signing-key', recommendation: 'Rotate to ML-DSA or ECDSA with HSM backing.' },
  { id: 'f-4', severity: 'medium', title: 'ECDSA P-256 harvest risk', asset: 'gcs-bucket-keys', recommendation: 'Plan PQC hybrid migration for long-lived signatures.' },
  { id: 'f-5', severity: 'low', title: 'Key rotation interval exceeded', asset: 'azure-keyvault-prod', recommendation: 'Enable automatic 90-day rotation.' },
];

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
  return list.length ? list : DEMO_ASSETS;
}

export function normalizeSummary(data: unknown): typeof DEMO_INVENTORY_SUMMARY {
  if (!data || typeof data !== 'object') return DEMO_INVENTORY_SUMMARY;
  const d = data as Record<string, unknown>;
  const rawCategory = (d.by_category ?? d.byCategory ?? {}) as Record<string, number>;
  const rawCloud = (d.by_cloud_provider ?? d.byCloudProvider ?? {}) as Record<string, number>;
  return {
    total_assets: Number(d.total_assets ?? d.totalAssets ?? DEMO_INVENTORY_SUMMARY.total_assets),
    compliance_score: Number(d.compliance_score ?? d.complianceScore ?? DEMO_INVENTORY_SUMMARY.compliance_score),
    by_category: { ...DEMO_INVENTORY_SUMMARY.by_category, ...rawCategory },
    by_cloud_provider: { ...DEMO_INVENTORY_SUMMARY.by_cloud_provider, ...rawCloud },
    quantum_safe_count: Number(d.quantum_safe_count ?? d.quantumSafeCount ?? DEMO_INVENTORY_SUMMARY.quantum_safe_count),
    non_quantum_safe: Number(d.non_quantum_safe ?? d.nonQuantumSafe ?? DEMO_INVENTORY_SUMMARY.non_quantum_safe),
    vulnerable_assets: Number(d.vulnerable_assets ?? d.vulnerableAssets ?? DEMO_INVENTORY_SUMMARY.vulnerable_assets),
  };
}

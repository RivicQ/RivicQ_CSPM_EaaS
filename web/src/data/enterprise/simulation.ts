import { CVE_CATALOG } from './cves';
import { CONTROL_CATALOG, FRAMEWORK_META, summarizeFramework } from './frameworks';
import { calculateAssetRisk, calculatePostureScore, meanTimeToRemediateHours } from './scoring';
import { INDUSTRY_INITIAL_ACCESS, PROVENANCE } from './sources';
import type {
  ControlResult,
  DashboardViewModel,
  SimulatedAccount,
  SimulatedAsset,
  SimulatedFinding,
} from './types';

export const SIM_VERSION = 'enterprise-sim-v1.0';
export const SIM_SEED = 20250818;

/** Resource composition — the simulation definition. Totals are summed, not invented in the UI. */
export const COMPOSITION = {
  vms: 3214,
  containers: 4860,
  clusters: 38,
  storage: 1280,
  databases: 436,
  functions: 1840,
  network: 2212,
  secrets: 2140,
  queues: 890,
  disks: 1832,
  identities: 12680,
  findingsTotal: 8426,
  findingsResolved: 6184,
  findingsOpen: 2242,
  findingsAll: { critical: 186, high: 1047, medium: 3284, low: 3909 },
  findingsOpenBySev: { critical: 49, high: 279, medium: 874, low: 1040 },
} as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function relativeTime(iso: string, now: number): string {
  const delta = Math.max(0, now - Date.parse(iso));
  const m = Math.round(delta / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const ACCOUNT_DEFS: Array<Omit<SimulatedAccount, 'exposed' | 'criticalAssets'> & { exposed: number; criticalAssets: number }> = [
  { id: 'aws-prod-core', provider: 'aws', name: 'AWS Production Core', environment: 'prod', region: 'us-east-1', resources: 2540, exposed: 62, criticalAssets: 148 },
  { id: 'aws-prod-payments', provider: 'aws', name: 'AWS Payments', environment: 'prod', region: 'us-east-1', resources: 1680, exposed: 18, criticalAssets: 96 },
  { id: 'aws-prod-data', provider: 'aws', name: 'AWS Data Platform', environment: 'prod', region: 'us-west-2', resources: 1420, exposed: 22, criticalAssets: 71 },
  { id: 'aws-prod-identity', provider: 'aws', name: 'AWS Identity', environment: 'prod', region: 'us-east-1', resources: 980, exposed: 9, criticalAssets: 54 },
  { id: 'aws-staging', provider: 'aws', name: 'AWS Staging', environment: 'staging', region: 'eu-west-1', resources: 760, exposed: 31, criticalAssets: 22 },
  { id: 'aws-sandbox', provider: 'aws', name: 'AWS Sandbox', environment: 'sandbox', region: 'eu-central-1', resources: 420, exposed: 44, criticalAssets: 8 },
  { id: 'aws-prod-ml', provider: 'aws', name: 'AWS ML Workloads', environment: 'prod', region: 'us-east-2', resources: 890, exposed: 11, criticalAssets: 39 },
  { id: 'aws-prod-network', provider: 'aws', name: 'AWS Network Edge', environment: 'prod', region: 'us-east-1', resources: 640, exposed: 28, criticalAssets: 41 },
  { id: 'aws-prod-backup', provider: 'aws', name: 'AWS Backup', environment: 'prod', region: 'us-west-2', resources: 510, exposed: 4, criticalAssets: 33 },
  { id: 'aws-prod-logs', provider: 'aws', name: 'AWS Logging', environment: 'prod', region: 'eu-west-1', resources: 380, exposed: 7, criticalAssets: 12 },
  { id: 'aws-dr-west', provider: 'aws', name: 'AWS DR West', environment: 'prod', region: 'us-west-2', resources: 720, exposed: 6, criticalAssets: 47 },
  { id: 'aws-shared-services', provider: 'aws', name: 'AWS Shared Services', environment: 'prod', region: 'us-east-1', resources: 540, exposed: 8, criticalAssets: 29 },
  { id: 'azure-prod-core', provider: 'azure', name: 'Azure Production', environment: 'prod', region: 'westeurope', resources: 980, exposed: 14, criticalAssets: 58 },
  { id: 'azure-prod-identity', provider: 'azure', name: 'Azure Entra ID', environment: 'prod', region: 'northeurope', resources: 640, exposed: 5, criticalAssets: 44 },
  { id: 'azure-prod-data', provider: 'azure', name: 'Azure Data', environment: 'prod', region: 'westeurope', resources: 520, exposed: 6, criticalAssets: 27 },
  { id: 'azure-prod-apps', provider: 'azure', name: 'Azure Apps', environment: 'prod', region: 'eastus', resources: 710, exposed: 12, criticalAssets: 31 },
  { id: 'azure-staging', provider: 'azure', name: 'Azure Staging', environment: 'staging', region: 'ukwest', resources: 340, exposed: 9, criticalAssets: 7 },
  { id: 'azure-dr', provider: 'azure', name: 'Azure DR', environment: 'prod', region: 'eastus2', resources: 410, exposed: 3, criticalAssets: 19 },
  { id: 'azure-shared', provider: 'azure', name: 'Azure Shared', environment: 'prod', region: 'westeurope', resources: 280, exposed: 2, criticalAssets: 11 },
  { id: 'gcp-prod-core', provider: 'gcp', name: 'GCP Production', environment: 'prod', region: 'europe-west1', resources: 1120, exposed: 8, criticalAssets: 42 },
  { id: 'gcp-prod-data', provider: 'gcp', name: 'GCP Analytics', environment: 'prod', region: 'us-central1', resources: 860, exposed: 5, criticalAssets: 28 },
  { id: 'gcp-prod-ml', provider: 'gcp', name: 'GCP ML Platform', environment: 'prod', region: 'us-central1', resources: 740, exposed: 4, criticalAssets: 21 },
  { id: 'gcp-staging', provider: 'gcp', name: 'GCP Staging', environment: 'staging', region: 'europe-west4', resources: 390, exposed: 6, criticalAssets: 6 },
  { id: 'gcp-shared', provider: 'gcp', name: 'GCP Shared VPC', environment: 'prod', region: 'europe-west1', resources: 672, exposed: 3, criticalAssets: 8 },
];

const ALGORITHMS = [
  { name: 'AES-256-GCM', q: true, weight: 34 },
  { name: 'RSA-2048', q: false, weight: 22 },
  { name: 'ECDSA P-256', q: false, weight: 14 },
  { name: 'ML-KEM-768', q: true, weight: 9 },
  { name: 'RSA-4096', q: false, weight: 8 },
  { name: 'Ed25519', q: false, weight: 7 },
  { name: '3DES', q: false, weight: 3 },
  { name: 'ML-DSA-65', q: true, weight: 3 },
];

const ASSET_TYPES = ['vm', 'container', 'bucket', 'database', 'function', 'load-balancer', 'api', 'secret', 'role'];

function weightedAlgo(rng: () => number) {
  const total = ALGORITHMS.reduce((s, a) => s + a.weight, 0);
  let n = rng() * total;
  for (const a of ALGORITHMS) {
    n -= a.weight;
    if (n <= 0) return a;
  }
  return ALGORITHMS[0];
}

function buildAccounts(): SimulatedAccount[] {
  return ACCOUNT_DEFS.map((a) => ({ ...a }));
}

function buildAssets(accounts: SimulatedAccount[], rng: () => number): SimulatedAsset[] {
  const assets: SimulatedAsset[] = [];
  accounts.forEach((acct, ai) => {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const type = ASSET_TYPES[(ai + i) % ASSET_TYPES.length];
      const algo = type === 'secret' || type === 'api' || type === 'load-balancer' || i === 0 ? weightedAlgo(rng) : undefined;
      const internetExposed = acct.exposed > 10 ? rng() < 0.35 : rng() < 0.12;
      const privilegedIam = type === 'role' || rng() < 0.18;
      const misconfig = rng() < 0.28;
      const cveHit = rng() < 0.22;
      const kev = cveHit && rng() < 0.55;
      const flags = {
        criticalCve: cveHit && rng() < 0.4,
        kev,
        internetExposed,
        privilegedIam,
        misconfig,
        quantumUnsafe: algo ? !algo.q : false,
      };
      const risk = calculateAssetRisk(flags);
      assets.push({
        id: `${acct.id}-res-${i + 1}`,
        name: `${acct.provider}-${type}-${acct.region}-${String(i + 1).padStart(2, '0')}`,
        type,
        provider: acct.provider,
        accountId: acct.id,
        region: acct.region,
        network: `${acct.provider}-vpc-${acct.region}`,
        identity: privilegedIam ? `${acct.id}-admin-role` : `${acct.id}-workload-sa`,
        internetExposed,
        critical: acct.environment === 'prod' && (flags.criticalCve || internetExposed),
        algorithm: algo?.name,
        quantumSafe: algo?.q,
        riskScore: risk.score,
        riskLevel: risk.level,
        riskContributors: risk.contributors,
      });
    }
  });
  return assets;
}

function buildFindings(assets: SimulatedAsset[], rng: () => number, now: number): SimulatedFinding[] {
  const findings: SimulatedFinding[] = [];
  const cves = CVE_CATALOG.filter((c) => c.cvss >= 7);
  let n = 0;

  const push = (partial: Omit<SimulatedFinding, 'id' | 'ageDays'>) => {
    n += 1;
    const ageDays = Math.max(0, Math.round((now - Date.parse(partial.discoveredAt)) / 86400000));
    findings.push({ ...partial, id: `f-${String(n).padStart(3, '0')}`, ageDays });
  };

  cves.forEach((cve, idx) => {
    const occurrences = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < occurrences; i++) {
      const asset = assets[(idx * 3 + i) % assets.length];
      const hoursAgo = 2 + Math.floor(rng() * (cve.kev ? 96 : 360));
      const discoveredAt = new Date(now - hoursAgo * 3600000).toISOString();
      const open = rng() < (cve.kev ? 0.72 : 0.45);
      const sev = cve.severity.toLowerCase() as SimulatedFinding['severity'];
      const severity: SimulatedFinding['severity'] =
        sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low' ? sev : 'high';
      push({
        title: `${cve.id} — Real vulnerability`,
        severity,
        status: open ? 'open' : 'resolved',
        category: 'vulnerability',
        assetId: asset.id,
        assetName: asset.name,
        accountId: asset.accountId,
        provider: asset.provider,
        region: asset.region,
        cveId: cve.id,
        discoveredAt,
        resolvedAt: open ? undefined : new Date(Date.parse(discoveredAt) + (18 + rng() * 72) * 3600000).toISOString(),
        message: `${cve.id} — Real vulnerability. Detected on simulated asset ${asset.name} (${asset.provider.toUpperCase()} ${asset.region}). ${cve.affectedProduct}. CISA KEV: ${cve.kev ? 'Yes' : 'No'}. CVSS ${cve.cvss}.`,
      });
    }
  });

  const misconfigs = [
    { title: 'Storage bucket allows public write', severity: 'critical' as const, category: 'misconfiguration' as const, control: 'CIS-3.3', fw: 'cis' },
    { title: 'Security group exposes SSH to 0.0.0.0/0', severity: 'high' as const, category: 'exposure' as const, control: 'CIS-12.2', fw: 'cis' },
    { title: 'IAM policy grants Action:* on KMS', severity: 'critical' as const, category: 'identity' as const, control: 'A.8.2', fw: 'iso27001' },
    { title: 'Workload identity missing MFA on break-glass role', severity: 'high' as const, category: 'identity' as const, control: 'CIS-6.5', fw: 'cis' },
    { title: 'KMS / Key Vault rotation disabled', severity: 'medium' as const, category: 'misconfiguration' as const, control: 'A.8.24', fw: 'iso27001' },
    { title: 'TLS endpoint allows static RSA key exchange', severity: 'high' as const, category: 'misconfiguration' as const, control: 'BSI-TR-02102-TLS', fw: 'bsi' },
    { title: '3DES still enabled on payment HSM partition', severity: 'critical' as const, category: 'misconfiguration' as const, control: 'BSI-TR-02102-AES', fw: 'bsi' },
    { title: 'API gateway missing request authentication', severity: 'high' as const, category: 'exposure' as const, control: 'NIS2-Art21.2.j', fw: 'nis2' },
    { title: 'Cloud SQL instance has public IP', severity: 'high' as const, category: 'exposure' as const, control: 'PCI-4.2', fw: 'pci' },
    { title: 'Uniform bucket-level access not enforced', severity: 'medium' as const, category: 'misconfiguration' as const, control: 'A.8.3', fw: 'iso27001' },
    { title: 'Service account keys older than 90 days', severity: 'medium' as const, category: 'identity' as const, control: 'PR.AA-01', fw: 'nist' },
    { title: 'Admin audit log sink missing', severity: 'low' as const, category: 'compliance' as const, control: 'A.8.15', fw: 'iso27001' },
  ];

  misconfigs.forEach((m, idx) => {
    const copies = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < copies; i++) {
      const asset = assets[(idx * 2 + i + 4) % assets.length];
      const hoursAgo = 1 + Math.floor(rng() * 200);
      const discoveredAt = new Date(now - hoursAgo * 3600000).toISOString();
      const open = rng() < 0.55;
      push({
        title: m.title,
        severity: m.severity,
        status: open ? 'open' : 'resolved',
        category: m.category,
        assetId: asset.id,
        assetName: asset.name,
        accountId: asset.accountId,
        provider: asset.provider,
        region: asset.region,
        controlId: m.control,
        framework: FRAMEWORK_META[m.fw]?.name || m.fw,
        discoveredAt,
        resolvedAt: open ? undefined : new Date(Date.parse(discoveredAt) + (8 + rng() * 40) * 3600000).toISOString(),
        message: `${m.title} on simulated ${asset.name}. Control ${m.control}.`,
      });
    }
  });

  return findings;
}

function buildControls(rng: () => number, findings: SimulatedFinding[]): ControlResult[] {
  const failedControls = new Set(
    findings.filter((f) => f.status === 'open' && f.severity === 'critical' && f.controlId).map((f) => f.controlId as string),
  );
  return CONTROL_CATALOG.map((c) => {
    let status: ControlResult['status'] = 'passed';
    if (failedControls.has(c.id)) status = 'failed';
    else if (c.critical && rng() < 0.12) status = 'failed';
    else if (rng() < 0.08) status = 'partial';
    else if (rng() < 0.03) status = 'na';
    return {
      id: c.id,
      framework: c.framework,
      title: c.title,
      status,
      critical: !!c.critical,
      evidence: status === 'passed'
        ? 'Simulation: matching findings closed or not present.'
        : `Simulation: linked to open findings in ${c.framework}.`,
    };
  });
}

function buildHeatmap(findings: SimulatedFinding[], timeRange: '7d' | '30d', now: number) {
  const cols = timeRange === '7d' ? 7 : 10;
  const cells = timeRange === '7d' ? 28 : 30;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const windowMs = timeRange === '7d' ? 7 * 86400000 : 30 * 86400000;
  const buckets = Array.from({ length: cells }, () => ({ count: 0, max: 0 }));
  findings.forEach((f) => {
    const t = Date.parse(f.discoveredAt);
    if (now - t > windowMs || t > now) return;
    const idx = Math.min(cells - 1, Math.floor(((now - t) / windowMs) * cells));
    const cell = buckets[cells - 1 - idx];
    cell.count += 1;
    const rank = { low: 1, medium: 2, high: 3, critical: 4 }[f.severity];
    cell.max = Math.max(cell.max, rank);
  });
  return buckets.map((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: `hm-${timeRange}-${i}`,
      risk: b.max,
      count: b.count,
      day: days[col % 7],
      label: `${days[col % 7]} · Week ${row + 1} · ${b.count} findings`,
    };
  });
}

function buildTrend(score: number, openFindings: number, timeRange: '7d' | '30d', rng: () => number) {
  const points = timeRange === '7d' ? 7 : 12;
  const labels = timeRange === '7d'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];
  return labels.slice(0, points).map((label, i) => {
    const drift = (points - 1 - i) * 0.9 + (rng() - 0.5) * 1.4;
    const s = Math.min(100, Math.max(52, Math.round((score - drift) * 10) / 10));
    return {
      label,
      score: s,
      findings: Math.max(0, Math.round(openFindings - i * (timeRange === '7d' ? 6 : 18) + (rng() * 8 - 4))),
      scans: 4 + Math.floor(rng() * 6),
    };
  });
}

let cache: { key: string; value: DashboardViewModel } | null = null;

export function getEnterpriseSimulation(opts?: { timeRange?: '7d' | '30d'; now?: number }): DashboardViewModel {
  const timeRange = opts?.timeRange || '7d';
  const now = opts?.now ?? Date.now();
  const key = `${timeRange}|${Math.floor(now / 60000)}`;
  if (cache && cache.key === key) return cache.value;

  const rng = mulberry32(SIM_SEED);
  const accounts = buildAccounts();
  const assets = buildAssets(accounts, rng);
  const findings = buildFindings(assets, rng, now);
  const controls = buildControls(rng, findings);
  const frameworks = Object.keys(FRAMEWORK_META).map((fw) =>
    summarizeFramework(fw, controls.filter((c) => c.framework === fw)),
  );
  const openFindings = findings.filter((f) => f.status === 'open');
  const resolved = findings.filter((f) => f.status === 'resolved' && f.resolvedAt) as Array<SimulatedFinding & { resolvedAt: string }>;

  const cryptoAssets = assets.filter((a) => a.algorithm);
  const quantumSafe = cryptoAssets.filter((a) => a.quantumSafe).length;
  const vulnerable = cryptoAssets.length - quantumSafe;
  const quantumUnsafeShare = cryptoAssets.length ? vulnerable / cryptoAssets.length : 0.4;

  const failedCritical = controls.filter((c) => c.critical && c.status === 'failed').length;
  const kevOpen = openFindings.filter((f) => f.cveId && CVE_CATALOG.find((c) => c.id === f.cveId)?.kev).length;
  const exposedAssets = ACCOUNT_DEFS.reduce((s, a) => s + a.exposed, 0);
  const criticalAssets = ACCOUNT_DEFS.reduce((s, a) => s + a.criticalAssets, 0);
  const totalAssets = ACCOUNT_DEFS.reduce((s, a) => s + a.resources, 0);
  const unscanned = ACCOUNT_DEFS.reduce((s, a) => {
    if (a.environment === 'sandbox') return s + a.resources;
    if (a.environment === 'staging') return s + Math.round(a.resources * 0.35);
    return s;
  }, 0);
  const scanCoverage = Math.round(((totalAssets - unscanned) / totalAssets) * 1000) / 10;

  const posture = calculatePostureScore({
    assets: totalAssets,
    openCritical: COMPOSITION.findingsOpenBySev.critical,
    openHigh: COMPOSITION.findingsOpenBySev.high,
    exposed: exposedAssets,
    kevOpen: Math.max(kevOpen, 14),
    failedCriticalControls: failedCritical,
    quantumUnsafeShare,
  });

  const providerTotals: Record<string, number> = { AWS: 0, Azure: 0, GCP: 0 };
  accounts.forEach((a) => {
    const name = a.provider === 'aws' ? 'AWS' : a.provider === 'azure' ? 'Azure' : 'GCP';
    providerTotals[name] += a.resources;
  });
  // Kubernetes workloads are counted inside cloud accounts; surface cluster count separately.
  const providerData = Object.entries(providerTotals).map(([name, value]) => ({ name, value }));

  const algoCounts: Record<string, number> = {};
  const algoWeights = ALGORITHMS.reduce((s, a) => s + a.weight, 0);
  ALGORITHMS.forEach((a) => {
    algoCounts[a.name] = Math.round((a.weight / algoWeights) * COMPOSITION.secrets);
  });
  const algorithmData = Object.entries(algoCounts).map(([name, value]) => ({ name, value }));

  const riskBuckets = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  assets.forEach((a) => { riskBuckets[a.riskLevel] += 1; });
  // Scale sample classification to estate size while keeping ratios.
  const sampleN = assets.length || 1;
  const riskData = (Object.keys(riskBuckets) as Array<keyof typeof riskBuckets>).map((name) => ({
    name,
    value: Math.round((riskBuckets[name] / sampleN) * totalAssets),
  }));

  const scans = [
    { id: 'scan-1', target: 'prod-api.payments.internal', status: 'completed' as const, time: relativeTime(new Date(now - 12 * 60000).toISOString(), now), findings: 3 },
    { id: 'scan-2', target: 'eks-prod-west / default', status: 'running' as const, time: relativeTime(new Date(now - 28 * 60000).toISOString(), now) },
    { id: 'scan-3', target: 's3://crypto-assets-prod', status: 'completed' as const, time: relativeTime(new Date(now - 58 * 60000).toISOString(), now), findings: 7 },
    { id: 'scan-4', target: 'github.com/org/payments-api', status: 'completed' as const, time: relativeTime(new Date(now - 2.1 * 3600000).toISOString(), now), findings: 4 },
    { id: 'scan-5', target: 'azure-keyvault-prod', status: 'failed' as const, time: relativeTime(new Date(now - 3.2 * 3600000).toISOString(), now) },
    { id: 'scan-6', target: 'gke-analytics-eu', status: 'completed' as const, time: relativeTime(new Date(now - 5.4 * 3600000).toISOString(), now), findings: 2 },
  ];

  const feed = openFindings
    .slice()
    .sort((a, b) => Date.parse(b.discoveredAt) - Date.parse(a.discoveredAt))
    .slice(0, 8)
    .map((f) => ({
      time: relativeTime(f.discoveredAt, now),
      severity: f.severity,
      message: f.message,
      findingId: f.id,
    }));

  const mttr = meanTimeToRemediateHours(resolved.map((r) => ({ discoveredAt: r.discoveredAt, resolvedAt: r.resolvedAt })));
  const pqcSafeEst = Math.round((1 - quantumUnsafeShare) * COMPOSITION.secrets);
  const pqcVulnEst = COMPOSITION.secrets - pqcSafeEst;

  const vm: DashboardViewModel = {
    dataMode: 'demo',
    environmentLabel: 'Enterprise simulation · North Atlantic Financial Group',
    posture,
    complianceAvg: Math.round((frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length) * 10) / 10,
    totals: {
      accounts: accounts.length,
      assets: totalAssets,
      clusters: COMPOSITION.clusters,
      containers: COMPOSITION.containers,
      vms: COMPOSITION.vms,
      storage: COMPOSITION.storage,
      databases: COMPOSITION.databases,
      identities: COMPOSITION.identities,
      criticalAssets,
      exposed: exposedAssets,
      findingsTotal: COMPOSITION.findingsTotal,
      findingsOpen: COMPOSITION.findingsOpen,
      findingsResolved: COMPOSITION.findingsResolved,
      findings: { ...COMPOSITION.findingsOpenBySev },
      open: { ...COMPOSITION.findingsOpenBySev },
      kevOpen: Math.max(kevOpen, 14),
      mttrHours: mttr || 18.6,
      scanCoverage,
      scansToday: 11 + Math.floor((now / 3600000) % 7),
      avgScanSeconds: 6.4,
      activeScans: 1,
      pqc: {
        quantumSafe: pqcSafeEst,
        vulnerable: pqcVulnEst,
        inMigration: Math.max(1, Math.round(pqcVulnEst * 0.16)),
      },
    },
    accounts,
    assets,
    findings,
    openFindings,
    frameworks,
    postureTrend: buildTrend(posture.score, COMPOSITION.findingsOpen, timeRange, rng),
    heatmap: buildHeatmap(findings, timeRange, now),
    providerData,
    algorithmData,
    riskData,
    scans,
    feed,
    threatMetrics: [
      { label: 'CISA KEV open', value: Math.max(kevOpen, 14), trend: 'down', severity: 'critical' },
      { label: 'Exposed assets', value: exposedAssets, trend: 'up', severity: 'high' },
      { label: 'MTTR', value: `${(mttr || 18.6).toFixed(1)}h`, trend: 'down', severity: 'low' },
      { label: 'Scan coverage', value: `${scanCoverage}%`, severity: 'low' },
    ],
    liveScanMetrics: [],
    industryBenchmarks: INDUSTRY_INITIAL_ACCESS.map((b) => ({
      label: b.label,
      value: `${b.percent}%`,
      provenance: b.provenance,
    })),
    provenance: {
      environment: PROVENANCE.simulation,
      posture: PROVENANCE.calculated,
      findings: PROVENANCE.simulation,
      cves: PROVENANCE.cisaKev,
      benchmarks: PROVENANCE.gcthH1_2025,
    },
  };

  vm.liveScanMetrics = [
    { id: 'active', label: 'Active Scans', value: 1, hint: 'CBOM · TLS · cloud', live: true },
    { id: 'completed', label: 'Completed (24h)', value: vm.totals.scansToday, hint: 'Simulated estate' },
    { id: 'findings', label: 'Open findings', value: vm.totals.findingsOpen, hint: `${vm.totals.open.critical} critical · ${vm.totals.open.high} high` },
    { id: 'coverage', label: 'Scan Coverage', value: `${vm.totals.scanCoverage}%`, hint: 'Assets monitored' },
    { id: 'targets', label: 'Cloud assets', value: totalAssets.toLocaleString(), hint: 'Simulated multi-cloud' },
    { id: 'latency', label: 'Avg Scan Time', value: `${vm.totals.avgScanSeconds}s`, hint: 'Per job (simulated)' },
  ];

  cache = { key, value: vm };
  return vm;
}

export function simulationInventorySummary() {
  const sim = getEnterpriseSimulation();
  return {
    total_assets: sim.totals.assets,
    compliance_score: sim.posture.score,
    by_category: {
      cryptographic: COMPOSITION.secrets,
      compute: COMPOSITION.vms,
      containers: COMPOSITION.containers,
      storage: COMPOSITION.storage,
      databases: COMPOSITION.databases,
      identity: COMPOSITION.identities,
    },
    by_cloud_provider: Object.fromEntries(sim.providerData.map((p) => [p.name.toLowerCase(), p.value])),
    quantum_safe_count: sim.totals.pqc.quantumSafe,
    non_quantum_safe: sim.totals.pqc.vulnerable,
    vulnerable_assets: sim.totals.criticalAssets,
    last_scan_time: new Date().toISOString(),
    source: 'enterprise_simulation',
    data_kind: 'demo',
  };
}

export function simulationCloudSummary() {
  const sim = getEnterpriseSimulation();
  return {
    total_resources: sim.totals.assets,
    by_provider: Object.fromEntries(sim.providerData.map((p) => [p.name.toLowerCase(), p.value])),
    security_findings: sim.totals.open,
    scan_coverage: sim.totals.scanCoverage,
    scans_today: sim.totals.scansToday,
    active_threats: sim.totals.kevOpen,
    data_kind: 'demo',
    source: 'enterprise_simulation',
  };
}

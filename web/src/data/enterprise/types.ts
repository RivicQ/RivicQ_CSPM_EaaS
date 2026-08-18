/** Provenance kinds the UI must never mix without a label. */
export type DataKind = 'live' | 'demo' | 'benchmark' | 'intel' | 'calculated';

export type Provenance = {
  kind: DataKind;
  source: string;
  sourceUrl?: string;
  publicationDate?: string;
  retrievedAt: string;
  datasetVersion: string;
  metricDefinition: string;
};

export type LabeledMetric<T = number> = {
  value: T;
  provenance: Provenance;
};

export type CveRecord = {
  id: string;
  cvss: number;
  cvssVersion: string;
  severity: string;
  cwe: string[];
  affectedProduct: string;
  affectedVersion: string;
  published: string;
  lastModified: string;
  epss?: {
    score: number;
    percentile: number;
    date: string;
    source: string;
    sourceUrl: string;
  };
  kev: boolean;
  description: string;
  references: string[];
  provenance: Provenance;
};

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'kubernetes';

export type SimulatedAccount = {
  id: string;
  provider: CloudProvider;
  name: string;
  environment: 'prod' | 'staging' | 'sandbox';
  region: string;
  resources: number;
  exposed: number;
  criticalAssets: number;
};

export type SimulatedAsset = {
  id: string;
  name: string;
  type: string;
  provider: CloudProvider;
  accountId: string;
  region: string;
  network: string;
  identity?: string;
  internetExposed: boolean;
  critical: boolean;
  algorithm?: string;
  quantumSafe?: boolean;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskContributors: Array<{ label: string; points: number }>;
};

export type SimulatedFinding = {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved';
  category: 'vulnerability' | 'misconfiguration' | 'identity' | 'exposure' | 'compliance';
  assetId: string;
  assetName: string;
  accountId: string;
  provider: CloudProvider;
  region: string;
  controlId?: string;
  framework?: string;
  cveId?: string;
  discoveredAt: string;
  resolvedAt?: string;
  ageDays: number;
  message: string;
};

export type ControlResult = {
  id: string;
  framework: string;
  title: string;
  status: 'passed' | 'failed' | 'partial' | 'na';
  critical: boolean;
  evidence: string;
};

export type FrameworkResult = {
  id: string;
  name: string;
  assessed: number;
  passed: number;
  failed: number;
  partial: number;
  na: number;
  criticalFailures: number;
  /** (passed + 0.5 * partial) / assessed * 100 */
  score: number;
  controls: ControlResult[];
};

export type ScoreBreakdown = {
  score: number;
  contributors: Array<{ label: string; points: number }>;
  method: string;
};

export type DrilldownKind =
  | 'posture'
  | 'resources'
  | 'findings'
  | 'exposed'
  | 'provider'
  | 'severity'
  | 'compliance'
  | 'cve'
  | 'feed'
  | 'scans'
  | 'risk';

export type DashboardViewModel = {
  dataMode: DataKind;
  environmentLabel: string;
  posture: ScoreBreakdown;
  complianceAvg: number;
  totals: {
    accounts: number;
    assets: number;
    clusters: number;
    containers: number;
    vms: number;
    storage: number;
    databases: number;
    identities: number;
    criticalAssets: number;
    exposed: number;
    findingsTotal: number;
    findingsOpen: number;
    findingsResolved: number;
    findings: { critical: number; high: number; medium: number; low: number };
    open: { critical: number; high: number; medium: number; low: number };
    kevOpen: number;
    mttrHours: number;
    scanCoverage: number;
    scansToday: number;
    avgScanSeconds: number;
    activeScans: number;
    pqc: { quantumSafe: number; vulnerable: number; inMigration: number };
  };
  accounts: SimulatedAccount[];
  assets: SimulatedAsset[];
  findings: SimulatedFinding[];
  openFindings: SimulatedFinding[];
  frameworks: FrameworkResult[];
  postureTrend: Array<{ label: string; score: number; findings: number; scans: number }>;
  heatmap: Array<{ id: string; risk: number; count: number; label: string; day: string }>;
  providerData: Array<{ name: string; value: number }>;
  algorithmData: Array<{ name: string; value: number }>;
  riskData: Array<{ name: string; value: number }>;
  scans: Array<{ id: string; target: string; status: 'completed' | 'running' | 'failed'; time: string; findings?: number }>;
  feed: Array<{ time: string; severity: string; message: string; findingId?: string }>;
  threatMetrics: Array<{ label: string; value: string | number; trend?: 'up' | 'down' | 'neutral'; severity?: 'low' | 'medium' | 'high' | 'critical' }>;
  liveScanMetrics: Array<{
    id: string;
    label: string;
    value: string | number;
    hint?: string;
    live?: boolean;
    accent?: string;
  }>;
  industryBenchmarks: Array<{
    label: string;
    value: string;
    provenance: Provenance;
  }>;
  provenance: Record<string, Provenance>;
};

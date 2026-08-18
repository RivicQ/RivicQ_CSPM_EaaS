import { getEnterpriseSimulation } from '../data/enterprise/simulation';
import type { ControlResult, SimulatedFinding } from '../data/enterprise/types';

const ALGO_GUIDANCE: Record<string, { quantum: boolean; risk: string; migration: string }> = {
  'AES-256-GCM': { quantum: true, risk: 'low', migration: 'Monitored' },
  'RSA-2048': { quantum: false, risk: 'medium', migration: 'Classified — not auto-vulnerable' },
  'ECDSA P-256': { quantum: false, risk: 'medium', migration: 'Plan hybrid PQC' },
  'ML-KEM-768': { quantum: true, risk: 'low', migration: 'Preferred' },
  'RSA-4096': { quantum: false, risk: 'medium', migration: 'Inventory + migrate' },
  Ed25519: { quantum: false, risk: 'medium', migration: 'Plan hybrid PQC' },
  '3DES': { quantum: false, risk: 'critical', migration: 'Migrate now' },
  'ML-DSA-65': { quantum: true, risk: 'low', migration: 'Preferred' },
};

export const DEMO_COMPLIANCE_FRAMEWORKS = ['iso27001', 'nis2', 'dora', 'gdpr', 'bsi'] as const;

export type DemoCspmOverview = {
  health_score: number;
  total_assets: number;
  outdated_algorithms: number;
  at_risk_data: number;
  quantum_safe_pct: number;
  risk_breakdown: Array<{
    name: string;
    usage: number;
    risk_level: string;
    quantum_safe: boolean;
    migration: string;
  }>;
  topology: Array<{ from: string; to: string; provider: string }>;
  findings: SimulatedFinding[];
  source: 'enterprise_simulation';
  demo: true;
};

export type DemoComplianceDashboard = {
  framework: string;
  status: 'demo';
  score: number;
  total_controls: number;
  passed_controls: number;
  failed_controls: number;
  pending_controls: number;
  controls: ControlResult[];
  note: string;
};

/** Isolated DEMO CSPM snapshot sourced from the labeled enterprise simulation. */
export function buildDemoCspmOverview(): DemoCspmOverview {
  const sim = getEnterpriseSimulation();
  const pqcTotal = sim.totals.pqc.quantumSafe + sim.totals.pqc.vulnerable;
  return {
    health_score: sim.posture.score,
    total_assets: sim.totals.assets,
    outdated_algorithms: sim.totals.pqc.vulnerable,
    at_risk_data: sim.totals.exposed,
    quantum_safe_pct: pqcTotal ? Math.round((sim.totals.pqc.quantumSafe / pqcTotal) * 100) : 0,
    risk_breakdown: sim.algorithmData.map((row) => {
      const guide = ALGO_GUIDANCE[row.name] || { quantum: false, risk: 'medium', migration: 'Review' };
      return {
        name: row.name,
        usage: row.value,
        risk_level: guide.risk,
        quantum_safe: guide.quantum,
        migration: guide.migration,
      };
    }),
    topology: sim.accounts.slice(0, 6).map((acct) => ({
      from: acct.name,
      to: `${acct.region} KMS`,
      provider: acct.provider,
    })),
    findings: sim.openFindings.slice(0, 12),
    source: 'enterprise_simulation',
    demo: true,
  };
}

/** Isolated DEMO compliance mappings. Scores are sample control results, not a certification. */
export function buildDemoComplianceDashboards(): DemoComplianceDashboard[] {
  const sim = getEnterpriseSimulation();
  return sim.frameworks
    .filter((fw) => (DEMO_COMPLIANCE_FRAMEWORKS as readonly string[]).includes(fw.id))
    .map((fw) => ({
      framework: fw.id,
      status: 'demo' as const,
      score: Math.round(fw.score),
      total_controls: fw.assessed,
      passed_controls: fw.passed,
      failed_controls: fw.failed,
      pending_controls: fw.partial,
      controls: fw.controls,
      note: 'DEMO control results — not a certification claim.',
    }));
}

export function buildDemoRisks() {
  const sim = getEnterpriseSimulation();
  return sim.openFindings.slice(0, 8).map((f) => ({
    id: f.id,
    risk_type: f.category,
    severity: f.severity,
    affected_assets: f.assetName,
    status: f.status === 'resolved' ? 'mitigated' : 'open',
  }));
}

export function remediationForFinding(finding: SimulatedFinding): {
  what: string;
  why: string;
  business: string;
  technical: string;
  remediation: string;
} {
  const title = finding.title || finding.message;
  return {
    what: title,
    why: finding.cveId
      ? `Mapped to published CVE ${finding.cveId} on a simulated asset. This is DEMO DATA, not customer telemetry.`
      : 'This finding is generated from the labeled RivicQ demo estate so visitors can walk a remediation workflow.',
    business: finding.severity === 'critical' || finding.severity === 'high'
      ? 'Elevated exposure on a simulated production-like account. Prioritize before expanding the attack surface.'
      : 'Tracked for hygiene. Schedule during the next change window.',
    technical: `${finding.category} on ${finding.assetName} (${finding.provider}/${finding.region}).`,
    remediation: finding.cveId
      ? `Patch or isolate ${finding.assetName}, then re-scan with \`rivicq scan .\` or the GitHub scanner.`
      : `Apply the control on ${finding.assetName}, capture evidence, and mark the finding resolved in a real workspace.`,
  };
}

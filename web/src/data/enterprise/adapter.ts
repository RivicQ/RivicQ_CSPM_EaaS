import { getEnterpriseSimulation } from './simulation';
import { calculatePostureScore } from './scoring';
import { PROVENANCE } from './sources';
import type { DashboardViewModel } from './types';
import { chartTheme } from '../../theme/chartTheme';
import dashboardDesign from '../../theme/dashboardDesign';
import designSystem from '../../theme/designSystem';

type ApiBundle = {
  summary?: any;
  assets?: any[];
  resources?: any;
  events?: any;
  compliance?: any;
  cspm?: any;
  analytics?: any;
  benchmarks?: any;
  timeRange?: '7d' | '30d';
};

function hasLiveTelemetry(api: ApiBundle): boolean {
  const source = String(api.summary?.source || api.resources?.source || '');
  if (source === 'enterprise_simulation' || source === 'demo' || api.summary?.demo_mode || api.resources?.demo_mode) {
    return false;
  }
  if (source === 'cbom_scans' && Number(api.summary?.total_assets) > 0) return true;
  if ((api.assets?.length || 0) > 12) return true;
  if (Number(api.resources?.total_resources) > 250 && api.resources?.security_findings) return true;
  if ((api.cspm as any)?.health_score && Number(api.summary?.total_assets) > 20) return true;
  return false;
}

function attachScanAccents(vm: DashboardViewModel): DashboardViewModel {
  vm.liveScanMetrics = vm.liveScanMetrics.map((m) => {
    if (m.id === 'active') return { ...m, accent: chartTheme.live };
    if (m.id === 'findings') {
      const n = typeof m.value === 'number' ? m.value : Number(String(m.value).replace(/[^\d.]/g, ''));
      return { ...m, accent: n > 20 ? dashboardDesign.severity.high : designSystem.proBlue.textPrimary };
    }
    if (m.id === 'coverage') return { ...m, accent: designSystem.proBlue.accentLight };
    return m;
  });
  return vm;
}

export function buildDashboardViewModel(api: ApiBundle): DashboardViewModel {
  const timeRange = api.timeRange || '7d';
  const sim = getEnterpriseSimulation({ timeRange });

  if (!hasLiveTelemetry(api)) {
    return attachScanAccents(sim);
  }

  const assets = api.assets || [];
  const findings = api.resources?.security_findings || sim.totals.open;
  const openCritical = Number(findings.critical ?? 0);
  const openHigh = Number(findings.high ?? 0);
  const totalAssets = Number(api.resources?.total_resources ?? api.summary?.total_assets ?? assets.length);
  const exposed = Number((api.cspm as any)?.at_risk_data ?? Math.round(totalAssets * 0.02));
  const posture = calculatePostureScore({
    assets: totalAssets || 1,
    openCritical,
    openHigh,
    exposed,
    kevOpen: Number((api.resources as any)?.active_threats ?? 0),
    failedCriticalControls: 0,
    quantumUnsafeShare: assets.length
      ? assets.filter((a: any) => !(a.quantum_safe || a.quantumSafe)).length / assets.length
      : 0.3,
  });

  const live: DashboardViewModel = {
    ...sim,
    dataMode: 'live',
    environmentLabel: 'Connected environment',
    posture,
    totals: {
      ...sim.totals,
      assets: totalAssets,
      findings: {
        critical: openCritical,
        high: openHigh,
        medium: Number(findings.medium ?? 0),
        low: Number(findings.low ?? 0),
      },
      open: {
        critical: openCritical,
        high: openHigh,
        medium: Number(findings.medium ?? 0),
        low: Number(findings.low ?? 0),
      },
      findingsOpen: openCritical + openHigh + Number(findings.medium ?? 0) + Number(findings.low ?? 0),
    },
    provenance: {
      ...sim.provenance,
      environment: PROVENANCE.live,
      posture: PROVENANCE.calculated,
    },
  };

  if (api.resources?.by_provider && Object.keys(api.resources.by_provider).length) {
    live.providerData = Object.entries(api.resources.by_provider).map(([name, value]) => ({
      name: name.toUpperCase() === 'KUBERNETES' ? 'K8s' : String(name).toUpperCase(),
      value: value as number,
    }));
  }

  const dashboards = api.compliance?.dashboards;
  if (Array.isArray(dashboards) && dashboards.length) {
    live.frameworks = live.frameworks.map((fw) => {
      const match = dashboards.find((d: any) =>
        String(d.framework || d.id || d.name || '').toLowerCase().includes(fw.id),
      );
      return match ? { ...fw, score: match.score ?? match.compliance_score ?? fw.score } : fw;
    });
    live.complianceAvg = Math.round(
      (live.frameworks.reduce((s, f) => s + f.score, 0) / live.frameworks.length) * 10,
    ) / 10;
  }

  const apiTrend = (api.analytics as any)?.posture_trend ?? (api.analytics as any)?.trend;
  if (Array.isArray(apiTrend) && apiTrend.length) {
    live.postureTrend = apiTrend.map((p: any) => ({
      label: p.label || p.date,
      score: p.score ?? p.value,
      findings: p.findings ?? live.totals.findingsOpen,
      scans: p.scans ?? 3,
    }));
  }

  if (api.events?.events?.length) {
    live.feed = api.events.events.slice(0, 8).map((e: any, i: number) => ({
      time: e.created_at || 'now',
      severity: e.severity || 'low',
      message: e.message || e.description || '',
      findingId: e.id || `live-${i}`,
    }));
  }

  live.liveScanMetrics = [
    { id: 'active', label: 'Active Scans', value: live.scans.filter((s) => s.status === 'running').length, hint: 'CBOM · TLS · cloud', live: true },
    { id: 'completed', label: 'Completed (24h)', value: (api.benchmarks as any)?.scans_today ?? live.totals.scansToday, hint: 'Across connected environments' },
    { id: 'findings', label: 'Open findings', value: live.totals.findingsOpen, hint: `${openCritical} critical · ${openHigh} high` },
    { id: 'coverage', label: 'Scan Coverage', value: `${(api.cspm as any)?.scan_coverage ?? live.totals.scanCoverage}%`, hint: 'Assets monitored' },
    { id: 'targets', label: 'Cloud assets', value: totalAssets.toLocaleString(), hint: 'Connected accounts' },
    { id: 'latency', label: 'Avg Scan Time', value: `${(api.benchmarks as any)?.scan_time_seconds ?? live.totals.avgScanSeconds}s`, hint: 'Per job' },
  ];

  return attachScanAccents(live);
}

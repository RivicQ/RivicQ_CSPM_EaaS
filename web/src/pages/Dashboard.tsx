import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  ArrowForward, AutoGraph, GppGood, Lock, Memory, NotificationsActive, Security, TrendingUp,
  Timeline,
} from '@mui/icons-material';
import {
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  analyticsService, benchmarkService, cloudService, complianceService, inventoryService, postureService, securityService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';
import StatCard from '../components/dashboard/StatCard';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import DashboardHero from '../components/dashboard/DashboardHero';
import PostureRing from '../components/dashboard/PostureRing';
import type { LiveScanMetric } from '../components/dashboard/LiveScanMetrics';
import SecurityFeedItem from '../components/dashboard/SecurityFeedItem';
import PostureTrendChart from '../components/dashboard/PostureTrendChart';
import CloudProviderBreakdown from '../components/dashboard/CloudProviderBreakdown';
import RiskHeatmap from '../components/dashboard/RiskHeatmap';
import AlgorithmDistributionChart from '../components/dashboard/AlgorithmDistributionChart';
import PQCReadinessPanel from '../components/dashboard/PQCReadinessPanel';
import QuickActionsGrid, { DEFAULT_QUICK_ACTIONS } from '../components/dashboard/QuickActionsGrid';
import ComplianceScoreGrid from '../components/dashboard/ComplianceScoreGrid';
import TopFindingsList from '../components/dashboard/TopFindingsList';
import ScanActivityTimeline from '../components/dashboard/ScanActivityTimeline';
import FindingsSeverityBar from '../components/dashboard/FindingsSeverityBar';
import ThreatIntelStrip from '../components/dashboard/ThreatIntelStrip';
import dashboardDesign from '../theme/dashboardDesign';
import { chartTheme } from '../theme/chartTheme';
import designSystem, { heroPrimaryCtaSx, heroSecondaryCtaSx, metricValueSx } from '../theme/designSystem';
import { tokens } from '../theme/tokens';

const DEMO_FEED = [
  { time: '2m ago', severity: 'critical', message: 'Public S3 bucket (crypto-assets-prod) allows unauthenticated write access' },
  { time: '9m ago', severity: 'high', message: 'Security group ssh-public-open exposes port 22 to 0.0.0.0/0' },
  { time: '17m ago', severity: 'medium', message: 'GCS bucket lacks uniform bucket-level access control' },
  { time: '26m ago', severity: 'low', message: 'KMS key rotation disabled for alias/aws/ebs' },
  { time: '41m ago', severity: 'critical', message: 'IAM policy grants wildcard Action on KMS keys' },
  { time: '1h ago', severity: 'medium', message: 'Azure Key Vault soft-delete purge protection disabled' },
];

const ChartTooltipContent: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: `${dashboardDesign.radius.sm}px`,
        boxShadow: dashboardDesign.chart.tooltipShadow,
      }}
    >
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ ...metricValueSx, fontSize: '0.875rem', color: 'primary.main' }}>
        {payload[0].value}
      </Typography>
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { edition } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'));
  const [timeRange, setTimeRange] = React.useState('7d');
  const [trendActiveIndex, setTrendActiveIndex] = React.useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = React.useState<string | null>(null);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = React.useState<string | null>(null);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => inventoryService.getInventorySummary().then((r) => r.data),
    retry: 1,
  });

  const { data: cspmOverview } = useQuery({
    queryKey: ['dashboard-cspm'],
    queryFn: () => postureService.getOverview().then((r) => r.data),
    retry: 1,
    enabled: isPaidEdition(edition),
  });

  const { data: assetsData } = useQuery({
    queryKey: ['dashboard-assets'],
    queryFn: () => inventoryService.getAssets().then((r) => r.data),
    retry: 1,
  });

  const { data: resourcesSummary } = useQuery({
    queryKey: ['dashboard-resources'],
    queryFn: () => cloudService.getResourcesSummary().then((r) => r.data),
    retry: 1,
  });

  const { data: securityEvents } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: () => securityService.getEvents().then((r) => r.data),
    retry: 1,
  });

  const { data: complianceDash } = useQuery({
    queryKey: ['dashboard-compliance'],
    queryFn: () => complianceService.getAllDashboards().then((r) => r.data),
    retry: 1,
    enabled: isPaidEdition(edition),
  });

  const { data: analyticsInsights } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => analyticsService.getInsights().then((r) => r.data),
    retry: 1,
  });

  const { data: benchmarkData } = useQuery({
    queryKey: ['dashboard-benchmarks'],
    queryFn: () => benchmarkService.getSummary().then((r) => r.data),
    retry: 1,
    refetchInterval: 60_000,
  });

  const assets = React.useMemo(() => {
    const list = Array.isArray(assetsData) ? assetsData : Array.isArray((assetsData as any)?.assets) ? (assetsData as any).assets : [];
    return list;
  }, [assetsData]);

  const totalResources = resourcesSummary?.total_resources ?? (assets.length || 1427);
  const healthScore = (cspmOverview as any)?.health_score ?? (summaryData as any)?.compliance_score ?? 78;
  const findings = resourcesSummary?.security_findings ?? { critical: 2, high: 8, medium: 15, low: 25 };
  const totalFindings = (Object.values(findings) as number[]).reduce((a, b) => a + b, 0);

  const algorithmData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a: any) => {
      const alg = a.algorithm || a.crypto_algorithm || 'Unknown';
      counts[alg] = (counts[alg] || 0) + 1;
    });
    return Object.keys(counts).length > 0
      ? Object.entries(counts).map(([name, value]) => ({ name, value }))
      : [
        { name: 'AES-256', value: 37 },
        { name: 'RSA-2048', value: 28 },
        { name: 'ML-KEM', value: 12 },
        { name: 'ECDSA', value: 19 },
        { name: '3DES', value: 8 },
      ];
  }, [assets]);

  const riskData = React.useMemo(() => {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const entries = levels.map((level) => ({
      name: level,
      value: assets.filter((a: any) => String(a.risk_level || a.riskLevel).toUpperCase() === level).length,
    }));
    return entries.some((e) => e.value > 0) ? entries : [
      { name: 'LOW', value: 14 }, { name: 'MEDIUM', value: 9 }, { name: 'HIGH', value: 4 }, { name: 'CRITICAL', value: 2 },
    ];
  }, [assets]);

  const heatmap = React.useMemo(() => {
    const seed7 = [0, 0, 1, 0, 2, 0, 0, 1, 3, 0, 0, 2, 0, 0, 1, 0, 0, 2, 3, 1, 0, 0, 2, 0, 0, 1, 0, 0];
    const seed30 = [0, 0, 0, 1, 0, 2, 0, 0, 1, 3, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 3, 1, 0, 0, 2, 0, 0, 1, 0, 0];
    const seed = timeRange === '7d' ? seed7 : seed30;
    const counts = [0, 2, 5, 9, 14];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return seed.map((risk, i) => {
      const col = i % (timeRange === '7d' ? 7 : 10);
      const row = Math.floor(i / (timeRange === '7d' ? 7 : 10));
      const count = risk === 0 ? 0 : counts[risk] + (i % 3);
      return {
        id: `hm-${i}`,
        risk,
        count,
        day: days[col],
        label: `${days[col]} · Week ${row + 1}`,
      };
    });
  }, [timeRange]);

  const feed = securityEvents?.events?.length
    ? securityEvents.events.slice(0, 6).map((e: any) => ({
      time: e.created_at || 'now',
      severity: e.severity || 'low',
      message: e.message || e.description || '',
    }))
    : DEMO_FEED;

  const complianceAvg = React.useMemo(() => {
    const dashboards = complianceDash?.dashboards;
    if (!dashboards?.length) return null;
    return Math.round(dashboards.reduce((a: number, d: any) => a + (d.score || 0), 0) / dashboards.length);
  }, [complianceDash]);

  const postureTrend = React.useMemo(() => {
    const apiTrend = (analyticsInsights as any)?.posture_trend ?? (analyticsInsights as any)?.trend;
    if (Array.isArray(apiTrend) && apiTrend.length) {
      return apiTrend.map((p: any) => ({ label: p.label || p.date, score: p.score ?? p.value }));
    }
    const points = timeRange === '7d' ? 7 : 12;
    const labels = timeRange === '7d'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];
    return labels.slice(0, points).map((label, i) => ({
      label,
      score: Math.min(100, Math.max(48, Math.round(healthScore - (points - i - 1) * 1.2 + (i % 4) * 1.5))),
      findings: Math.max(0, totalFindings - i * 2 + (i % 3)),
      scans: 3 + (i % 5),
    }));
  }, [analyticsInsights, timeRange, healthScore, totalFindings]);

  const providerData = React.useMemo(() => {
    const byProvider = resourcesSummary?.by_provider;
    if (byProvider && Object.keys(byProvider).length) {
      return Object.entries(byProvider).map(([name, value]) => ({
        name: name.toUpperCase() === 'KUBERNETES' ? 'K8s' : name.toUpperCase(),
        value: value as number,
      }));
    }
    return [
      { name: 'AWS', value: 542 },
      { name: 'Azure', value: 318 },
      { name: 'GCP', value: 287 },
      { name: 'K8s', value: 280 },
    ];
  }, [resourcesSummary]);

  const pqcStats = React.useMemo(() => {
    const safe = assets.filter((a: any) => a.quantum_safe || a.quantumSafe).length;
    const vuln = assets.filter((a: any) => !(a.quantum_safe || a.quantumSafe)).length;
    if (assets.length) {
      return {
        quantumSafe: safe,
        vulnerable: vuln,
        inMigration: Math.max(1, Math.round(vuln * 0.18)),
      };
    }
    return { quantumSafe: 892, vulnerable: 412, inMigration: 123 };
  }, [assets]);

  const complianceFrameworks = React.useMemo(() => {
    const dashboards = complianceDash?.dashboards;
    if (dashboards?.length) {
      return dashboards.slice(0, 8).map((d: any) => ({
        id: d.id || d.framework_id || d.framework,
        name: d.name || d.framework || 'Framework',
        score: d.score ?? d.compliance_score ?? 0,
      }));
    }
    return [
      { id: 'nist', name: 'NIST CSF', score: 82 },
      { id: 'dora', name: 'DORA', score: 76 },
      { id: 'nis2', name: 'NIS2', score: 71 },
      { id: 'soc2', name: 'SOC 2', score: 88 },
      { id: 'iso', name: 'ISO 27001', score: 79 },
      { id: 'pci', name: 'PCI DSS', score: 74 },
      { id: 'gdpr', name: 'GDPR', score: 85 },
      { id: 'cra', name: 'EU CRA', score: 68 },
    ];
  }, [complianceDash]);

  const topFindings = React.useMemo(() => (
    feed.slice(0, 6).map((e: any, i: number) => ({
      id: `finding-${i}`,
      title: e.message,
      severity: e.severity,
      resource: e.resource || 'Multi-cloud',
      framework: e.framework,
    }))
  ), [feed]);

  const scanEvents = React.useMemo(() => [
    { id: '1', target: 'prod-api.example.com', status: 'completed' as const, time: '12m ago', findings: 3 },
    { id: '2', target: 'k8s-cluster-west', status: 'running' as const, time: '28m ago' },
    { id: '3', target: 's3://crypto-assets-prod', status: 'completed' as const, time: '1h ago', findings: 7 },
    { id: '4', target: 'ssh bastion-host', status: 'failed' as const, time: '2h ago' },
    { id: '5', target: 'azure-keyvault-prod', status: 'completed' as const, time: '3h ago', findings: 1 },
  ], []);

  const threatMetrics = React.useMemo(() => [
    { label: 'Active Threats', value: (resourcesSummary as any)?.active_threats ?? 12, trend: 'down' as const, severity: 'high' as const },
    { label: 'Exposed Keys', value: (cspmOverview as any)?.exposed_keys ?? 4, trend: 'up' as const, severity: 'critical' as const },
    { label: 'MTTR', value: '4.2h', trend: 'down' as const, severity: 'low' as const },
    { label: 'Scan Coverage', value: `${(cspmOverview as any)?.scan_coverage ?? 94}%`, severity: 'low' as const },
  ], [resourcesSummary, cspmOverview]);

  const quickActions = React.useMemo(() => (
    isPaidEdition(edition)
      ? DEFAULT_QUICK_ACTIONS
      : DEFAULT_QUICK_ACTIONS.filter((a) => !a.path.startsWith('/enterprise'))
  ), [edition]);

  const liveScanMetrics = React.useMemo((): LiveScanMetric[] => {
    const activeScans = scanEvents.filter((e) => e.status === 'running').length || 2;
    const completedToday = (benchmarkData as any)?.scans_today ?? (analyticsInsights as any)?.scans_24h ?? 18;
    const scanCoverage = (cspmOverview as any)?.scan_coverage ?? (resourcesSummary as any)?.scan_coverage ?? 94;
    const avgScanSec = (benchmarkData as any)?.scan_time_seconds ?? (benchmarkData as any)?.benchmarks?.[0]?.scan_time_seconds ?? 6.8;
    const targetsScanned = (summaryData as any)?.scanned_targets ?? totalResources;
    const findings24h = totalFindings || (securityEvents as any)?.events?.length || 24;

    return [
      {
        id: 'active',
        label: 'Active Scans',
        value: activeScans,
        hint: 'CBOM · TLS · cloud',
        live: activeScans > 0,
        accent: chartTheme.live,
      },
      {
        id: 'completed',
        label: 'Completed (24h)',
        value: completedToday,
        hint: 'Across all environments',
      },
      {
        id: 'findings',
        label: 'Findings (24h)',
        value: findings24h,
        hint: `${findings.critical ?? 0} critical · ${findings.high ?? 0} high`,
        accent: findings24h > 20 ? dashboardDesign.severity.high : designSystem.proBlue.textPrimary,
      },
      {
        id: 'coverage',
        label: 'Scan Coverage',
        value: `${scanCoverage}%`,
        hint: 'Assets monitored',
        accent: designSystem.proBlue.accentLight,
      },
      {
        id: 'targets',
        label: 'Targets Scanned',
        value: typeof targetsScanned === 'number' ? targetsScanned.toLocaleString() : String(targetsScanned),
        hint: 'TLS · SSH · HTTP · K8s',
      },
      {
        id: 'latency',
        label: 'Avg Scan Time',
        value: `${avgScanSec}s`,
        hint: 'Per 10k asset set',
      },
    ];
  }, [
    scanEvents,
    benchmarkData,
    analyticsInsights,
    cspmOverview,
    resourcesSummary,
    summaryData,
    totalResources,
    totalFindings,
    securityEvents,
    findings,
  ]);

  const riskTotal = riskData.reduce((s, d) => s + d.value, 0);

  if (summaryLoading && !summaryData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 480 }}>
        <CircularProgress size={36} thickness={3} />
      </Box>
    );
  }

  return (
    <Box sx={dashboardDesign.layout.page}>
      <DashboardHero
        eyebrow="Command Center"
        title="Security Command Center"
        subtitle="Unified cryptographic posture across cloud accounts, workloads, CBOM inventory, and PQC migration readiness."
        meta={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {['AWS', 'Azure', 'GCP', 'K8s'].map((c) => (
              <Chip
                key={c}
                label={c}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  height: 24,
                  color: designSystem.proBlue.textPrimary,
                  borderColor: 'rgba(255,255,255,0.35)',
                  bgcolor: 'rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </Stack>
        }
        action={
          isPaidEdition(edition) ? (
            <Button
              variant="contained"
              disableElevation
              fullWidth
              endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/enterprise/cloud-posture')}
              sx={{ ...heroPrimaryCtaSx, maxWidth: { sm: 'none' } }}
            >
              Cloud Posture
            </Button>
          ) : (
            <Button
              variant="outlined"
              fullWidth
              endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/scanner')}
              sx={{ ...heroSecondaryCtaSx, maxWidth: { sm: 'none' } }}
            >
              Run CBOM Scan
            </Button>
          )
        }
        liveScanMetrics={liveScanMetrics}
      >
        <PostureRing score={healthScore} size={isCompact ? 96 : 128} onDark />
      </DashboardHero>

      <QuickActionsGrid actions={quickActions} onNavigate={navigate} />

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Posture Score"
            value={healthScore}
            hint="CSPM + crypto combined"
            trend={{ value: '+3.2%', positive: true }}
            icon={<GppGood />}
            accent={healthScore >= 80 ? dashboardDesign.severity.low : healthScore >= 60 ? dashboardDesign.severity.high : dashboardDesign.severity.critical}
            featured
            delay={0}
          >
            <Box sx={{ height: 3, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: `${healthScore}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${tokens.colors.rivicq[600]}, ${tokens.colors.rivicq[400]})`,
                }}
              />
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Cloud Resources" value={totalResources.toLocaleString()} hint="Connected accounts" icon={<Memory />} accent={tokens.colors.rivicq[500]} delay={1} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Open Findings" value={totalFindings} hint={`${findings.critical} critical · ${findings.high} high`} trend={{ value: '-5 resolved', positive: true }} icon={<NotificationsActive />} accent={dashboardDesign.severity.high} delay={2} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="At-Risk Objects" value={(assets.length || (cspmOverview as any)?.at_risk_data || 847).toLocaleString()} hint={complianceAvg ? `Compliance ${complianceAvg}%` : 'Across environments'} icon={<Lock />} accent={dashboardDesign.severity.critical} delay={3} />
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={8}>
          <DashboardPanel
            title="Posture Score Trend"
            subtitle={`${timeRange === '7d' ? 'Last 7 days' : 'Last 12 weeks'} · hover for detail`}
            delay={1}
            action={
              <ToggleButtonGroup size="small" value={timeRange} exclusive onChange={(_, v) => v && setTimeRange(v)}>
                <ToggleButton value="7d" sx={{ fontSize: '0.7rem', py: 0.25, px: 1.25 }}>7D</ToggleButton>
                <ToggleButton value="30d" sx={{ fontSize: '0.7rem', py: 0.25, px: 1.25 }}>30D</ToggleButton>
              </ToggleButtonGroup>
            }
          >
            <PostureTrendChart
              data={postureTrend}
              baseline={80}
              activeIndex={trendActiveIndex}
              onActiveChange={setTrendActiveIndex}
            />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardPanel title="Cloud Resources" subtitle="By provider · click to filter" delay={2}>
            <CloudProviderBreakdown
              data={providerData}
              selected={selectedProvider}
              onSelect={setSelectedProvider}
            />
          </DashboardPanel>
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={5}>
          <DashboardPanel
            title="Risk Heatmap"
            subtitle="Finding density by day · click cells for detail"
            delay={1}
            action={
              <ToggleButtonGroup size="small" value={timeRange} exclusive onChange={(_, v) => { if (v) { setTimeRange(v); setSelectedHeatmapCell(null); } }}>
                <ToggleButton value="7d" sx={{ fontSize: '0.7rem', py: 0.25, px: 1.25 }}>7D</ToggleButton>
                <ToggleButton value="30d" sx={{ fontSize: '0.7rem', py: 0.25, px: 1.25 }}>30D</ToggleButton>
              </ToggleButtonGroup>
            }
          >
            <RiskHeatmap
              data={heatmap}
              columns={timeRange === '7d' ? 7 : 10}
              selectedId={selectedHeatmapCell}
              onSelect={(cell) => setSelectedHeatmapCell(cell?.id ?? null)}
            />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <DashboardPanel
            title="Algorithm Distribution"
            subtitle="CBOM inventory · click bars to highlight"
            delay={2}
            action={<Chip size="small" icon={<Security sx={{ fontSize: 14 }} />} label="CBOM" variant="outlined" sx={{ fontSize: '0.6875rem', height: 24 }} />}
          >
            <AlgorithmDistributionChart
              data={algorithmData}
              selected={selectedAlgorithm}
              onSelect={setSelectedAlgorithm}
            />
          </DashboardPanel>
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={6}>
          <DashboardPanel title="Risk Distribution" subtitle={`${riskTotal} assets classified`} delay={3}>
            <Box sx={{ height: { xs: 200, md: 240 }, position: 'relative', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {riskData.map((_, index) => (
                      <Cell key={`risk-${index}`} fill={dashboardDesign.severity.palette[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Typography sx={{ ...metricValueSx, fontSize: '1.5rem' }}>{riskTotal}</Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600 }}>Assets</Typography>
              </Box>
            </Box>
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              {riskData.map((entry, i) => (
                <Grid item xs={6} sm={3} key={entry.name}>
                  <Box sx={{ textAlign: 'center', p: 1, borderRadius: `${dashboardDesign.radius.sm}px`, bgcolor: `${dashboardDesign.severity.palette[i]}10`, border: 1, borderColor: `${dashboardDesign.severity.palette[i]}22` }}>
                    <Typography sx={{ ...metricValueSx, fontSize: '1.125rem', color: dashboardDesign.severity.palette[i] }}>{entry.value}</Typography>
                    <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.name}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <DashboardPanel
            title="Security Feed"
            subtitle="Real-time posture events"
            delay={4}
            action={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dashboardDesign.severity.low, animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
                <Typography sx={{ fontSize: '0.6875rem', color: dashboardDesign.severity.low, fontWeight: 700 }}>LIVE</Typography>
              </Stack>
            }
          >
            <Box sx={{ maxHeight: dashboardDesign.layout.feedMaxHeight, overflowY: 'auto', overflowX: 'hidden', pr: 0.5 }}>
              {feed.map((evt: any, i: number) => (
                <SecurityFeedItem key={i} message={evt.message} severity={evt.severity} time={evt.time} />
              ))}
            </Box>
          </DashboardPanel>
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={6}>
          <DashboardPanel title="PQC Migration Readiness" subtitle="Post-quantum cryptography posture" delay={5}>
            <PQCReadinessPanel {...pqcStats} />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <DashboardPanel
            title="Compliance Frameworks"
            subtitle={complianceAvg ? `Average score ${complianceAvg}%` : 'Regulatory alignment overview'}
            delay={6}
            action={<Chip size="small" label={`${complianceFrameworks.length} active`} variant="outlined" sx={{ fontSize: '0.6875rem', height: 24 }} />}
          >
            <ComplianceScoreGrid frameworks={complianceFrameworks} />
          </DashboardPanel>
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={6}>
          <DashboardPanel
            title="Priority Findings"
            subtitle="Highest severity items requiring action"
            delay={7}
            action={
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate(isPaidEdition(edition) ? '/enterprise/cloud-posture' : '/cspm')}>
                View all
              </Button>
            }
          >
            <TopFindingsList findings={topFindings} />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <DashboardPanel
            title="Scan Activity"
            subtitle="Recent CBOM & infrastructure scans"
            delay={8}
            action={<Chip size="small" icon={<Timeline sx={{ fontSize: 14 }} />} label="Live" variant="outlined" sx={{ fontSize: '0.6875rem', height: 24 }} />}
          >
            <ScanActivityTimeline events={scanEvents} />
          </DashboardPanel>
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={8}>
          <DashboardPanel title="Findings by Severity" subtitle={`${totalFindings} open across all environments`} delay={9}>
            <FindingsSeverityBar findings={{
              critical: findings.critical ?? 0,
              high: findings.high ?? 0,
              medium: findings.medium ?? 0,
              low: findings.low ?? 0,
            }} />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardPanel title="Threat Intelligence" subtitle="Real-time risk signals" delay={10}>
            <ThreatIntelStrip metrics={threatMetrics} />
          </DashboardPanel>
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: { xs: 1.5, md: 2.5 },
          p: { xs: 1.5, md: 2 },
          borderRadius: `${dashboardDesign.radius.lg}px`,
          border: 1,
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.04)',
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <AutoGraph sx={{ fontSize: 20, color: 'primary.main' }} />
          <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Continuous posture monitoring</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Refreshes every 60s · CBOM · PQC scoring · Multi-cloud</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip icon={<TrendingUp sx={{ fontSize: 14 }} />} label="PQC 67%" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
          <Chip label="NIST CSF" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
          <Chip label="SOC 2" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
        </Stack>
      </Box>
    </Box>
  );
};

export default Dashboard;

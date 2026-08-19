import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Grid, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  ArrowForward, AutoGraph, GitHub, GppGood, Lock, Memory, NotificationsActive, Security, TrendingUp,
} from '@mui/icons-material';
import {
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  analyticsService, benchmarkService, cloudService, complianceService, inventoryService, postureService, securityService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui';
import { isPaidEdition } from '../config/editions';
import { buildDashboardViewModel } from '../data/enterprise/adapter';
import type { DrilldownKind } from '../data/enterprise/types';
import ProvenanceChip from '../components/dashboard/ProvenanceChip';
import DashboardDrilldown, { DrilldownState } from '../components/dashboard/DashboardDrilldown';
import StatCard from '../components/dashboard/StatCard';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import DashboardHero from '../components/dashboard/DashboardHero';
import PostureRing from '../components/dashboard/PostureRing';
import SecurityFeedItem from '../components/dashboard/SecurityFeedItem';
import PostureTrendChart from '../components/dashboard/PostureTrendChart';
import CloudProviderBreakdown from '../components/dashboard/CloudProviderBreakdown';
import RiskHeatmap from '../components/dashboard/RiskHeatmap';
import AlgorithmDistributionChart from '../components/dashboard/AlgorithmDistributionChart';
import PQCReadinessPanel from '../components/dashboard/PQCReadinessPanel';
import QuickActionsGrid, { DEFAULT_QUICK_ACTIONS } from '../components/dashboard/QuickActionsGrid';
import CspmCapabilityStrip from '../components/dashboard/CspmCapabilityStrip';
import ComplianceScoreGrid from '../components/dashboard/ComplianceScoreGrid';
import TopFindingsList from '../components/dashboard/TopFindingsList';
import ScanActivityTimeline from '../components/dashboard/ScanActivityTimeline';
import FindingsSeverityBar from '../components/dashboard/FindingsSeverityBar';
import ThreatIntelStrip from '../components/dashboard/ThreatIntelStrip';
import dashboardDesign from '../theme/dashboardDesign';
import designSystem, { heroPrimaryCtaSx, heroSecondaryCtaSx, metricValueSx } from '../theme/designSystem';
import { tokens } from '../theme/tokens';

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
  const { edition, isDemo } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'));
  const [timeRange, setTimeRange] = React.useState('7d');
  const [trendActiveIndex, setTrendActiveIndex] = React.useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = React.useState<string | null>(null);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = React.useState<string | null>(null);
  const [drilldown, setDrilldown] = React.useState<DrilldownState>(null);

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

  const model = React.useMemo(() => buildDashboardViewModel({
    summary: summaryData,
    assets,
    resources: resourcesSummary,
    events: securityEvents,
    compliance: complianceDash,
    cspm: cspmOverview,
    analytics: analyticsInsights,
    benchmarks: benchmarkData,
    timeRange: timeRange === '30d' ? '30d' : '7d',
  }), [
    summaryData, assets, resourcesSummary, securityEvents, complianceDash,
    cspmOverview, analyticsInsights, benchmarkData, timeRange,
  ]);

  const openDrill = (kind: DrilldownKind, title: string, extra?: Partial<NonNullable<DrilldownState>>) => {
    setDrilldown({ kind, title, ...extra });
  };

  const healthScore = model.posture.score;
  const totalResources = model.totals.assets;
  const findings = model.totals.open;
  const totalFindings = model.totals.findingsOpen;
  const algorithmData = model.algorithmData;
  const riskData = model.riskData;
  const heatmap = model.heatmap;
  const feed = model.feed;
  const complianceAvg = model.complianceAvg;
  const postureTrend = model.postureTrend;
  const providerData = model.providerData;
  const pqcStats = model.totals.pqc;
  const complianceFrameworks = model.frameworks.slice(0, 8).map((d) => ({
    id: d.id,
    name: d.name,
    score: d.score,
    assessed: d.assessed,
    passed: d.passed,
    failed: d.failed,
  }));
  const topFindings = model.openFindings.slice(0, 6).map((e) => ({
    id: e.id,
    title: e.title,
    severity: e.severity,
    resource: e.assetName,
    framework: e.cveId || e.framework,
  }));
  const scanEvents = model.scans;
  const threatMetrics = model.threatMetrics;
  const liveScanMetrics = model.liveScanMetrics;

  const pqcPct = pqcStats.quantumSafe + pqcStats.vulnerable
    ? Math.round((pqcStats.quantumSafe / (pqcStats.quantumSafe + pqcStats.vulnerable)) * 100)
    : 0;

  const quickActions = React.useMemo(() => (
    isPaidEdition(edition)
      ? DEFAULT_QUICK_ACTIONS
      : DEFAULT_QUICK_ACTIONS.filter((a) => !a.path.startsWith('/enterprise'))
  ), [edition]);

  const riskTotal = riskData.reduce((s, d) => s + d.value, 0);

  if (summaryLoading && !summaryData) {
    return (
      <Box sx={dashboardDesign.layout.page}>
        <Skeleton variant="rounded" height={168} sx={{ borderRadius: 3, mb: 1.5 }} />
        <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: 1.5 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={128} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={dashboardDesign.layout.gridSpacing}>
          <Grid item xs={12} md={8}><Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} /></Grid>
          <Grid item xs={12} md={4}><Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} /></Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress size={22} thickness={4} aria-label="Loading dashboard" />
        </Box>
      </Box>
    );
  }

  const communityOnboarding = !isPaidEdition(edition) && !isDemo && model.dataMode === 'demo';
  if (communityOnboarding) {
    return (
      <Box sx={dashboardDesign.layout.page}>
        <DashboardHero
          eyebrow="Community edition"
          title="Your cryptographic command center"
          subtitle="Community shows inventory from scans you run in this workspace. Enterprise simulation data is not mixed in."
          action={
            <Stack spacing={1} sx={{ minWidth: { sm: 180 } }}>
              <Button variant="contained" disableElevation endIcon={<ArrowForward />} onClick={() => navigate('/scanner')} sx={heroPrimaryCtaSx}>
                Run CBOM scan
              </Button>
              <Button variant="outlined" onClick={() => navigate('/demo')} sx={heroSecondaryCtaSx}>
                Try labeled demo
              </Button>
            </Stack>
          }
        />
        <EmptyState
          icon={<Security />}
          title="No scan results yet"
          description="Point the scanner at a repository or hostname, or use the CLI: rivicq scan ."
          action={{ label: 'Open scanner', onClick: () => navigate('/scanner') }}
        />
      </Box>
    );
  }

  return (
    <Box sx={dashboardDesign.layout.page}>
      <DashboardHero
        eyebrow="Security Command Center"
        title="Cryptographic Security Posture Management"
        subtitle="Welcome to RivicQ CSPM — unified cryptographic posture across cloud accounts, workloads, GitHub repositories, CBOM inventory, and PQC migration readiness."
        meta={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {['CSPM', 'CBOM', 'PQC', 'GitHub', 'AWS', 'Azure', 'GCP', 'K8s'].map((c) => (
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
            <ProvenanceChip kind={model.dataMode} label={model.dataMode === 'demo' ? 'DEMO ENVIRONMENT' : 'LIVE'} />
          </Stack>
        }
        action={
          <Stack spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 180 } }}>
            {isPaidEdition(edition) ? (
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
            )}
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GitHub sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/scanner?tab=github')}
              sx={{ ...heroSecondaryCtaSx, maxWidth: { sm: 'none' } }}
            >
              Scan GitHub
            </Button>
          </Stack>
        }
        liveScanMetrics={liveScanMetrics}
      >
        <PostureRing score={healthScore} size={isCompact ? 96 : 128} onDark />
      </DashboardHero>

      <CspmCapabilityStrip onNavigate={navigate} />

      <QuickActionsGrid actions={quickActions} onNavigate={navigate} />

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Posture Score"
            value={healthScore}
            hint={`${model.dataMode === 'demo' ? 'Calculated · simulated estate' : 'Calculated · live estate'} · click for contributors`}
            trend={{ value: `${postureTrend.length > 1 && postureTrend[postureTrend.length - 1].score - postureTrend[0].score >= 0 ? '+' : ''}${postureTrend.length > 1 ? (postureTrend[postureTrend.length - 1].score - postureTrend[0].score).toFixed(1) : '0'}`, positive: postureTrend.length > 1 ? postureTrend[postureTrend.length - 1].score - postureTrend[0].score >= 0 : true }}
            icon={<GppGood />}
            accent={healthScore >= 80 ? dashboardDesign.severity.low : healthScore >= 60 ? dashboardDesign.severity.high : dashboardDesign.severity.critical}
            featured
            delay={0}
            onClick={() => openDrill('posture', 'Posture score', { subtitle: model.posture.method })}
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
            label="Cloud Resources"
            value={totalResources.toLocaleString()}
            hint={`${model.totals.accounts} accounts · ${model.totals.clusters} clusters · click for inventory`}
            icon={<Memory />}
            accent={tokens.colors.rivicq[500]}
            delay={1}
            onClick={() => openDrill('resources', 'Cloud accounts', { subtitle: `${model.environmentLabel}` })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Open Findings"
            value={totalFindings.toLocaleString()}
            hint={`${findings.critical} critical · ${findings.high} high · ${model.totals.findingsResolved.toLocaleString()} remediated`}
            trend={{ value: `${model.totals.findingsResolved.toLocaleString()} closed`, positive: true }}
            icon={<NotificationsActive />}
            accent={dashboardDesign.severity.high}
            delay={2}
            onClick={() => openDrill('findings', 'Open findings', { subtitle: 'Representative records from the estate' })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="At-Risk Objects"
            value={model.totals.exposed.toLocaleString()}
            hint={complianceAvg ? `Compliance ${complianceAvg}% · ${model.totals.criticalAssets.toLocaleString()} critical assets` : 'Internet-reachable resources'}
            icon={<Lock />}
            accent={dashboardDesign.severity.critical}
            delay={3}
            onClick={() => openDrill('exposed', 'Internet-exposed assets', { subtitle: 'Simulated public reachability — not claimed as RivicQ-observed internet scan data' })}
          />
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
          <DashboardPanel title="Cloud Resources" subtitle="By provider · click to inspect accounts" delay={2}>
            <CloudProviderBreakdown
              data={providerData}
              selected={selectedProvider}
              onSelect={(name) => {
                setSelectedProvider(name);
                if (name) openDrill('provider', `${name} posture`, { provider: name, subtitle: 'Findings on simulated assets in this provider' });
              }}
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
              onSelect={(cell) => {
                setSelectedHeatmapCell(cell?.id ?? null);
                if (cell && cell.count > 0) {
                  openDrill('findings', cell.label, { subtitle: 'Finding density for the selected period (simulated timestamps)' });
                }
              }}
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
                    onClick={(entry: any) => openDrill('risk', `${entry?.name || 'Risk'} assets`, { subtitle: 'Asset risk scores are calculated from CVE, exposure, IAM, misconfig, and KEV flags.' })}
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
            subtitle={model.dataMode === 'demo' ? 'Simulated posture events · real CVE titles where applicable' : 'Real-time posture events'}
            delay={4}
            action={<ProvenanceChip kind={model.dataMode} />}
          >
            <Box sx={{ maxHeight: dashboardDesign.layout.feedMaxHeight, overflowY: 'auto', overflowX: 'hidden', pr: 0.5 }}>
              {feed.map((evt: any, i: number) => (
                <SecurityFeedItem
                  key={evt.findingId || i}
                  message={evt.message}
                  severity={evt.severity}
                  time={evt.time}
                  onClick={() => {
                    const cveId = String(evt.message).match(/CVE-\d{4}-\d+/)?.[0];
                    openDrill(cveId ? 'cve' : 'feed', cveId || 'Finding', { cveId, subtitle: evt.message });
                  }}
                />
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
            subtitle={complianceAvg ? `Calculated average ${complianceAvg}% · click a framework` : 'Regulatory alignment overview'}
            delay={6}
            action={<Chip size="small" label={`${complianceFrameworks.length} active`} variant="outlined" sx={{ fontSize: '0.6875rem', height: 24 }} />}
          >
            <ComplianceScoreGrid
              frameworks={complianceFrameworks}
              onSelect={(id) => {
                const fw = model.frameworks.find((f) => f.id === id);
                openDrill('compliance', fw?.name || id, {
                  frameworkId: id,
                  subtitle: fw ? `Assessed ${fw.assessed} · passed ${fw.passed} · failed ${fw.failed} · partial ${fw.partial}` : undefined,
                });
              }}
            />
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
            <TopFindingsList
              findings={topFindings}
              onSelect={(id) => {
                const f = model.openFindings.find((x) => x.id === id);
                openDrill(f?.cveId ? 'cve' : 'findings', f?.cveId || f?.title || 'Finding', { cveId: f?.cveId, subtitle: f?.message });
              }}
            />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <DashboardPanel
            title="Scan Activity"
            subtitle="Recent CBOM & infrastructure scans"
            delay={8}
            action={<ProvenanceChip kind={model.dataMode} />}
          >
            <ScanActivityTimeline events={scanEvents} onSelect={() => openDrill('scans', 'Recent scans')} />
          </DashboardPanel>
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={8}>
          <DashboardPanel title="Findings by Severity" subtitle={`${totalFindings} open across all environments`} delay={9}>
            <FindingsSeverityBar
              findings={{
                critical: findings.critical ?? 0,
                high: findings.high ?? 0,
                medium: findings.medium ?? 0,
                low: findings.low ?? 0,
              }}
              onSelect={(sev) => openDrill('severity', `${sev} findings`, { severity: sev, subtitle: 'Open findings in this severity band' })}
            />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardPanel title="Threat Intelligence" subtitle="CISA KEV + calculated operational signals" delay={10}>
            <ThreatIntelStrip
              metrics={threatMetrics}
              onSelect={(label) => openDrill(label.toLowerCase().includes('exposed') ? 'exposed' : 'findings', label)}
            />
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, mb: 0.5 }}>Industry benchmark (not RivicQ telemetry)</Typography>
              {model.industryBenchmarks.slice(0, 3).map((b) => (
                <Typography key={b.label} sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                  {b.label}: {b.value} · {b.provenance.source}
                </Typography>
              ))}
            </Box>
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
          bgcolor: isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.05)',
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
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {model.environmentLabel} · posture calculated · industry benchmarks labeled separately
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip icon={<TrendingUp sx={{ fontSize: 14 }} />} label={`PQC ${pqcPct}%`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
          <Chip label="NIST CSF" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
          <Chip label="SOC 2" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
          <ProvenanceChip kind={model.dataMode} />
        </Stack>
      </Box>

      <DashboardDrilldown
        open={!!drilldown}
        onClose={() => setDrilldown(null)}
        state={drilldown}
        model={model}
        onSelectFinding={(f) => setDrilldown({
          kind: f.cveId ? 'cve' : 'findings',
          title: f.cveId || f.title,
          subtitle: f.message,
          cveId: f.cveId,
        })}
      />
    </Box>
  );
};

export default Dashboard;

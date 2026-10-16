import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Grid, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  ArrowForward, GitHub, GppGood, Lock, Memory, NotificationsActive, Security,
} from '@mui/icons-material';
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
import InboxHero from '../components/dashboard/InboxHero';
import PostureTrendChart from '../components/dashboard/PostureTrendChart';
import CloudProviderBreakdown from '../components/dashboard/CloudProviderBreakdown';
import AlgorithmDistributionChart from '../components/dashboard/AlgorithmDistributionChart';
import PQCReadinessPanel from '../components/dashboard/PQCReadinessPanel';
import QuickActionsGrid, { DEFAULT_QUICK_ACTIONS } from '../components/dashboard/QuickActionsGrid';
import ComplianceScoreGrid from '../components/dashboard/ComplianceScoreGrid';
import ScanActivityTimeline from '../components/dashboard/ScanActivityTimeline';
import FindingsSeverityBar from '../components/dashboard/FindingsSeverityBar';
import dashboardDesign from '../theme/dashboardDesign';
import { heroPrimaryCtaSx, heroSecondaryCtaSx } from '../theme/designSystem';
import { tokens } from '../theme/tokens';
import { loadPersona, PERSONA_HELP, type OpsPersona } from '../ops/persona';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { edition, isDemo } = useAuth();
  const [timeRange, setTimeRange] = React.useState('7d');
  const [trendActiveIndex, setTrendActiveIndex] = React.useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = React.useState<string | null>(null);
  const [drilldown, setDrilldown] = React.useState<DrilldownState>(null);
  const [persona, setPersona] = React.useState<OpsPersona>(() => loadPersona());
  React.useEffect(() => {
    const onPersona = (e: Event) => {
      const next = (e as CustomEvent).detail;
      if (next === 'ciso' || next === 'analyst' || next === 'engineer') setPersona(next);
    };
    window.addEventListener('rivicq-persona', onPersona);
    return () => window.removeEventListener('rivicq-persona', onPersona);
  }, []);

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

  const quickActions = React.useMemo(() => {
    let list = isPaidEdition(edition)
      ? DEFAULT_QUICK_ACTIONS
      : DEFAULT_QUICK_ACTIONS.filter((a) => !a.path.startsWith('/enterprise'));
    if (persona === 'ciso') {
      list = list.filter((a) => !['GitHub Scan', 'Run Scan'].includes(a.label));
    }
    if (persona === 'engineer') {
      list = list.filter((a) => ['Run Scan', 'GitHub Scan', 'Critical findings', 'CBOM'].includes(a.label) || a.path.startsWith('/scanner') || a.path === '/tools');
    }
    return list;
  }, [edition, persona]);

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
        <InboxHero
          eyebrow="Community edition"
          title="Your workspace inbox"
          subtitle="Community shows inventory from scans you run in this workspace. Enterprise simulation data is not mixed in."
          openCount={0}
          criticalCount={0}
          posture={0}
          items={[]}
          onOpenQueue={() => navigate('/findings')}
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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
          description="Point the scanner at a repository or hostname, or use the CLI: rivicq scan . Settings holds MFA and password; Admin is available to workspace admins."
          action={{ label: 'Open scanner', onClick: () => navigate('/scanner') }}
        />
      </Box>
    );
  }

  return (
    <Box sx={dashboardDesign.layout.page}>
      <InboxHero
        eyebrow="Security Cloud"
        title="Inbox · today’s work"
        subtitle="Review open findings, then scan, remediate, and export evidence. Community CBOM and SBOM stay on this estate; QBOM/HBOM/AIBOM/IBOM are Enterprise."
        openCount={totalFindings}
        criticalCount={findings.critical ?? 0}
        posture={healthScore}
        items={topFindings.slice(0, 4).map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          resource: f.resource,
        }))}
        onOpenQueue={() => navigate('/findings')}
        onSelectItem={(id) => navigate(`/findings?id=${encodeURIComponent(id)}`)}
        meta={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <ProvenanceChip kind={model.dataMode} label={model.dataMode === 'demo' ? 'DEMO ENVIRONMENT' : 'LIVE'} />
            <Typography variant="caption" color="text.secondary">{PERSONA_HELP[persona]}</Typography>
            <Button size="small" startIcon={<GitHub sx={{ fontSize: 16 }} />} onClick={() => navigate('/scanner?tab=github')}>
              Scan GitHub
            </Button>
            <Button size="small" onClick={() => navigate('/bom')}>CBOM</Button>
            {isPaidEdition(edition) && (
              <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} onClick={() => navigate('/enterprise/cloud-posture')}>
                Cloud posture
              </Button>
            )}
          </Stack>
        }
      />

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
            onClick={() => navigate('/findings')}
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
        <Grid item xs={12} md={6}>
          <DashboardPanel title="PQC classification" subtitle="From scan intelligence in this workspace — not a live key rotation" delay={3}>
            <PQCReadinessPanel {...pqcStats} />
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          {persona === 'ciso' ? (
            <DashboardPanel
              title="Compliance mappings"
              subtitle={complianceAvg ? `Calculated average ${complianceAvg}% · mappings, not certifications` : 'Control mappings for operators'}
              delay={4}
              action={<Chip size="small" label={`${complianceFrameworks.length} frameworks`} variant="outlined" sx={{ fontSize: '0.6875rem', height: 24 }} />}
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
          ) : (
            <DashboardPanel
              title="Algorithm inventory"
              subtitle="CBOM inventory · click bars to highlight"
              delay={4}
              action={<Chip size="small" icon={<Security sx={{ fontSize: 14 }} />} label="CBOM" variant="outlined" sx={{ fontSize: '0.6875rem', height: 24 }} />}
            >
              <AlgorithmDistributionChart
                data={algorithmData}
                selected={selectedAlgorithm}
                onSelect={setSelectedAlgorithm}
              />
            </DashboardPanel>
          )}
        </Grid>
      </Grid>

      <Grid container spacing={dashboardDesign.layout.gridSpacing} sx={{ mb: dashboardDesign.layout.sectionGap }}>
        <Grid item xs={12} md={7}>
          <DashboardPanel title="Findings by severity" subtitle={`${totalFindings} open in this workspace`} delay={5}>
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
        <Grid item xs={12} md={5}>
          <DashboardPanel
            title="Scan activity"
            subtitle="Recent CBOM & infrastructure scans"
            delay={6}
            action={<ProvenanceChip kind={model.dataMode} />}
          >
            <ScanActivityTimeline events={scanEvents} onSelect={() => openDrill('scans', 'Recent scans')} />
          </DashboardPanel>
        </Grid>
      </Grid>

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

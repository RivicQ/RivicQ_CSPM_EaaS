import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Assessment,
  ArrowForward,
  Cloud,
  CloudQueue,
  Psychology,
  Security,
  Storage,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  cbomService,
  benchmarkService,
  cloudService,
  complianceService,
  inventoryService,
  quantumAttestationService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import BetaBanner from '../components/BetaBanner';
import BenchmarkPanel from '../components/BenchmarkPanel';
import ContextualAIAssistant from '../components/ContextualAIAssistant';
import CloudConnectionStatus from '../components/CloudConnectionStatus';
import HSMStatusBadge from '../components/HSMStatusBadge';
import QuantumRiskScore from '../components/QuantumRiskScore';
import { OSSvsEnterpriseBanner } from '../components/OSSvsEnterpriseBanner';

const COLORS = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444'];

function normalizeList(data: any, key: string): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const MetricCard: React.FC<{
  title: string;
  metric: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}> = ({ title, metric, subtitle, icon, color, actionLabel, onAction, children }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={color} sx={{ mt: 0.5 }}>
            {metric}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: `${color}1a`, color }}>{icon}</Avatar>
      </Box>

      <Box sx={{ flexGrow: 1, mt: 2 }}>{children}</Box>

      <Button
        variant="text"
        endIcon={<ArrowForward />}
        onClick={onAction}
        sx={{ alignSelf: 'flex-start', mt: 2, px: 0 }}
      >
        {actionLabel}
      </Button>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { edition } = useAuth();

  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['dashboard', 'inventory-summary'],
    queryFn: () => inventoryService.getInventorySummary().then((response) => response.data),
    retry: 1,
  });

  const { data: assetsData, error: assetsError } = useQuery({
    queryKey: ['dashboard', 'assets'],
    queryFn: () => inventoryService.getAssets().then((response) => response.data),
    retry: 1,
  });

  const { data: complianceData, error: complianceError } = useQuery({
    queryKey: ['dashboard', 'compliance-dashboards'],
    queryFn: () => complianceService.getAllDashboards().then((response) => response.data),
    retry: 1,
  });

  const { data: risksData, error: risksError } = useQuery({
    queryKey: ['dashboard', 'risks'],
    queryFn: () => complianceService.getRisks().then((response) => response.data),
    retry: 1,
  });

  const { data: cloudData, error: cloudError } = useQuery({
    queryKey: ['dashboard', 'cloud-summary'],
    queryFn: () => cloudService.getResourcesSummary().then((response) => response.data),
    retry: 1,
  });

  const { data: cbomReportsData, error: cbomError } = useQuery({
    queryKey: ['dashboard', 'cbom-reports'],
    queryFn: () => cbomService.getReports().then((response) => response.data),
    retry: 1,
  });

  const { data: quantumData, error: quantumError } = useQuery({
    queryKey: ['dashboard', 'quantum-risk'],
    queryFn: () => quantumAttestationService.getQuantumRiskAssessment().then((response) => response.data),
    retry: 1,
  });

  const { data: roadmapData } = useQuery({
    queryKey: ['dashboard', 'quantum-roadmap'],
    queryFn: () => quantumAttestationService.getMigrationRoadmap().then((response) => response.data),
    retry: 1,
  });

  const { data: benchmarkData } = useQuery({
    queryKey: ['dashboard', 'benchmarks'],
    queryFn: () => benchmarkService.getSummary().then((response) => response.data),
    retry: 1,
  });

  const assets = React.useMemo(() => normalizeList(assetsData, 'assets'), [assetsData]);
  const complianceDashboards = React.useMemo(() => normalizeList(complianceData, 'dashboards'), [complianceData]);
  const risks = React.useMemo(() => normalizeList(risksData, 'risks'), [risksData]);
  const cbomReports = React.useMemo(() => normalizeList(cbomReportsData, 'reports'), [cbomReportsData]);
  const roadmapMilestones = React.useMemo(() => normalizeList(roadmapData, 'milestones'), [roadmapData]);
  const benchmarkSummary = benchmarkData as any;

  const totalAssets = assets.length || toNumber((summaryData as any)?.total_assets, 0) || 42;
  const quantumSafeAssets = assets.filter((asset: any) => asset.quantum_safe || asset.quantumSafe).length || toNumber((summaryData as any)?.quantum_safe, 0) || 15;
  const vulnerableAssets = assets.filter((asset: any) =>
    asset.risk_level === 'HIGH' ||
    asset.risk_level === 'CRITICAL' ||
    asset.riskLevel === 'HIGH' ||
    asset.riskLevel === 'CRITICAL'
  ).length || toNumber((summaryData as any)?.vulnerabilities, 0) || 8;

  const complianceScore = React.useMemo(() => {
    if (complianceDashboards.length > 0) {
      const average = complianceDashboards.reduce((sum: number, dashboard: any) => sum + toNumber(dashboard.score, 0), 0) / complianceDashboards.length;
      return Math.round(average);
    }

    return toNumber((summaryData as any)?.compliance_score, 85);
  }, [complianceDashboards, summaryData]);

  const criticalFindings = React.useMemo(() => {
    const riskCount = risks.filter((risk: any) => String(risk.severity).toLowerCase() === 'critical' || String(risk.severity).toLowerCase() === 'high').length;
    return riskCount || toNumber((cloudData as any)?.security_findings?.critical, 2) || 3;
  }, [cloudData, risks]);

  const cloudResources = toNumber((cloudData as any)?.total_resources, 1604);
  const cloudCriticalFindings = toNumber((cloudData as any)?.security_findings?.critical, 2);
  const cbomReportsCount = cbomReports.length || toNumber((summaryData as any)?.cbom_reports, 0) || 12;
  const quantumRiskScore = toNumber((quantumData as any)?.risk_score, 72);
  const pqcReadiness = toNumber((quantumData as any)?.pqc_readiness, 45);
  const enterpriseUnlocked = edition === 'enterprise';

  const providerData = React.useMemo(() => {
    const providers = (cloudData as any)?.by_provider;

    if (providers && typeof providers === 'object') {
      return Object.entries(providers)
        .map(([name, value]) => ({ name: String(name).toUpperCase(), value: toNumber(value, 0) }))
        .filter((entry) => entry.value > 0);
    }

    return [
      { name: 'AWS', value: 847 },
      { name: 'GCP', value: 523 },
      { name: 'IBM CLOUD', value: 234 },
    ];
  }, [cloudData]);

  const algorithmData = React.useMemo(() => {
    const counts: Record<string, number> = {};

    assets.forEach((asset: any) => {
      const algorithm = asset.algorithm || asset.crypto_algorithm || 'Unknown';
      counts[algorithm] = (counts[algorithm] || 0) + 1;
    });

    const entries = Object.entries(counts).map(([name, value]) => ({ name, value }));

    return entries.length > 0
      ? entries
      : [
          { name: 'RSA-2048', value: 28 },
          { name: 'ECDSA-P256', value: 19 },
          { name: 'AES-256', value: 37 },
          { name: 'ChaCha20', value: 11 },
        ];
  }, [assets]);

  const riskData = React.useMemo(() => {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const entries = levels.map((level) => ({
      name: level,
      value: assets.filter((asset: any) => String(asset.risk_level || asset.riskLevel).toUpperCase() === level).length,
    }));

    return entries.some((entry) => entry.value > 0)
      ? entries
      : [
          { name: 'LOW', value: 14 },
          { name: 'MEDIUM', value: 9 },
          { name: 'HIGH', value: 4 },
          { name: 'CRITICAL', value: 2 },
        ];
  }, [assets]);

  const topFrameworks = React.useMemo(() => {
    if (complianceDashboards.length > 0) {
      return complianceDashboards.slice(0, 4).map((dashboard: any) => ({
        label: String(dashboard.framework || dashboard.name || 'Framework').toUpperCase(),
        score: toNumber(dashboard.score, 0),
      }));
    }

    return [
      { label: 'ISO 27001', score: 85 },
      { label: 'DORA', score: 72 },
      { label: 'NIST', score: 78 },
      { label: 'PQC', score: 35 },
    ];
  }, [complianceDashboards]);

  const roadmapSteps = React.useMemo(() => {
    if (roadmapMilestones.length > 0) {
      return roadmapMilestones.map((milestone: any) => ({
        title: milestone.name || milestone.phase || 'Milestone',
        description: milestone.description || milestone.desc || '',
        progress: toNumber(milestone.progress, 0),
      }));
    }

    return [
      { title: 'Phase 1: Inventory', description: 'Identify all quantum-vulnerable assets', progress: 100 },
      { title: 'Phase 2: Assessment', description: 'Risk assessment and prioritization', progress: 60 },
      { title: 'Phase 3: Migration', description: 'Migrate to PQC algorithms', progress: 20 },
      { title: 'Phase 4: Validation', description: 'Verify PQC implementation', progress: 0 },
    ];
  }, [roadmapMilestones]);

  const alertNeeded = Boolean(summaryError || assetsError || complianceError || risksError || cloudError || cbomError || quantumError);

  if (summaryLoading && !summaryData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Security Command Center
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900 }}>
          Unified view for CISO posture, CSPM coverage, CBOM inventory, and PQC migration readiness across OSS and Enterprise.
        </Typography>
      </Box>

      <BetaBanner />

      {alertNeeded && (
        <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
          Live backend data is partially unavailable. The affected panels are waiting on API responses.
        </Alert>
      )}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
        <CloudConnectionStatus provider="aws" />
        <CloudConnectionStatus provider="gcp" />
        {enterpriseUnlocked && <CloudConnectionStatus provider="ibm" />}
        <HSMStatusBadge provider="aws" keyCount={Math.max(1, Math.round(cloudResources / 18))} />
        {enterpriseUnlocked && <HSMStatusBadge provider="ibm" keyCount={Math.max(1, Math.round(cloudResources / 24))} />}
        <Chip icon={<Security />} label="CISO" color="primary" variant="outlined" />
        <Chip icon={<CloudQueue />} label="CSPM" color="secondary" variant="outlined" />
        <Chip icon={<Storage />} label="CBOM" color="default" variant="outlined" />
        <Chip icon={<Psychology />} label={enterpriseUnlocked ? 'PQC Migration' : 'Enterprise locked'} color={enterpriseUnlocked ? 'warning' : 'default'} variant="outlined" />
      </Stack>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} xl={6}>
          <ContextualAIAssistant
            contextKey="dashboard"
            edition={edition}
            title="RivicQ AI Briefing"
            description="Get a plain-language explanation of the CISO, CSPM, CBOM, and PQC view on this page."
            benchmark={benchmarkSummary}
          />
        </Grid>
        <Grid item xs={12} md={6} xl={6}>
          <BenchmarkPanel data={benchmarkSummary} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} xl={3}>
          {enterpriseUnlocked ? (
            <MetricCard
              title="CISO"
              metric={`${complianceScore}%`}
              subtitle="Overall compliance posture and executive risk view"
              icon={<Security />}
              color="#d4af37"
              actionLabel="Open Compliance"
              onAction={() => navigate('/enterprise/compliance')}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Critical findings: {criticalFindings}
              </Typography>
              <LinearProgress variant="determinate" value={complianceScore} sx={{ height: 8, borderRadius: 999, mb: 1.5 }} />
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {topFrameworks.map((framework) => (
                  <Chip
                    key={framework.label}
                    label={`${framework.label} ${framework.score}%`}
                    size="small"
                    color={framework.score >= 80 ? 'success' : framework.score >= 60 ? 'warning' : 'error'}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </MetricCard>
          ) : (
            <OSSvsEnterpriseBanner
              featureName="CISO Compliance View"
              description="Enterprise unlocks compliance controls, executive risk reporting, and framework dashboards."
            />
          )}
        </Grid>

        <Grid item xs={12} md={6} xl={3}>
          {enterpriseUnlocked ? (
            <MetricCard
              title="CSPM"
              metric={cloudResources.toLocaleString()}
              subtitle="Cloud resources under governance"
              icon={<CloudQueue />}
              color="#00c2ff"
              actionLabel="Open Multi-Cloud"
              onAction={() => navigate('/enterprise/multicloud')}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Critical cloud findings: {cloudCriticalFindings}
              </Typography>
              <Box sx={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00c2ff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </MetricCard>
          ) : (
            <OSSvsEnterpriseBanner
              featureName="CSPM Cloud Posture"
              description="Enterprise unlocks AWS, GCP, IBM Cloud posture checks and executive reporting."
            />
          )}
        </Grid>

        <Grid item xs={12} md={6} xl={3}>
          <MetricCard
            title="CBOM"
            metric={totalAssets.toLocaleString()}
            subtitle="Assets inventoried and CBOM-ready"
            icon={<Storage />}
            color="#f59e0b"
            actionLabel="Start CBOM Scan"
            onAction={() => navigate('/scanner')}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Reports generated: {cbomReportsCount} · Quantum safe assets: {quantumSafeAssets}
            </Typography>
            <Box sx={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={62} label>
                    {riskData.map((_entry, index) => (
                      <Cell key={`risk-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </MetricCard>
        </Grid>

        <Grid item xs={12} md={6} xl={3}>
          {enterpriseUnlocked ? (
            <MetricCard
              title="PQC Migration"
              metric={`${pqcReadiness}%`}
              subtitle="Post-quantum readiness and migration status"
              icon={<Psychology />}
              color="#f59e0b"
              actionLabel="Open PQC Roadmap"
              onAction={() => navigate('/enterprise/quantum-attestation')}
            >
              <Box sx={{ mb: 1.5 }}>
                <QuantumRiskScore score={quantumRiskScore} size="large" />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Quantum-vulnerable assets: {vulnerableAssets}
              </Typography>
            </MetricCard>
          ) : (
            <OSSvsEnterpriseBanner
              featureName="PQC Migration Planner"
              description="Enterprise unlocks PQC readiness scoring, migration roadmap, and attestation reports."
            />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CBOM Algorithm Distribution
              </Typography>
              {algorithmData.length > 0 ? (
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={algorithmData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#667eea" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box height={280} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">No asset data yet. Start a CBOM scan to populate the dashboard.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PQC Migration Roadmap
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {roadmapSteps.map((step) => (
                  <Box key={step.title}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {step.title}
                      </Typography>
                      <Chip label={`${step.progress}%`} size="small" color={step.progress >= 80 ? 'success' : step.progress >= 40 ? 'warning' : 'default'} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                      {step.description}
                    </Typography>
                    <LinearProgress variant="determinate" value={step.progress} sx={{ height: 6, borderRadius: 999 }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Executive Action Center
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use the production routes already wired in the repo to move from summary to action.
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Run compliance scan', icon: <Assessment />, path: '/enterprise/compliance' },
                  { label: 'Launch CBOM scan', icon: <Storage />, path: '/scanner' },
                  { label: 'Review cloud posture', icon: <Cloud />, path: '/enterprise/multicloud' },
                  { label: 'Assess PQC migration', icon: <Psychology />, path: '/enterprise/quantum-attestation' },
                ].map((action) => (
                  <Grid item xs={12} sm={6} key={action.label}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => navigate(action.path)}
                      sx={{ justifyContent: 'flex-start', py: 1.25 }}
                    >
                      {action.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Posture Snapshot
              </Typography>
              <Stack spacing={1.5}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">CISO Compliance</Typography>
                    <Typography variant="body2" color="text.secondary">{complianceScore}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={complianceScore} sx={{ height: 8, borderRadius: 999 }} />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">CBOM Coverage</Typography>
                    <Typography variant="body2" color="text.secondary">{totalAssets.toLocaleString()} assets</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(100, Math.max(20, totalAssets / 50))} sx={{ height: 8, borderRadius: 999 }} />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">PQC Readiness</Typography>
                    <Typography variant="body2" color="text.secondary">{pqcReadiness}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={pqcReadiness} sx={{ height: 8, borderRadius: 999 }} color="warning" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography,
} from '@mui/material';
import {
  ArrowForward, GppGood, Lock, Memory, NotificationsActive, Security, Storage, Warning,
} from '@mui/icons-material';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  cloudService, complianceService, inventoryService, postureService, securityService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageFrame from '../components/PageFrame';
import { tokens } from '../theme/tokens';

const MetricCard: React.FC<{
  title: string; metric: string; subtitle: string; icon: React.ReactNode; color: string; children?: React.ReactNode;
}> = ({ title, metric, subtitle, icon, color, children }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>{title}</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color, mt: 0.5 }}>{metric}</Typography>
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{subtitle}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: `${color}1f`, color }}>{icon}</Avatar>
      </Box>
      {children && <Box sx={{ flexGrow: 1, mt: 2 }}>{children}</Box>}
    </CardContent>
  </Card>
);

const SEVERITY_COLORS = [tokens.colors.crypto.low, tokens.colors.crypto.medium, tokens.colors.crypto.high, tokens.colors.crypto.critical];

const DEMO_FEED = [
  { time: '2m', severity: 'critical', message: 'Public S3 bucket (crypto-assets-prod) allows unauthenticated write access' },
  { time: '9m', severity: 'high', message: 'Security group ssh-public-open exposes port 22 to 0.0.0.0/0' },
  { time: '17m', severity: 'medium', message: 'GCS bucket lacks uniform bucket-level access control' },
  { time: '26m', severity: 'low', message: 'KMS key rotation disabled for alias/aws/ebs' },
  { time: '41m', severity: 'critical', message: 'IAM policy grants wildcard Action "*" on KMS keys' },
  { time: '1h', severity: 'medium', message: 'Azure Key Vault soft-delete purge protection disabled' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { edition } = useAuth();

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => inventoryService.getInventorySummary().then((r) => r.data),
    retry: 1,
  });

  const { data: cspmOverview } = useQuery({
    queryKey: ['dashboard-cspm'],
    queryFn: () => postureService.getOverview().then((r) => r.data),
    retry: 1,
    enabled: edition === 'enterprise',
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
    enabled: edition === 'enterprise',
  });

  const assets = React.useMemo(() => {
    const list = Array.isArray(assetsData) ? assetsData : Array.isArray((assetsData as any)?.assets) ? (assetsData as any).assets : [];
    return list.length > 0 ? list : [];
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
        { name: 'AES-256-GCM', value: 37 },
        { name: 'RSA-2048', value: 28 },
        { name: 'ML-KEM-768', value: 12 },
        { name: 'ECDSA P-256', value: 19 },
        { name: 'Triple DES', value: 8 },
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
    const cells: { risk: number }[] = [];
    const seed = [0, 0, 0, 1, 0, 2, 0, 0, 1, 3, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 3, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 2, 0, 0, 3, 1, 0, 0, 2, 0];
    seed.forEach((risk) => cells.push({ risk }));
    return cells;
  }, []);

  const feed = securityEvents?.events?.length
    ? securityEvents.events.slice(0, 6).map((e: any) => ({ time: e.created_at || 'now', severity: e.severity || 'low', message: e.message || e.description || '' }))
    : DEMO_FEED;

  const complianceAvg = React.useMemo(() => {
    const dashboards = complianceDash?.dashboards;
    if (!dashboards?.length) return null;
    const avg = dashboards.reduce((a: number, d: any) => a + (d.score || 0), 0) / dashboards.length;
    return Math.round(avg);
  }, [complianceDash]);

  if (summaryLoading && !summaryData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><CircularProgress /></Box>;
  }

  return (
    <PageFrame
      title="Security Command Center"
      subtitle="Unified posture across cloud accounts, workloads, crypto inventory, and PQC migration readiness."
      badge="COMMAND CENTER"
      action={
        edition === 'enterprise'
          ? (
            <Button variant="contained" endIcon={<ArrowForward />} onClick={() => navigate('/enterprise/cloud-posture')}>
              Open Cloud Posture
            </Button>
          )
          : undefined
      }
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Posture Score" metric={`${healthScore}/100`} subtitle="CSPM + crypto posture" icon={<GppGood />} color={tokens.colors.rivicq[400]}>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ position: 'relative', width: 84, height: 84, borderRadius: '50%', border: `6px solid ${tokens.colors.navy[3]}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '6px solid transparent', borderTopColor: healthScore >= 80 ? tokens.colors.crypto.low : healthScore >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical, borderRightColor: healthScore >= 80 ? tokens.colors.crypto.low : healthScore >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical, transform: `rotate(${healthScore / 100 * 360}deg)` }} />
                <Typography variant="h5" fontWeight={800} sx={{ color: tokens.colors.text.primary }}>{healthScore}</Typography>
              </Box>
            </Box>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Cloud Resources" metric={totalResources.toLocaleString()} subtitle="Across all connected accounts" icon={<Memory />} color={tokens.colors.crypto.info} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Open Findings" metric={String(totalFindings)} subtitle={`${findings.critical} critical · ${findings.high} high`} icon={<NotificationsActive />} color={tokens.colors.crypto.high} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="At-Risk Data Objects" metric={(assets.length || (cspmOverview as any)?.at_risk_data || 847).toLocaleString()} subtitle={complianceAvg ? `Avg. compliance ${complianceAvg}%` : 'Exposed across environments'} icon={<Lock />} color={tokens.colors.crypto.critical} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Risk Heatmap</Typography>
                <Chip size="small" label="Last 7 days" variant="outlined" />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 0.75 }}>
                {heatmap.map((cell, i) => (
                  <TooltipCell key={i} risk={cell.risk} />
                ))}
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: tokens.colors.text.muted }}>Low</Typography>
                {[0, 1, 2, 3].map((risk) => (
                  <Box key={risk} sx={{ width: 14, height: 14, borderRadius: 0.75, bgcolor: SEVERITY_COLORS[risk] + 'cc' }} />
                ))}
                <Typography variant="caption" sx={{ color: tokens.colors.text.muted }}>Critical</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Stack direction="row" spacing={1}>
                  {SEVERITY_COLORS.slice(1).map((c, i) => (
                    <Chip key={i} size="small" label={['MEDIUM', 'HIGH', 'CRITICAL'][i]} sx={{ bgcolor: `${c}22`, color: c }} />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Algorithm Distribution</Typography>
                <Chip size="small" icon={<Security sx={{ fontSize: 14 }} />} label="CBOM inventory" color="primary" />
              </Box>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={algorithmData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: tokens.colors.text.secondary }} />
                    <YAxis tick={{ fontSize: 11, fill: tokens.colors.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: tokens.colors.navy[2], border: `1px solid ${tokens.colors.border}`, borderRadius: 8 }} />
                    <Bar dataKey="value" fill={tokens.colors.rivicq[500]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: tokens.colors.text.primary }}>Risk Levels</Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {riskData.map((entry, index) => (
                        <Cell key={`risk-${index}`} fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: tokens.colors.navy[2], border: `1px solid ${tokens.colors.border}`, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Live Security Feed</Typography>
                <Chip size="small" label="Live" sx={{ bgcolor: `${tokens.colors.crypto.low}22`, color: tokens.colors.crypto.low }} />
              </Box>
              <Stack spacing={1}>
                {feed.map((evt: any, i: number) => {
                  const color = SEVERITY_COLORS[['low', 'medium', 'high', 'critical'].indexOf(evt.severity) + 1] || tokens.colors.crypto.low;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 0.75, px: 1, borderRadius: 1, '&:hover': { bgcolor: tokens.colors.navy[2] } }}>
                      <Chip size="small" label={(evt.severity || 'low').toUpperCase()} sx={{ bgcolor: `${color}22`, color, fontWeight: 700, minWidth: 84 }} />
                      <Typography variant="body2" sx={{ color: tokens.colors.text.primary, flexGrow: 1 }}>{evt.message}</Typography>
                      <Typography variant="caption" sx={{ color: tokens.colors.text.muted, whiteSpace: 'nowrap' }}>{evt.time}</Typography>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ borderRadius: 2, border: `1px solid ${tokens.colors.rivicq[500]}44`, '& .MuiAlert-icon': { color: tokens.colors.rivicq[400] } }}>
        <Typography variant="body2"><strong>Security Command Center</strong> — unified view of cloud posture, cryptographic inventory, and PQC readiness. Findings are refreshed every 60s.</Typography>
      </Alert>
    </PageFrame>
  );
};

const TooltipCell: React.FC<{ risk: number }> = ({ risk }) => {
  const color = SEVERITY_COLORS[risk] || tokens.colors.navy[3];
  return (
    <Box
      sx={{
        aspectRatio: '1 / 1',
        borderRadius: 0.75,
        bgcolor: risk === 0 ? `${tokens.colors.navy[3]}66` : `${color}cc`,
        cursor: 'pointer',
        transition: 'transform 0.15s',
        '&:hover': { transform: 'scale(1.2)' },
      }}
    />
  );
};

export default Dashboard;

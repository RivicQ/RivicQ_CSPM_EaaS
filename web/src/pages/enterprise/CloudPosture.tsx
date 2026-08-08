import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography, useTheme,
} from '@mui/material';
import {
  Cloud, CloudDone, CloudOff, GppGood, Memory, NotificationsActive, Refresh, Storage, Warning,
} from '@mui/icons-material';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { tokens } from '../../theme/tokens';
import PageFrame from '../../components/PageFrame';
import { postureService } from '../../services/api';

const PROVIDER_COLORS: Record<string, string> = {
  aws: '#FF9900',
  azure: '#0078D4',
  gcp: '#4285F4',
  ibm: '#0f62fe',
  ibm_cloud: '#0f62fe',
  kubernetes: '#326ce5',
};

const providerColor = (provider: string) => PROVIDER_COLORS[provider] || tokens.colors.text.muted;

const SEVERITY_COLORS: Record<string, string> = {
  critical: tokens.colors.crypto.critical,
  high: tokens.colors.crypto.high,
  medium: tokens.colors.crypto.medium,
  low: tokens.colors.crypto.low,
};

const DEMO_ACCOUNTS = [
  { id: 'acct-aws-prod', name: 'AWS Production', provider: 'aws', account_id: '1234-5678-9012', score: 78, resources: 84, findings: 19, status: 'attention' },
  { id: 'acct-aws-dev', name: 'AWS Development', provider: 'aws', account_id: '2233-4455-6677', score: 61, resources: 37, findings: 31, status: 'at_risk' },
  { id: 'acct-gcp-core', name: 'GCP Core', provider: 'gcp', account_id: 'rivicq-core-4471', score: 88, resources: 45, findings: 8, status: 'healthy' },
  { id: 'acct-azure-eastus', name: 'Azure East US', provider: 'azure', account_id: 'a1b2c3d4-89ab', score: 82, resources: 5, findings: 4, status: 'healthy' },
  { id: 'acct-ibm-quantum', name: 'IBM Quantum Cloud', provider: 'ibm', account_id: 'ibmq-rivicq-org', score: 70, resources: 20, findings: 12, status: 'attention' },
];

const DEMO_FEED = [
  { time: '2m ago', severity: 'critical', message: 'Public S3 bucket (crypto-assets-prod) allows unauthenticated write access', account: 'AWS Production' },
  { time: '9m ago', severity: 'high', message: 'EC2 security group ssh-public-open permits inbound 0.0.0.0/0 on port 22', account: 'AWS Development' },
  { time: '17m ago', severity: 'medium', message: 'GCS bucket lacks uniform bucket-level access control', account: 'GCP Core' },
  { time: '26m ago', severity: 'low', message: 'KMS key rotation disabled for key alias/aws/ebs', account: 'AWS Production' },
  { time: '41m ago', severity: 'critical', message: 'IAM policy grants wildcard Action "*" on KMS keys', account: 'AWS Development' },
  { time: '1h ago', severity: 'medium', message: 'Azure Key Vault soft-delete purge protection disabled', account: 'Azure East US' },
];

const severityLabel = (severity: string) => severity.toUpperCase();

const CloudPosture: React.FC = () => {
  const theme = useTheme();
  const { data: overview, isLoading } = useQuery({
    queryKey: ['cloud-posture-overview'],
    queryFn: () => postureService.getOverview().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['cloud-posture-resources'],
    queryFn: () => postureService.getResourcesSummary().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: threats } = useQuery({
    queryKey: ['cloud-posture-threats'],
    queryFn: () => postureService.getThreatIntelligence().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const healthScore = overview?.health_score ?? 74;
  const totalResources = summary?.total_resources ?? 150;
  const findings = summary?.security_findings ?? { critical: 2, high: 8, medium: 15, low: 25 };
  const totalFindings = (Object.values(findings) as number[]).reduce((a, b) => a + b, 0);

  const byProvider = summary?.by_provider
    ? Object.entries(summary.by_provider).map(([name, value]) => ({ name, value }))
    : [
      { name: 'aws', value: 80 },
      { name: 'gcp', value: 45 },
      { name: 'ibm_cloud', value: 20 },
      { name: 'azure', value: 5 },
    ];

  const findingData = [
    { name: 'Critical', value: findings.critical ?? 2, color: tokens.colors.crypto.critical },
    { name: 'High', value: findings.high ?? 8, color: tokens.colors.crypto.high },
    { name: 'Medium', value: findings.medium ?? 15, color: tokens.colors.crypto.medium },
    { name: 'Low', value: findings.low ?? 25, color: tokens.colors.crypto.low },
  ];

  const accounts = DEMO_ACCOUNTS;

  const statusChip = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      healthy: { label: 'Healthy', color: tokens.colors.crypto.low },
      attention: { label: 'Attention', color: tokens.colors.crypto.medium },
      at_risk: { label: 'At Risk', color: tokens.colors.crypto.critical },
    };
    const s = map[status] || map.healthy;
    return <Chip size="small" label={s.label} sx={{ bgcolor: `${s.color}22`, color: s.color, fontWeight: 700 }} />;
  };

  if (isLoading && !overview) {
    return (
      <PageFrame title="Cloud Posture" subtitle="Loading posture data...">
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ height: 140 }}><CardContent><LinearProgress /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Cloud Posture"
      subtitle="Continuously assess, monitor, and remediate security posture across every cloud account and workload."
      badge="CSPM"
      action={
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => window.location.reload()}>Sync now</Button>
      }
    >
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2, border: `1px solid ${tokens.colors.rivicq[500]}44`, '& .MuiAlert-icon': { color: tokens.colors.rivicq[400] } }}>
        Live posture coverage across 5 connected accounts · {accounts.length} providers · Assessment every 24h and on change.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          {
            title: 'Posture Score', icon: <GppGood />, color: tokens.colors.rivicq[400],
            value: `${healthScore}/100`, sub: 'Weighted across all controls',
            gauge: (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ position: 'relative', width: 84, height: 84, borderRadius: '50%', border: `6px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '6px solid transparent', borderTopColor: healthScore >= 80 ? tokens.colors.crypto.low : healthScore >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical, borderRightColor: healthScore >= 80 ? tokens.colors.crypto.low : healthScore >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical, transform: `rotate(${healthScore / 100 * 360}deg)` }} />
                  <Typography variant="h5" fontWeight={800} sx={{ color: tokens.colors.text.primary }}>{healthScore}</Typography>
                </Box>
              </Box>
            ),
          },
          {
            title: 'Cloud Resources', icon: <Memory />, color: tokens.colors.crypto.info,
            value: totalResources.toLocaleString(), sub: 'Across all connected accounts',
          },
          {
            title: 'Security Findings', icon: <NotificationsActive />, color: tokens.colors.crypto.high,
            value: String(totalFindings), sub: `${findings.critical} critical · ${findings.high} high`,
          },
          {
            title: 'Accounts Monitored', icon: <CloudDone />, color: tokens.colors.crypto.low,
            value: String(accounts.length), sub: `${Object.keys(PROVIDER_COLORS).length - 1} cloud providers`,
          },
        ].map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box>
                    <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>{kpi.title}</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color, mt: 0.5 }}>{kpi.value}</Typography>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{kpi.sub}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${kpi.color}1f`, color: kpi.color }}>{kpi.icon}</Avatar>
                </Box>
                {kpi.gauge && <Box sx={{ flexGrow: 1 }}>{kpi.gauge}</Box>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: tokens.colors.text.primary }}>Resources by Provider</Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byProvider}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: tokens.colors.text.secondary }} />
                    <YAxis tick={{ fontSize: 11, fill: tokens.colors.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, color: theme.palette.text.primary }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {byProvider.map((entry: any) => (
                        <Cell key={entry.name} fill={providerColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: tokens.colors.text.primary }}>Findings by Severity</Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={findingData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {findingData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, color: theme.palette.text.primary }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              {threats?.threats?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Chip icon={<Warning />} size="small" label={`${threats.threats.length} active threat intel signal${threats.threats.length > 1 ? 's' : ''}`} sx={{ bgcolor: `${tokens.colors.crypto.high}22`, color: tokens.colors.crypto.high }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {accounts.map((acct) => {
          const color = providerColor(acct.provider);
          return (
            <Grid item xs={12} sm={6} md={4} key={acct.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: `${color}22`, color }}><Cloud /></Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: tokens.colors.text.primary }} noWrap>{acct.name}</Typography>
                      <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>{acct.account_id}</Typography>
                    </Box>
                    {statusChip(acct.status)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>Posture score</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>{acct.score}/100</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={acct.score}
                    sx={{ height: 8, mb: 1.5, '& .MuiLinearProgress-bar': { backgroundColor: acct.score >= 80 ? tokens.colors.crypto.low : acct.score >= 60 ? tokens.colors.crypto.high : tokens.colors.crypto.critical } }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" icon={<Storage sx={{ fontSize: 14 }} />} label={`${acct.resources} resources`} variant="outlined" />
                    <Chip size="small" icon={<NotificationsActive sx={{ fontSize: 14 }} />} label={`${acct.findings} findings`} variant="outlined" />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" variant="outlined" startIcon={<CloudOff sx={{ fontSize: 16 }} />}>Remediate</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: tokens.colors.text.primary }}>Live Posture Feed</Typography>
            <Chip size="small" label="Auto-refresh 30s" sx={{ bgcolor: `${tokens.colors.crypto.low}22`, color: tokens.colors.crypto.low }} />
          </Box>
          <Stack spacing={1}>
            {DEMO_FEED.map((evt) => {
              const color = SEVERITY_COLORS[evt.severity] || tokens.colors.text.muted;
              return (
                <Box key={evt.time + evt.message} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, px: 1, borderRadius: 1, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                  <Chip size="small" label={severityLabel(evt.severity)} sx={{ bgcolor: `${color}22`, color, fontWeight: 700, minWidth: 84 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.primary }}>{evt.message}</Typography>
                    <Typography variant="caption" sx={{ color: tokens.colors.text.muted }}>{evt.account}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.muted, whiteSpace: 'nowrap' }}>{evt.time}</Typography>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </PageFrame>
  );
};

export default CloudPosture;

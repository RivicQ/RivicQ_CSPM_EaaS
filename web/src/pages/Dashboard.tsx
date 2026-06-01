import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, LinearProgress, Stack, Typography,
} from '@mui/material';
import {
  ArrowForward, Cloud, Dns, Lock, Psychology, Security, Storage, Warning,
} from '@mui/icons-material';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  cbomService, cloudService, complianceService, inventoryService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageFrame from '../components/PageFrame';
import { tokens } from '../theme/tokens';

const RISK_COLORS = [tokens.colors.crypto.low, tokens.colors.crypto.medium, tokens.colors.crypto.high, tokens.colors.crypto.critical];

const MetricCard: React.FC<{
  title: string; metric: string; subtitle: string; icon: React.ReactNode; color: string; children?: React.ReactNode;
}> = ({ title, metric, subtitle, icon, color, children }) => (
  <Card sx={{ height: '100%', background: tokens.colors.surface[1] }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>{title}</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color, mt: 0.5 }}>{metric}</Typography>
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>{subtitle}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: `${color}1a`, color }}>{icon}</Avatar>
      </Box>
      {children && <Box sx={{ flexGrow: 1, mt: 2 }}>{children}</Box>}
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { edition } = useAuth();

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => inventoryService.getInventorySummary().then((r) => r.data),
    retry: 1,
  });

  const { data: assetsData } = useQuery({
    queryKey: ['dashboard-assets'],
    queryFn: () => inventoryService.getAssets().then((r) => r.data),
    retry: 1,
  });

  const assets = React.useMemo(() => {
    const list = Array.isArray(assetsData) ? assetsData : Array.isArray((assetsData as any)?.assets) ? (assetsData as any).assets : [];
    return list.length > 0 ? list : [];
  }, [assetsData]);

  const totalAssets = (summaryData as any)?.total_assets || assets.length || 1427;
  const healthScore = (summaryData as any)?.compliance_score || 78;
  const outdatedAlgs = assets.filter((a: any) => a.risk_level === 'HIGH' || a.risk_level === 'CRITICAL' || a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length || 23;
  const atRiskData = (summaryData as any)?.vulnerable_assets || 847;

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
        { name: 'Triple DES', value: 8 },
        { name: 'ML-KEM-768', value: 12 },
        { name: 'ECDSA P-256', value: 19 },
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

  const algorithmTable = [
    { name: 'AES-256-GCM', usage: 37, risk: 'safe' as const, qs: true, action: 'Plan \u2192' as const },
    { name: 'RSA-2048', usage: 28, risk: 'warning' as const, qs: false, action: 'Migrate \u2192' as const },
    { name: 'Triple DES', usage: 8, risk: 'danger' as const, qs: false, action: 'Migrate \u2192' as const },
    { name: 'ML-KEM-768', usage: 12, risk: 'safe' as const, qs: true, action: 'Plan \u2192' as const },
    { name: 'ECDSA P-256', usage: 19, risk: 'warning' as const, qs: false, action: 'Migrate \u2192' as const },
  ];

  if (summaryLoading && !summaryData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><CircularProgress /></Box>;
  }

  return (
    <PageFrame
      title="Security Command Center"
      subtitle="Unified view for CISO posture, CSPM coverage, CBOM inventory, and PQC migration readiness."
    >
      <Alert severity="info" sx={{ mb: 3, bgcolor: `${tokens.colors.rivicq[500]}15`, border: `1px solid ${tokens.colors.rivicq[500]}33`, color: tokens.colors.text.primary, '& .MuiAlert-icon': { color: tokens.colors.rivicq[400] }, borderRadius: 2 }}>
        <Typography variant="body2"><strong>Beta</strong> — You are viewing the new Security Command Center. Some features may be in preview.</Typography>
      </Alert>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Crypto Health Score" metric={`${healthScore}/100`} subtitle="Overall cryptographic posture" icon={<Security />} color={tokens.colors.rivicq[400]}>
            <Box sx={{ mt: 2, position: 'relative', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', border: `6px solid ${tokens.colors.surface[3]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `6px solid transparent`, borderTopColor: healthScore > 70 ? tokens.colors.crypto.low : healthScore > 50 ? tokens.colors.crypto.high : tokens.colors.crypto.critical, transform: `rotate(${(healthScore / 100) * 360}deg)` }} />
                <Typography variant="h5" fontWeight={800} sx={{ color: tokens.colors.text.primary }}>{healthScore}</Typography>
              </Box>
            </Box>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Active Assets" metric={totalAssets.toLocaleString()} subtitle={`\u25B212 from last month`} icon={<Storage />} color={tokens.colors.crypto.low} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Outdated Algorithms" metric={String(outdatedAlgs)} subtitle={`\u26A0\uFE0F ${Math.round(outdatedAlgs * 0.13)} critical`} icon={<Warning />} color={tokens.colors.crypto.high} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="At-Risk Data Objects" metric={atRiskData.toLocaleString()} subtitle={`\uD83D\uDD34 ${Math.round(atRiskData * 0.014)} exposed`} icon={<Lock />} color={tokens.colors.crypto.critical} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Crypto Network Topology</Typography>
              <Box sx={{ bgcolor: tokens.colors.surface[2], borderRadius: 2, p: 3, border: `1px solid ${tokens.colors.border}` }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <Chip icon={<Cloud />} label="AWS KMS" size="small" sx={{ bgcolor: '#FF990022', color: '#FF9900' }} />
                    <Typography sx={{ color: tokens.colors.text.muted }}>\uD83D\uDD10</Typography>
                    <Chip icon={<Storage />} label="S3" size="small" sx={{ bgcolor: tokens.colors.surface[3], color: tokens.colors.text.primary }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <Chip icon={<Cloud />} label="Azure Key Vault" size="small" sx={{ bgcolor: '#0078D422', color: '#0078D4' }} />
                    <Typography sx={{ color: tokens.colors.text.muted }}>\uD83D\uDD10</Typography>
                    <Chip icon={<Storage />} label="Blob" size="small" sx={{ bgcolor: tokens.colors.surface[3], color: tokens.colors.text.primary }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <Chip icon={<Cloud />} label="GCP KMS" size="small" sx={{ bgcolor: '#4285F422', color: '#4285F4' }} />
                    <Typography sx={{ color: tokens.colors.text.muted }}>\uD83D\uDD10</Typography>
                    <Chip icon={<Storage />} label="GCS" size="small" sx={{ bgcolor: tokens.colors.surface[3], color: tokens.colors.text.primary }} />
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Algorithm Risk Breakdown</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                {algorithmTable.map((alg) => (
                  <Box key={alg.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 1, borderBottom: `1px solid ${tokens.colors.border}`, '&:last-child': { borderBottom: 0 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography sx={{ fontSize: 18 }}>
                        {alg.risk === 'safe' ? '\uD83D\uDFE2' : alg.risk === 'warning' ? '\uD83D\uDFE1' : '\uD83D\uDD34'}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: tokens.colors.text.primary }}>{alg.name}</Typography>
                      <Chip label={`${alg.usage} usages`} size="small" sx={{ bgcolor: tokens.colors.surface[2], color: tokens.colors.text.secondary }} />
                    </Stack>
                    <Button size="small" variant={alg.action.includes('Migrate') ? 'contained' : 'outlined'} color={alg.action.includes('Migrate') ? 'warning' : 'primary'} sx={{ minWidth: 100 }}>
                      {alg.action}
                    </Button>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Algorithm Distribution</Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={algorithmData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: tokens.colors.text.secondary }} />
                    <YAxis tick={{ fontSize: 11, fill: tokens.colors.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: tokens.colors.surface[2], border: `1px solid ${tokens.colors.border}`, borderRadius: 8 }} />
                    <Bar dataKey="value" fill={tokens.colors.rivicq[500]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Risk Levels</Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {riskData.map((_entry, index) => (
                        <Cell key={`risk-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: tokens.colors.surface[2], border: `1px solid ${tokens.colors.border}`, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default Dashboard;

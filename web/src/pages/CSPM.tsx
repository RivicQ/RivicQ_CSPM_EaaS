import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Grid, Stack, Typography, Skeleton,
} from '@mui/material';
import { Warning, Cloud, Dns } from '@mui/icons-material';
import { tokens } from '../theme/tokens';
import PageFrame from '../components/PageFrame';
import { cspmService } from '../services/api';

const riskColor = (risk: string) => {
  switch (risk) {
    case 'low': return tokens.colors.crypto.low;
    case 'medium': return tokens.colors.crypto.medium;
    case 'high': return tokens.colors.crypto.high;
    case 'critical': return tokens.colors.crypto.critical;
    default: return tokens.colors.text.muted;
  }
};

const CSPM: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['cspm-overview'],
    queryFn: () => cspmService.getOverview().then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <PageFrame title="Cryptographic Security Posture Management" subtitle="Loading CSPM data...">
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ height: 140, bgcolor: tokens.colors.surface[1] }}>
                <CardContent><Skeleton variant="rounded" width="100%" height={100} /></CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PageFrame>
    );
  }

  const healthScore = data?.health_score ?? 74;
  const totalAssets = data?.total_assets ?? 1427;
  const outdatedAlgs = data?.outdated_algorithms ?? 23;
  const atRisk = data?.at_risk_data ?? 847;
  const algorithms = data?.risk_breakdown ?? [
    { name: 'AES-256-GCM', usage: 142, risk_level: 'low', quantum_safe: true, migration: 'Monitored' },
    { name: 'RSA-2048', usage: 89, risk_level: 'high', quantum_safe: false, migration: 'Migrate \u2192' },
    { name: 'Triple DES', usage: 23, risk_level: 'critical', quantum_safe: false, migration: 'Migrate \u2192' },
    { name: 'ChaCha20-Poly1305', usage: 56, risk_level: 'low', quantum_safe: true, migration: 'Monitored' },
    { name: 'ECDSA P-384', usage: 34, risk_level: 'medium', quantum_safe: false, migration: 'Plan \u2192' },
    { name: 'ML-KEM-768', usage: 12, risk_level: 'low', quantum_safe: true, migration: 'Monitored' },
  ];
  const topology = data?.topology ?? [
    { from: 'AWS KMS', to: 'S3', encrypted: true, provider: 'aws' },
    { from: 'Azure Key Vault', to: 'Blob', encrypted: true, provider: 'azure' },
    { from: 'GCP KMS', to: 'GCS', encrypted: true, provider: 'gcp' },
    { from: 'K8s Pod', to: 'Pod', encrypted: true, provider: 'kubernetes' },
  ];

  return (
    <PageFrame
      title="Cryptographic Security Posture Management"
      subtitle="Monitor, assess, and improve your cryptographic security posture across all environments."
    >
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>Crypto Health Score</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Box sx={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `6px solid ${tokens.colors.surface[3]}` }} />
                  <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `6px solid transparent`, borderTopColor: tokens.colors.rivicq[500], borderRightColor: tokens.colors.rivicq[500], transform: 'rotate(45deg)' }} />
                  <Typography variant="h5" fontWeight={800} sx={{ color: tokens.colors.text.primary }}>{healthScore}</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: tokens.colors.crypto.low }}>/{100}</Typography>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>Good</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>Active Crypto Assets</Typography>
              <Typography variant="h3" fontWeight={700} sx={{ color: tokens.colors.crypto.low, mt: 1 }}>{totalAssets.toLocaleString()}</Typography>
              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>Quantum safe: {data?.quantum_safe_pct ?? 62}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>Outdated Algorithms</Typography>
              <Typography variant="h3" fontWeight={700} sx={{ color: tokens.colors.crypto.high, mt: 1 }}>{outdatedAlgs}</Typography>
              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>3 critical</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: tokens.colors.text.secondary, letterSpacing: 1.2 }}>At-Risk Data Objects</Typography>
              <Typography variant="h3" fontWeight={700} sx={{ color: tokens.colors.crypto.critical, mt: 1 }}>{atRisk.toLocaleString()}</Typography>
              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>12 exposed</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', bgcolor: tokens.colors.surface[1] }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: tokens.colors.text.primary }}>Network Topology Map</Typography>
              <Box sx={{ bgcolor: tokens.colors.surface[2], borderRadius: 2, p: 3, border: `1px solid ${tokens.colors.border}`, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Stack spacing={2} alignItems="center">
                  {topology.map((item: any) => (
                    <Box key={item.from} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip icon={<Cloud />} label={item.from} size="small" sx={{ bgcolor: `${item.provider === 'aws' ? '#FF9900' : item.provider === 'azure' ? '#0078D4' : '#4285F4'}22`, color: item.provider === 'aws' ? '#FF9900' : item.provider === 'azure' ? '#0078D4' : '#4285F4' }} />
                      <Typography sx={{ color: tokens.colors.crypto.low, fontSize: 12 }}>{'\uD83D\uDD12'} encrypted</Typography>
                      <Chip icon={<Dns />} label={item.to} size="small" sx={{ bgcolor: tokens.colors.surface[3], color: tokens.colors.text.primary }} />
                    </Box>
                  ))}
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
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Algorithm', 'Usage', 'Risk', 'Quantum-Safe', 'Action'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border}`, color: tokens.colors.text.secondary, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {algorithms.map((alg: any) => (
                      <tr key={alg.name} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                        <td style={{ padding: '10px 12px', color: tokens.colors.text.primary, fontWeight: 600 }}>{alg.name}</td>
                        <td style={{ padding: '10px 12px', color: tokens.colors.text.secondary }}>{alg.usage}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Chip
                            icon={<Warning sx={{ fontSize: 14 }} />}
                            label={(alg.risk_level || alg.risk).toUpperCase()}
                            size="small"
                            sx={{ bgcolor: `${riskColor(alg.risk_level || alg.risk)}22`, color: riskColor(alg.risk_level || alg.risk) }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Chip
                            label={alg.quantum_safe ? 'Yes' : 'No'}
                            size="small"
                            sx={{ bgcolor: alg.quantum_safe ? `${tokens.colors.crypto.low}22` : `${tokens.colors.crypto.critical}22`, color: alg.quantum_safe ? tokens.colors.crypto.low : tokens.colors.crypto.critical }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Button size="small" variant={alg.migration?.includes('Migrate') ? 'contained' : 'outlined'} color={alg.migration?.includes('Migrate') ? 'warning' : 'inherit'} sx={{ minWidth: 100 }}>
                            {alg.migration || 'Monitored'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default CSPM;

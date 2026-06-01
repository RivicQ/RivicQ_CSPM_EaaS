import React from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography, LinearProgress } from '@mui/material';
import { Security, Warning, Cloud, Storage, Dns, ArrowForward, Psychology } from '@mui/icons-material';
import { tokens } from '../theme/tokens';
import PageFrame from '../components/PageFrame';

const algorithms = [
  { name: 'AES-256-GCM', usage: 142, risk: 'low' as const, qs: true, action: 'Monitored' },
  { name: 'RSA-2048', usage: 89, risk: 'high' as const, qs: false, action: 'Migrate \u2192' },
  { name: 'Triple DES', usage: 23, risk: 'critical' as const, qs: false, action: 'Migrate \u2192' },
  { name: 'ChaCha20-Poly1305', usage: 56, risk: 'low' as const, qs: true, action: 'Monitored' },
  { name: 'ECDSA P-384', usage: 34, risk: 'medium' as const, qs: false, action: 'Plan \u2192' },
  { name: 'ML-KEM-768', usage: 12, risk: 'low' as const, qs: true, action: 'Monitored' },
];

const riskColor = (risk: string) => {
  switch (risk) {
    case 'low': return tokens.colors.crypto.low;
    case 'medium': return tokens.colors.crypto.medium;
    case 'high': return tokens.colors.crypto.high;
    case 'critical': return tokens.colors.crypto.critical;
    default: return tokens.colors.text.muted;
  }
};

const riskIcon = (risk: string) => {
  if (risk === 'low') return '\uD83D\uDFE2';
  if (risk === 'medium') return '\uD83D\uDFE1';
  if (risk === 'high') return '\uD83D\uDFE0';
  return '\uD83D\uDD34';
};

const CSPM: React.FC = () => {
  const healthScore = 74;
  const totalAssets = 1427;
  const outdatedAlgs = 23;
  const atRisk = 847;

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
              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>\u25B2 12% MoM</Typography>
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
                  {[
                    { from: 'AWS KMS', to: 'S3', color: '#FF9900' },
                    { from: 'Azure Key Vault', to: 'Blob', color: '#0078D4' },
                    { from: 'GCP KMS', to: 'GCS', color: '#4285F4' },
                    { from: 'K8s Pod', to: 'Pod', color: '#326CE5' },
                  ].map((item) => (
                    <Box key={item.from} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip icon={<Cloud />} label={item.from} size="small" sx={{ bgcolor: `${item.color}22`, color: item.color }} />
                      <Typography sx={{ color: tokens.colors.crypto.low, fontSize: 12 }}>\uD83D\uDD12 encrypted</Typography>
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
                    {algorithms.map((alg) => (
                      <tr key={alg.name} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                        <td style={{ padding: '10px 12px', color: tokens.colors.text.primary, fontWeight: 600 }}>{alg.name}</td>
                        <td style={{ padding: '10px 12px', color: tokens.colors.text.secondary }}>{alg.usage}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <Chip
                            icon={<Warning sx={{ fontSize: 14 }} />}
                            label={alg.risk.toUpperCase()}
                            size="small"
                            sx={{ bgcolor: `${riskColor(alg.risk)}22`, color: riskColor(alg.risk) }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Chip
                            label={alg.qs ? 'Yes' : 'No'}
                            size="small"
                            sx={{ bgcolor: alg.qs ? `${tokens.colors.crypto.low}22` : `${tokens.colors.crypto.critical}22`, color: alg.qs ? tokens.colors.crypto.low : tokens.colors.crypto.critical }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Button size="small" variant={alg.action.includes('Migrate') ? 'contained' : 'outlined'} color={alg.action.includes('Migrate') ? 'warning' : 'inherit'} sx={{ minWidth: 100 }}>
                            {alg.action}
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

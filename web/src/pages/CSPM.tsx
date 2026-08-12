import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, Grid, Skeleton, Stack, Typography,
} from '@mui/material';
import { Warning, Cloud, Dns, Security, Assessment, Storage } from '@mui/icons-material';
import { providerColor } from '../theme/chartTheme';
import { tokens } from '../theme/tokens';
import PageFrame from '../components/PageFrame';
import StatCard from '../components/dashboard/StatCard';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import PostureRing from '../components/dashboard/PostureRing';
import SeverityBadge from '../components/dashboard/SeverityBadge';
import { cspmService } from '../services/api';

const CSPM: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['cspm-overview'],
    queryFn: () => cspmService.getOverview().then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <PageFrame eyebrow="Posture" title="Cryptographic Security Posture Management" subtitle="Loading CSPM data...">
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
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
    { name: 'RSA-2048', usage: 89, risk_level: 'high', quantum_safe: false, migration: 'Migrate →' },
    { name: 'Triple DES', usage: 23, risk_level: 'critical', quantum_safe: false, migration: 'Migrate →' },
    { name: 'ChaCha20-Poly1305', usage: 56, risk_level: 'low', quantum_safe: true, migration: 'Monitored' },
    { name: 'ECDSA P-384', usage: 34, risk_level: 'medium', quantum_safe: false, migration: 'Plan →' },
    { name: 'ML-KEM-768', usage: 12, risk_level: 'low', quantum_safe: true, migration: 'Monitored' },
  ];
  const topology = data?.topology ?? [
    { from: 'AWS KMS', to: 'S3', encrypted: true, provider: 'aws' },
    { from: 'Azure Key Vault', to: 'Blob', encrypted: true, provider: 'azure' },
    { from: 'GCP KMS', to: 'GCS', encrypted: true, provider: 'gcp' },
    { from: 'K8s Pod', to: 'Pod', encrypted: true, provider: 'kubernetes' },
  ];

  const providerChipColor = (provider: string) => providerColor(provider);

  return (
    <PageFrame
      eyebrow="Posture"
      title="Cryptographic Security Posture Management"
      subtitle="Monitor, assess, and improve your cryptographic security posture across all environments."
      badge={`Score ${healthScore}`}
    >
      <Grid container spacing={2.5} sx={{ mb: 0.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Health Score"
            value={`${healthScore}/100`}
            icon={<Security sx={{ fontSize: 20 }} />}
            accent={tokens.colors.crypto.low}
            delay={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Active Crypto Assets"
            value={totalAssets.toLocaleString()}
            icon={<Storage sx={{ fontSize: 20 }} />}
            accent={tokens.colors.rivicq[500]}
            trend={{ value: `${data?.quantum_safe_pct ?? 62}% quantum safe`, positive: true }}
            delay={1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Outdated Algorithms"
            value={outdatedAlgs}
            icon={<Assessment sx={{ fontSize: 20 }} />}
            accent={tokens.colors.crypto.high}
            trend={{ value: '3 critical', positive: false }}
            delay={2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="At-Risk Data Objects"
            value={atRisk.toLocaleString()}
            icon={<Warning sx={{ fontSize: 20 }} />}
            accent={tokens.colors.crypto.critical}
            trend={{ value: '12 exposed', positive: false }}
            delay={3}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <DashboardPanel title="Network Topology Map" delay={0}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <PostureRing score={healthScore} size={100} />
            </Box>
            <Stack spacing={2} alignItems="center">
              {topology.map((item: any) => (
                <Box key={item.from} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Chip
                    icon={<Cloud sx={{ fontSize: 16 }} />}
                    label={item.from}
                    size="small"
                    sx={{
                      bgcolor: `${providerChipColor(item.provider)}18`,
                      color: providerChipColor(item.provider),
                      fontWeight: 600,
                    }}
                  />
                  <Typography sx={{ color: tokens.colors.crypto.low, fontSize: 12, fontWeight: 600 }}>
                    encrypted
                  </Typography>
                  <Chip
                    icon={<Dns sx={{ fontSize: 16 }} />}
                    label={item.to}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              ))}
            </Stack>
          </DashboardPanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <DashboardPanel title="Algorithm Risk Breakdown" delay={1}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Algorithm', 'Usage', 'Risk', 'Quantum-Safe', 'Action'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderBottom: `1px solid ${tokens.colors.border}`,
                          color: tokens.colors.text.secondary,
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {algorithms.map((alg: any) => (
                    <tr key={alg.name} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{alg.name}</td>
                      <td style={{ padding: '12px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.mono }}>
                        {alg.usage}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <SeverityBadge severity={alg.risk_level || alg.risk} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Chip
                          label={alg.quantum_safe ? 'Yes' : 'No'}
                          size="small"
                          sx={{
                            bgcolor: alg.quantum_safe ? `${tokens.colors.crypto.low}18` : `${tokens.colors.crypto.critical}18`,
                            color: alg.quantum_safe ? tokens.colors.crypto.low : tokens.colors.crypto.critical,
                            fontWeight: 600,
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Button
                          size="small"
                          variant={alg.migration?.includes('Migrate') ? 'contained' : 'outlined'}
                          color={alg.migration?.includes('Migrate') ? 'warning' : 'inherit'}
                          sx={{ minWidth: 100 }}
                        >
                          {alg.migration || 'Monitored'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </DashboardPanel>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default CSPM;

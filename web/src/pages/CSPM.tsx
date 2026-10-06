import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Warning, Cloud, Dns, Security, Assessment, Storage } from '@mui/icons-material';
import { providerColor } from '../theme/chartTheme';
import { tokens } from '../theme/tokens';
import PageFrame from '../components/PageFrame';
import OpsHeroVisual from '../components/ops/OpsHeroVisual';
import StatCard from '../components/dashboard/StatCard';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import PostureRing from '../components/dashboard/PostureRing';
import SeverityBadge from '../components/dashboard/SeverityBadge';
import { EmptyState } from '../components/ui';
import ProvenanceChip from '../components/dashboard/ProvenanceChip';
import { cspmService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { buildDemoCspmOverview, remediationForFinding } from '../demo/demoViews';
import type { SimulatedFinding } from '../data/enterprise/types';

const CSPM: React.FC = () => {
  const navigate = useNavigate();
  const { isDemo } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cspm-overview'],
    queryFn: () => cspmService.getOverview().then((r) => r.data),
    refetchInterval: 30_000,
    retry: 1,
  });
  const [selectedFinding, setSelectedFinding] = React.useState<SimulatedFinding | null>(null);

  const demoFallback = React.useMemo(() => (isDemo ? buildDemoCspmOverview() : null), [isDemo]);
  const view = data ?? demoFallback;

  if (isLoading && !view) {
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

  if (!view) {
    return (
      <PageFrame eyebrow="Posture" title="Cryptographic Security Posture Management" subtitle="Cloud cryptographic posture">
        <EmptyState
          icon={<Cloud />}
          title={isError ? 'Unable to retrieve CSPM results' : 'No CSPM snapshot yet'}
          description="Please retry or check the API connection."
          action={{
            label: 'Retry',
            onClick: () => refetch(),
          }}
        />
      </PageFrame>
    );
  }

  const usingDemo = Boolean(!data && demoFallback);
  const healthScore = view.health_score;
  const totalAssets = view.total_assets;
  const outdatedAlgs = view.outdated_algorithms;
  const atRisk = view.at_risk_data;
  const algorithms = view.risk_breakdown ?? [];
  const topology = view.topology ?? [];
  const findings: SimulatedFinding[] = Array.isArray((view as any).findings) ? (view as any).findings : [];
  const selectedGuide = selectedFinding ? remediationForFinding(selectedFinding) : null;

  const providerChipColor = (provider: string) => providerColor(provider);

  return (
    <PageFrame
      eyebrow="Posture"
      title="Cryptographic Security Posture Management"
      subtitle="Monitor, assess, and improve your cryptographic security posture across all environments."
      badge={healthScore != null ? `Score ${healthScore}` : undefined}
      visual={<OpsHeroVisual variant="findings" empty={findings.length === 0} />}
      action={usingDemo || isDemo ? <ProvenanceChip kind="demo" label="DEMO ENVIRONMENT" /> : undefined}
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
            value={Number(totalAssets || 0).toLocaleString()}
            icon={<Storage sx={{ fontSize: 20 }} />}
            accent={tokens.colors.rivicq[500]}
            trend={view.quantum_safe_pct != null ? { value: `${view.quantum_safe_pct}% quantum safe`, positive: true } : undefined}
            delay={1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Outdated Algorithms"
            value={outdatedAlgs}
            icon={<Assessment sx={{ fontSize: 20 }} />}
            accent={tokens.colors.crypto.high}
            delay={2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="At-Risk Data Objects"
            value={Number(atRisk || 0).toLocaleString()}
            icon={<Warning sx={{ fontSize: 20 }} />}
            accent={tokens.colors.crypto.critical}
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
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Algorithm', 'Usage', 'Risk', 'Quantum-Safe', 'Action'].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {algorithms.map((alg: any) => (
                      <TableRow key={alg.name} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{alg.name}</TableCell>
                        <TableCell sx={{ fontFamily: tokens.typography.mono, color: 'text.secondary' }}>
                          {alg.usage}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={alg.risk_level || alg.risk} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alg.quantum_safe ? 'Yes' : 'No'}
                            size="small"
                            sx={{
                              bgcolor: alg.quantum_safe ? `${tokens.colors.crypto.low}18` : `${tokens.colors.crypto.critical}18`,
                              color: alg.quantum_safe ? tokens.colors.crypto.low : tokens.colors.crypto.critical,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Button
                            size="small"
                            variant={alg.migration?.includes('Migrate') ? 'contained' : 'outlined'}
                            color={alg.migration?.includes('Migrate') ? 'warning' : 'inherit'}
                            sx={{ minWidth: 100 }}
                            onClick={() => {
                              const match = findings.find((f) => (f.title || '').includes(alg.name) || (f.message || '').includes(alg.name));
                              if (match) setSelectedFinding(match);
                              else if (findings[0]) setSelectedFinding(findings[0]);
                            }}
                          >
                            {alg.migration || 'Monitored'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </DashboardPanel>
        </Grid>
      </Grid>

      {findings.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <DashboardPanel title="Misconfigurations & findings" delay={2}>
            <Stack spacing={1.25}>
              {findings.slice(0, 8).map((finding) => (
                <Box
                  key={finding.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedFinding(finding)}
                  sx={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <SeverityBadge severity={finding.severity} />
                    <Typography fontWeight={700}>{finding.title || finding.message}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {finding.assetName} · {finding.provider}/{finding.region}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </DashboardPanel>
        </Box>
      )}

      <Dialog open={Boolean(selectedFinding)} onClose={() => setSelectedFinding(null)} fullWidth maxWidth="sm">
        <DialogTitle>Finding detail</DialogTitle>
        <DialogContent>
          {selectedFinding && selectedGuide && (
            <Stack spacing={1.5} sx={{ mt: 0.5 }}>
              {usingDemo && <ProvenanceChip kind="demo" label="DEMO DATA" />}
              <Typography variant="subtitle2">What happened</Typography>
              <Typography variant="body2">{selectedGuide.what}</Typography>
              <Typography variant="subtitle2">Why it matters</Typography>
              <Typography variant="body2">{selectedGuide.why}</Typography>
              <Typography variant="subtitle2">Severity</Typography>
              <SeverityBadge severity={selectedFinding.severity} />
              <Typography variant="subtitle2">Business impact</Typography>
              <Typography variant="body2">{selectedGuide.business}</Typography>
              <Typography variant="subtitle2">Technical impact</Typography>
              <Typography variant="body2">{selectedGuide.technical}</Typography>
              <Typography variant="subtitle2">Affected asset</Typography>
              <Typography variant="body2">{selectedFinding.assetName}</Typography>
              <Typography variant="subtitle2">Recommended remediation</Typography>
              <Typography variant="body2">{selectedGuide.remediation}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/dashboard')}>Open command center</Button>
          <Button variant="contained" onClick={() => setSelectedFinding(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageFrame>
  );
};

export default CSPM;

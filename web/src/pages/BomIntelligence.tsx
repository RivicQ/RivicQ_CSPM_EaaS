import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import { Lock, Science, Shield, Memory, Badge, Description } from '@mui/icons-material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import BomRibbon from '../components/bom/BomRibbon';
import { bomService } from '../services/api';
import { layersForEdition } from '../data/bomFramework';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';
import { tokens } from '../theme/tokens';

const ICONS: Record<string, React.ReactNode> = {
  cbom: <Shield />,
  qbom: <Science />,
  sbom: <Description />,
  aibom: <Memory />,
  ibom: <Badge />,
};

const BomIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const { edition, isDemo } = useAuth();
  const paid = isPaidEdition(edition);
  const layers = layersForEdition(paid);
  const { data } = useQuery({
    queryKey: ['bom-unified'],
    queryFn: () => bomService.getUnified().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const { data: framework } = useQuery({
    queryKey: ['bom-framework'],
    queryFn: () => bomService.getFramework().then((r) => r.data).catch(() => null),
    retry: 0,
  });

  const counts: Record<string, number> = {
    cbom: data?.cbom?.length ?? 0,
    qbom: data?.qbom?.length ?? 0,
    sbom: data?.sbom?.length ?? 0,
    aibom: data?.aibom?.length ?? 0,
    ibom: data?.ibom?.length ?? 0,
  };

  return (
    <PageFrame
      eyebrow="Five-BOM intelligence"
      title="QBOM · AIBOM · SBOM · IBOM · CBOM"
      subtitle="Unified cryptographic, quantum, software, AI, and identity bills of materials. Community runs CBOM, SBOM, and local QBOM. AIBOM and IBOM unlock with Enterprise."
      badge={paid ? 'Enterprise layers' : 'Community engine'}
      action={<Button variant="contained" onClick={() => navigate('/scanner')}>Run a scan</Button>}
    >
      <Stack spacing={2} sx={{ mb: 3 }}>
        <BomRibbon />
        <Alert severity="info">
          {framework?.honesty || 'Partner APIs (HSM, GRC, identity) stay disconnected without customer credentials. Mappings are not certifications.'}
          {isDemo ? ' This demo is Community-limited labeled sample data.' : ''}
        </Alert>
      </Stack>

      <Grid container spacing={2.5}>
        {layers.map((l) => (
          <Grid item xs={12} md={6} lg={4} key={l.id}>
            <GlassCard hover={l.enabled}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ color: l.enabled ? tokens.colors.rivicq[600] : 'text.disabled' }}>{ICONS[l.id]}</Box>
                <Typography variant="h6" fontWeight={800}>{l.name}</Typography>
                <Chip size="small" label={l.enabled ? 'On' : 'Enterprise'} color={l.enabled ? 'success' : 'default'} />
                <Chip size="small" variant="outlined" label={`${counts[l.id] || 0} assets`} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{l.role}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{l.honesty}</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {l.regulations.map((r) => <Chip key={r} size="small" label={r} variant="outlined" />)}
              </Stack>
              {!l.enabled && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: 'text.secondary' }}>
                  <Lock fontSize="small" />
                  <Typography variant="caption">Licensed Enterprise workspace required for this layer.</Typography>
                </Stack>
              )}
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" onClick={() => navigate('/pipeline')}>DevSecOps pipeline</Button>
        <Button variant="outlined" onClick={() => navigate('/security/api')}>API security</Button>
        <Button variant="outlined" onClick={() => navigate('/security/ai')}>AI security</Button>
        <Button variant="outlined" onClick={() => navigate('/connectors/hsm')}>HSM & quantum</Button>
        <Button variant="outlined" onClick={() => navigate('/governance')}>Governance</Button>
        <Button variant="outlined" onClick={() => navigate('/migration')}>PQC migration</Button>
      </Stack>
    </PageFrame>
  );
};

export default BomIntelligence;

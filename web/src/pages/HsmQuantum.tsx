import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Grid, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import { bomService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';

const HsmQuantum: React.FC = () => {
  const { edition } = useAuth();
  const paid = isPaidEdition(edition);
  const { data: hsm } = useQuery({
    queryKey: ['hsm-status'],
    queryFn: () => bomService.getHsm().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  const { data: q } = useQuery({
    queryKey: ['quantum-status'],
    queryFn: () => bomService.getQuantum().then((r) => r.data).catch(() => null),
    retry: 0,
  });
  return (
    <PageFrame
      eyebrow="Connectors"
      title="HSM and quantum integration"
      subtitle="Local QBOM scoring is always on. PKCS#11 / cloud HSM and optional quantum runtime stay disconnected until you supply credentials."
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        {hsm?.note || 'HSM integration does not extract keys or reverse-engineer firmware.'} {hsm?.qsic}
      </Alert>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <GlassCard>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>HSM / PKCS#11</Typography>
            <Chip size="small" label={hsm?.connected ? 'Connected' : 'Disconnected'} color={hsm?.connected ? 'success' : 'default'} sx={{ mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Enterprise connector (`PKCS11_MODULE` or `CRYPTO4A_API_KEY`). FIPS 140-3 claims belong to the customer module.
            </Typography>
            <Stack spacing={1}>
              {(hsm?.providers || []).map((p: any) => (
                <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={p.id} />
                  <Typography variant="body2">{p.domain}</Typography>
                  <Chip size="small" variant="outlined" label={p.connected ? 'live' : 'empty'} />
                </Stack>
              ))}
              {!paid && <Typography variant="caption">Community can declare QSIC/HSM catalog entries from the scanner.</Typography>}
            </Stack>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <GlassCard>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Quantum</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Scoring: {q?.scoring || 'qiskitprofile (local-classical)'}. Runtime is optional and never required for QBOM.
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}><Chip size="small" label="runtime" /><Typography variant="body2">{q?.runtime?.connected ? 'API key present' : 'Not connected'}</Typography></Stack>
              <Stack direction="row" spacing={1}><Chip size="small" label="migration" /><Typography variant="body2">{q?.migration?.connected ? 'Partner key present' : 'Local mapper only'}</Typography></Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{q?.note}</Typography>
          </GlassCard>
        </Grid>
      </Grid>
    </PageFrame>
  );
};

export default HsmQuantum;

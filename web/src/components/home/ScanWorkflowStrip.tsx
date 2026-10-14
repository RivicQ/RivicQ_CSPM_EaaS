import React from 'react';
import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import { AccountTree, Assessment, ManageSearch, TravelExplore } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  { icon: <TravelExplore />, title: 'Target', desc: 'A device, website, repo, or firmware image.' },
  { icon: <ManageSearch />, title: 'Discovery', desc: 'The RivicQ CBOM engine inventories cryptography on the target.' },
  { icon: <AccountTree />, title: 'CBOM evidence', desc: 'Findings are stored as machine-readable CycloneDX CBOM evidence.' },
  { icon: <Assessment />, title: 'Report & PQC', desc: 'Severity, policy gate, and a quantum-readiness roadmap.' },
];

/**
 * "How scanning works" strip with a live engine-status legend, so a visitor
 * on static Pages can see (a) the workflow and (b) exactly why scanning is
 * disabled here and which mode they are in.
 */
const ScanWorkflowStrip: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { backendReachable, isDemo } = useAuth();

  const state: { label: string; color: 'success' | 'info' | 'default'; desc: string } = backendReachable
    ? { label: 'RivicQ engine · live', color: 'success', desc: 'Scans here are real and evidence-backed.' }
    : isDemo
      ? { label: 'Interactive demo · sample data', color: 'info', desc: 'This session answers in-browser with clearly-labelled sample data.' }
      : { label: 'Engine not hosted · scanning disabled', color: 'default', desc: 'Deploy the API (docs/RENDER.md) or run it locally, or enter the interactive demo.' };

  return (
    <Box sx={{ mt: compact ? 3 : 6 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.secondary' }}>
          How scanning works
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" variant="outlined" color={state.color} label={state.label} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{state.desc}</Typography>
        </Stack>
      </Stack>
      <Grid container spacing={2}>
        {STEPS.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={s.title}>
            <Box sx={{ height: '100%', p: 2.25, borderRadius: 2, bgcolor: '#0a0a0f', border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{
                  width: 40, height: 40, borderRadius: 2, flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: 'rgba(124,58,237,0.28)',
                  color: 'primary.main',
                }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25, fontFamily: 'monospace' }}>
                    STEP {i + 1}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{s.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>{s.desc}</Typography>
                </Box>
              </Stack>
              {i < STEPS.length - 1 && (
                <Box sx={{ position: 'absolute', top: '50%', right: -6, color: 'text.disabled', display: { xs: 'none', md: 'block' }, transform: 'translateY(-50%)' }}>→</Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ScanWorkflowStrip;
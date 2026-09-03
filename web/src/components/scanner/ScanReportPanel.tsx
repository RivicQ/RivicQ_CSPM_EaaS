import React from 'react';
import { Alert, Box, Chip, Grid, Stack, Typography } from '@mui/material';
import { Search, Healing, Description } from '@mui/icons-material';
import { tokens } from '../../theme/tokens';

export type ArchitecturePhase = {
  id: string;
  title: string;
  status: string;
  summary: string;
  actions?: string[];
};

export type PQCReadinessView = {
  overall?: number;
  layers?: Record<string, number>;
  hndl_exposure?: number;
  migration?: Array<{ algorithm: string; replace_with: string; standard: string; priority: string }>;
  compliance?: Array<{ framework: string; control: string; status: string }>;
  pack_available?: boolean;
  note?: string;
};

export type ClientArchitectureView = {
  target_class?: string;
  target?: string;
  edition?: string;
  resources?: Record<string, boolean>;
  phases?: ArchitecturePhase[];
  honesty?: string;
};

const PHASE_ICON: Record<string, React.ReactNode> = {
  discover: <Search fontSize="small" />,
  mitigate: <Healing fontSize="small" />,
  report: <Description fontSize="small" />,
};

type Props = {
  architecture?: ClientArchitectureView | null;
  readiness?: PQCReadinessView | null;
};

const ScanReportPanel: React.FC<Props> = ({ architecture, readiness }) => {
  if (!architecture && !readiness) return null;
  const phases = architecture?.phases ?? [];
  return (
    <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle1" fontWeight={800}>Client report</Typography>
        {architecture?.target_class && <Chip size="small" label={architecture.target_class} color="primary" />}
        {architecture?.edition && <Chip size="small" variant="outlined" label={`${architecture.edition} edition`} />}
        {readiness?.overall != null && <Chip size="small" label={`PQC readiness ${readiness.overall}/100`} />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {architecture?.honesty || 'Discover inventories cryptography. Mitigate maps to NIST PQC. Report is CBOM evidence — not a certification.'}
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {phases.map((p) => (
          <Grid item xs={12} md={4} key={p.id}>
            <Box sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, color: tokens.colors.rivicq[600] }}>
                {PHASE_ICON[p.id] || <Description fontSize="small" />}
                <Typography fontWeight={800}>{p.title}</Typography>
                <Chip size="small" label={p.status} variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{p.summary}</Typography>
              <Stack spacing={0.5}>
                {(p.actions || []).slice(0, 4).map((a) => (
                  <Typography key={a} variant="caption" sx={{ display: 'block' }}>• {a}</Typography>
                ))}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
      {readiness?.migration && readiness.migration.length > 0 && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Mitigation: {readiness.migration.slice(0, 3).map((m) => `${m.algorithm} → ${m.replace_with}`).join(' · ')}
        </Alert>
      )}
      {readiness?.compliance && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {readiness.compliance.map((c) => (
            <Chip
              key={`${c.framework}-${c.control}`}
              size="small"
              variant="outlined"
              label={`${c.framework}: ${c.status}`}
            />
          ))}
          {readiness.pack_available
            ? <Chip size="small" color="success" label="DORA pack enabled" />
            : <Chip size="small" label="DORA JSON only (Community)" />}
        </Stack>
      )}
    </Box>
  );
};

export default ScanReportPanel;

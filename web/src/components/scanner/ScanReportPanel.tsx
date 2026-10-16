import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { tokens } from '../../theme/tokens';
import { ARCHIFY_FONTS, NEBULA } from '../../theme/nebulaSurfaces';

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

const IDLE_PHASES: ArchitecturePhase[] = [
  {
    id: 'discover',
    title: 'Discover',
    status: 'waiting',
    summary: 'Website, host, IP, server, pod, or a declared hardware catalog.',
  },
  {
    id: 'mitigate',
    title: 'Mitigate',
    status: 'waiting',
    summary: 'Map Shor and Grover families to ML-KEM, ML-DSA, and SLH-DSA.',
  },
  {
    id: 'report',
    title: 'Report',
    status: 'waiting',
    summary: 'CBOM evidence. Firmware stays static metadata, not binary reverse engineering.',
  },
];

type Props = {
  architecture?: ClientArchitectureView | null;
  readiness?: PQCReadinessView | null;
  /** Show the three client phases before a scan returns intelligence. */
  showIdle?: boolean;
};

const ScanReportPanel: React.FC<Props> = ({ architecture, readiness, showIdle = false }) => {
  const live = architecture?.phases ?? [];
  const phases = live.length ? live : (showIdle ? IDLE_PHASES : []);
  if (!phases.length && !readiness) return null;

  return (
    <Box
      data-client-architecture="strip"
      sx={{
        mb: 2,
        p: 1.25,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.12)',
        bgcolor: NEBULA.ink,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.02em' }}>
          Client architecture
        </Typography>
        {architecture?.target_class && <Chip size="small" label={architecture.target_class} variant="outlined" />}
        {architecture?.edition && <Chip size="small" variant="outlined" label={architecture.edition} />}
        {readiness?.overall != null && <Chip size="small" variant="outlined" label={`PQC ${readiness.overall}`} />}
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
        }}
      >
        {phases.map((phase, index) => (
          <Box
            key={phase.id}
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: NEBULA.line,
              bgcolor: NEBULA.panel,
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.35 }}>
              <Typography sx={{ fontFamily: ARCHIFY_FONTS.mono, fontSize: '0.625rem', color: NEBULA.faint }}>
                {String(index + 1).padStart(2, '0')}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{phase.title}</Typography>
              <Typography sx={{ ml: 'auto', fontSize: '0.6875rem', color: tokens.colors.text.muted, textTransform: 'lowercase' }}>
                {phase.status}
              </Typography>
            </Stack>
            <Typography sx={{ color: NEBULA.muted, fontSize: '0.75rem', lineHeight: 1.45 }}>
              {phase.summary}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ mt: 1, color: NEBULA.faint, fontSize: '0.75rem', lineHeight: 1.45 }}>
        {architecture?.honesty
          || 'Discover inventories cryptography. Mitigate maps to NIST PQC. Report is CBOM evidence — not a certification. Firmware analysis reads metadata only.'}
      </Typography>
      {readiness?.migration && readiness.migration.length > 0 && (
        <Typography sx={{ mt: 0.5, color: NEBULA.muted, fontSize: '0.75rem' }}>
          {readiness.migration.slice(0, 3).map((item) => `${item.algorithm} → ${item.replace_with}`).join(' · ')}
        </Typography>
      )}
      {readiness?.compliance && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
          {readiness.compliance.slice(0, 6).map((control) => (
            <Chip
              key={`${control.framework}-${control.control}`}
              size="small"
              variant="outlined"
              label={`${control.framework}: ${control.status}`}
            />
          ))}
          <Chip
            size="small"
            variant="outlined"
            label={readiness.pack_available ? 'DORA pack enabled' : 'DORA JSON only'}
          />
        </Stack>
      )}
    </Box>
  );
};

export default ScanReportPanel;

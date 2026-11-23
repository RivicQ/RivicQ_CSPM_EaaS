import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { websiteCtaSx, websiteOutlineCtaSx } from '../../theme/websiteChrome';
import { ARCHIFY_FONTS, nebulaPanelSx } from '../../theme/nebulaSurfaces';
import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_IBM_PAGES,
  PUBLIC_ENGINE_SCAN_COPY,
  PUBLIC_ENGINE_STATIC_COPY,
} from '../../data/publicInfrastructure';

type Variant = 'scan' | 'ibm' | 'auth';

export const publicEngineChipSx = {
  fontFamily: ARCHIFY_FONTS.mono,
  fontSize: '0.6875rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderRadius: 999,
} as const;

const eyebrowSx = {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

const copySx = {
  fontSize: '0.9375rem',
  lineHeight: 1.65,
  color: 'text.secondary',
} as const;

const copyByVariant: Record<Variant, string> = {
  auth: PUBLIC_ENGINE_STATIC_COPY,
  scan: PUBLIC_ENGINE_SCAN_COPY,
  ibm: PUBLIC_ENGINE_IBM_PAGES,
};

const PublicEngineNotice: React.FC<{ variant?: Variant; force?: boolean; compact?: boolean }> = ({
  variant = 'scan',
  force = false,
  compact = false,
}) => {
  const { backendReachable, isDemo } = useAuth();
  const navigate = useNavigate();
  const diagramHref = `${process.env.PUBLIC_URL || ''}/archify/diagrams/rivicq-cspm-operator-workflow.html`;

  if (backendReachable && !force) return null;

  const panelProps = { ...nebulaPanelSx, p: 2, mb: compact ? 1.5 : 3 } as const;

  if (isDemo && !backendReachable) {
    return (
      <Box sx={panelProps}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="success" variant="filled" sx={publicEngineChipSx} label={PUBLIC_ENGINE_CHIP_DEMO} />
          <Typography sx={eyebrowSx}>Demo session</Typography>
        </Stack>
        <Typography sx={{ ...copySx, mb: 1.75 }}>{PUBLIC_ENGINE_DEMO_COPY}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button size="small" variant="contained" onClick={() => navigate('/scanner')} sx={websiteCtaSx}>
            Open the Scanner
          </Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/dashboard')} sx={websiteOutlineCtaSx()}>
            Dashboard
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={panelProps}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" variant="outlined" sx={publicEngineChipSx} label={PUBLIC_ENGINE_CHIP_DISCONNECTED} />
        <Typography sx={eyebrowSx}>Engine not on this build</Typography>
      </Stack>
      <Typography sx={{ ...copySx, mb: 1.75 }}>{copyByVariant[variant]}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="contained" onClick={() => navigate('/demo')} sx={websiteCtaSx}>
          {variant === 'auth' ? 'Try the interactive demo (sample data)' : 'Try the interactive demo'}
        </Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/request-demo')} sx={websiteOutlineCtaSx()}>
          Request Enterprise demo
        </Button>
        {variant !== 'auth' && (
          <Button size="small" variant="outlined" href={diagramHref} target="_blank" rel="noopener noreferrer" sx={websiteOutlineCtaSx()}>
            Operator workflow
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          href={`${process.env.PUBLIC_URL || ''}/docs/RENDER.md`}
          target="_blank"
          rel="noopener noreferrer"
          sx={websiteOutlineCtaSx()}
        >
          Deploy the engine
        </Button>
      </Stack>
    </Box>
  );
};

export default PublicEngineNotice;

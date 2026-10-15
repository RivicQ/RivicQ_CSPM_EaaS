import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { websiteCtaSx, websiteOutlineCtaSx } from '../../theme/websiteChrome';
import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_IBM_PAGES,
  PUBLIC_ENGINE_SCAN_COPY,
} from '../../data/publicInfrastructure';

type Variant = 'scan' | 'ibm';

const panelSx = {
  p: 2,
  mb: 3,
  bgcolor: '#0a0a0f',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
} as const;

/**
 * Honest engine-status panel for static Pages.
 * Three states: live, interactive demo, or engine-not-hosted.
 */
const PublicEngineNotice: React.FC<{ variant?: Variant; force?: boolean; compact?: boolean }> = ({
  variant = 'scan',
  force = false,
  compact = false,
}) => {
  const { backendReachable, isDemo } = useAuth();
  const navigate = useNavigate();
  const diagramHref = `${process.env.PUBLIC_URL || ''}/archify/diagrams/rivicq-cspm-operator-workflow.html`;

  if (backendReachable && !force) return null;

  if (isDemo && !backendReachable) {
    return (
      <Box sx={{ ...panelSx, mb: compact ? 1.5 : 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="success" variant="filled" label={PUBLIC_ENGINE_CHIP_DEMO} />
          <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Demo session
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.65, mb: 1.75, color: 'text.secondary' }}>
          {PUBLIC_ENGINE_DEMO_COPY}
        </Typography>
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

  const copy = variant === 'ibm' ? PUBLIC_ENGINE_IBM_PAGES : PUBLIC_ENGINE_SCAN_COPY;

  return (
    <Box sx={{ ...panelSx, mb: compact ? 1.5 : 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" variant="outlined" label={PUBLIC_ENGINE_CHIP_DISCONNECTED} />
        <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Engine not on this build
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.65, mb: 1.75, color: 'text.secondary' }}>{copy}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="contained" onClick={() => navigate('/demo')} sx={websiteCtaSx}>
          Try the interactive demo
        </Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/request-demo')} sx={websiteOutlineCtaSx()}>
          Request Enterprise demo
        </Button>
        <Button size="small" variant="outlined" href={diagramHref} target="_blank" rel="noopener noreferrer" sx={websiteOutlineCtaSx()}>
          Operator workflow
        </Button>
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

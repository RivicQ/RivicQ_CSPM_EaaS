import React from 'react';
import { Box, Button, Chip, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { websiteCtaSx, websiteOutlineCtaSx } from '../../theme/websiteChrome';
import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_CHIP_LIVE,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_DEPLOY_HINT,
  PUBLIC_ENGINE_IBM_PAGES,
  PUBLIC_ENGINE_SCAN_COPY,
} from '../../data/publicInfrastructure';

type Variant = 'scan' | 'ibm';

/**
 * Honest engine-status panel for static Pages.
 * Three states: live (engine reachable), demo (engine absent, interactive
 * demo session active), and offline (engine absent, no session — scanning is
 * disabled and we explain why plus how to fix it).
 */
const PublicEngineNotice: React.FC<{ variant?: Variant; force?: boolean; compact?: boolean }> = ({ variant = 'scan', force = false, compact = false }) => {
  const { backendReachable, isDemo } = useAuth();
  const navigate = useNavigate();
  const isDark = useTheme().palette.mode === 'dark';

  if (backendReachable && !force) return null;

  if (isDemo && !backendReachable) {
    return (
      <Box sx={{ p: 2, mb: compact ? 1.5 : 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="success" variant="filled" label={PUBLIC_ENGINE_CHIP_DEMO} />
          <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Demo session
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.65, mb: 1.75 }}>{PUBLIC_ENGINE_DEMO_COPY}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button size="small" variant="contained" onClick={() => navigate('/scanner')} sx={websiteCtaSx}>
            Open the Scanner
          </Button>
          <Button size="small" variant="outlined" onClick={() => navigate('/dashboard')} sx={websiteOutlineCtaSx(isDark)}>
            Dashboard
          </Button>
        </Stack>
      </Box>
    );
  }

  const copy = variant === 'ibm' ? PUBLIC_ENGINE_IBM_PAGES : PUBLIC_ENGINE_SCAN_COPY;

  return (
    <Box sx={{ p: 2, mb: compact ? 1.5 : 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" variant="outlined" label={PUBLIC_ENGINE_CHIP_DISCONNECTED} />
        <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Scanning is disabled on this build
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.65, mb: 1.75 }}>{copy}</Typography>
      {variant === 'scan' && (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.6, mb: 1.75 }}>{PUBLIC_ENGINE_DEPLOY_HINT}</Typography>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button size="small" variant="contained" onClick={() => navigate('/demo')} sx={websiteCtaSx}>
          Try the interactive demo
        </Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/login')} sx={websiteOutlineCtaSx(isDark)}>
          Sign in to the engine
        </Button>
        {variant === 'ibm' && (
          <Button size="small" variant="outlined" onClick={() => navigate('/request-demo')} sx={websiteOutlineCtaSx(isDark)}>
            Request enterprise demo
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default PublicEngineNotice;
import React from 'react';
import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { websiteCtaSx, websiteOutlineCtaSx } from '../../theme/websiteChrome';
import {
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_CHIP_LIVE,
  PUBLIC_ENGINE_IBM_PAGES,
  PUBLIC_ENGINE_SCAN_COPY,
} from '../../data/publicInfrastructure';

type Variant = 'scan' | 'ibm';

const PublicEngineNotice: React.FC<{ variant?: Variant; force?: boolean; compact?: boolean }> = ({ variant = 'scan', force = false, compact = false }) => {
  const { backendReachable } = useAuth();
  const navigate = useNavigate();
  const isDark = useTheme().palette.mode === 'dark';

  if (backendReachable && !force) return null;

  const copy = variant === 'ibm' ? PUBLIC_ENGINE_IBM_PAGES : PUBLIC_ENGINE_SCAN_COPY;

  return (
    <Box
      sx={{
        p: 2,
        mb: compact ? 1.5 : 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        color: 'text.secondary',
      }}
    >
      <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa', mb: 0.75 }}>
        {backendReachable ? PUBLIC_ENGINE_CHIP_LIVE : PUBLIC_ENGINE_CHIP_DISCONNECTED}
      </Typography>
      <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.65, mb: 1.75 }}>{copy}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button size="small" variant="contained" onClick={() => navigate('/login')} sx={websiteCtaSx}>
          Sign in to the engine
        </Button>
        <Button size="small" variant="outlined" onClick={() => navigate('/demo')} sx={websiteOutlineCtaSx(isDark)}>
          Labeled Community demo
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

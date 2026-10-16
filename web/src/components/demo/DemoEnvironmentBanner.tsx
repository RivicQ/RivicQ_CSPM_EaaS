import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NEBULA } from '../../theme/nebulaSurfaces';

const DemoEnvironmentBanner: React.FC = () => {
  const { isDemo, logout } = useAuth();
  const navigate = useNavigate();

  if (!isDemo) return null;

  return (
    <Box
      role="status"
      aria-label="Demo environment"
      sx={{
        mb: 1,
        px: 1.25,
        py: 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: 'wrap',
        border: '1px solid',
        borderColor: NEBULA.line,
        borderRadius: 1,
        bgcolor: NEBULA.panel,
      }}
    >
      <Typography sx={{ fontSize: '0.75rem', color: NEBULA.muted }}>
        Demo · labeled sample data. Actions do not touch customer estates.
      </Typography>
      <Stack direction="row" spacing={0.75}>
        <Button size="small" onClick={() => navigate('/demo')} sx={{ minHeight: 28, textTransform: 'none' }}>
          Trail
        </Button>
        <Button
          size="small"
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
          sx={{ minHeight: 28, textTransform: 'none' }}
        >
          Exit
        </Button>
      </Stack>
    </Box>
  );
};

export default DemoEnvironmentBanner;

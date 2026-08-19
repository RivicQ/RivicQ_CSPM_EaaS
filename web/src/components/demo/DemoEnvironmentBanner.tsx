import React from 'react';
import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import { Science } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import designSystem from '../../theme/designSystem';

const DemoEnvironmentBanner: React.FC = () => {
  const { isDemo, logout } = useAuth();
  const navigate = useNavigate();

  if (!isDemo) return null;

  return (
    <Alert
      severity="info"
      icon={<Science aria-hidden />}
      role="status"
      aria-label="Demo environment"
      sx={{
        mb: 2.5,
        borderRadius: `${designSystem.radius.lg}px`,
        backdropFilter: 'none',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(90,82,104,0.22)' : 'rgba(245,244,247,0.96)'),
        border: 1,
        borderColor: 'info.light',
      }}
      action={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/demo')}
            aria-label="Open demo trail"
          >
            Demo trail
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              logout();
              navigate('/', { replace: true });
            }}
            aria-label="Exit demo"
          >
            Exit Demo
          </Button>
        </Stack>
      }
    >
      <AlertTitle sx={{ fontWeight: 800, letterSpacing: '0.04em' }}>DEMO ENVIRONMENT</AlertTitle>
      You are exploring RivicQ with sample data. Demo actions do not touch customer estates.
    </Alert>
  );
};

export default DemoEnvironmentBanner;

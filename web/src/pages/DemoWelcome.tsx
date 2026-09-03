import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Grid, Stack, Typography, useTheme,
} from '@mui/material';
import { Dashboard, Explore, Science } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useDemoTrail } from '../context/DemoTrailContext';
import BrandLogo from '../components/BrandLogo';
import GlassCard from '../components/ui/GlassCard';
import { LoadingButton } from '../components/ui';
import designSystem from '../theme/designSystem';
import { DEMO_TRAIL_STEPS } from '../demo/trail';

const DemoWelcome: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { demoLogin, isAuthenticated, isDemo, backendReachable } = useAuth();
  const { start, skip } = useDemoTrail();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const enterDemo = async (withTrail: boolean) => {
    setLoading(true);
    setError('');
    try {
      if (!isAuthenticated || !isDemo) {
        await demoLogin('community');
      }
      if (withTrail) {
        start();
      } else {
        skip();
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Demo access is unavailable on this deployment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 4, md: 8 },
        background: isDark ? designSystem.proBlue.commandCenter : designSystem.gradient.meshLight,
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={1} sx={{ mb: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <BrandLogo />
          <Typography variant="overline" color="primary" fontWeight={800} letterSpacing="0.16em">
            Interactive demo trail
          </Typography>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.03em', textAlign: { sm: 'center' } }}>
            Welcome to RivicQ
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: { sm: 'center' }, maxWidth: 640, fontWeight: 400 }}>
            Limited Community demo: discover cryptography, map PQC mitigations, and read the CBOM report. Enterprise connectors stay locked.
          </Typography>
        </Stack>

        <GlassCard hover={false} glow={designSystem.proBlue.accent}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {backendReachable
              ? 'Demo access uses GET /auth/demo as a Community workspace. It cannot see customer data. Enterprise control-plane routes stay locked.'
              : 'This GitHub Pages build has no live API. You will explore a limited Community DEMO workspace with labeled sample data — not a production login and not an Enterprise tenant.'}
          </Typography>
          {error && (
            <Typography role="alert" color="error" variant="body2" sx={{ mb: 2 }}>{error}</Typography>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <LoadingButton
              variant="contained"
              size="large"
              loading={loading}
              loadingText="Opening demo…"
              startIcon={<Science />}
              onClick={() => enterDemo(true)}
              sx={{ py: 1.4 }}
            >
              Start Demo
            </LoadingButton>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Dashboard />}
              disabled={loading}
              onClick={() => enterDemo(false)}
            >
              Explore Dashboard
            </Button>
            <Button
              size="large"
              startIcon={<Explore />}
              disabled={loading}
              onClick={() => {
                skip();
                navigate(isAuthenticated ? '/dashboard' : '/login');
              }}
            >
              Skip Tour
            </Button>
          </Stack>
        </GlassCard>

        <Typography variant="subtitle2" sx={{ mt: 4, mb: 1.5 }} color="text.secondary">
          What you will walk through
        </Typography>
        <Grid container spacing={1.5}>
          {DEMO_TRAIL_STEPS.slice(1).map((step, i) => (
            <Grid item xs={12} sm={6} key={step.id}>
              <GlassCard delay={i} hover={false} padding={2}>
                <Typography variant="caption" color="primary" fontWeight={800}>
                  Step {i + 1}
                </Typography>
                <Typography fontWeight={700}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary">{step.body}</Typography>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default DemoWelcome;

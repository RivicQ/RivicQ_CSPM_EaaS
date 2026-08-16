import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Stack, TextField, Typography, useTheme,
} from '@mui/material';
import { ArrowForward, WorkspacePremium } from '@mui/icons-material';
import BrandLogo from '../components/BrandLogo';
import designSystem, { glassSurface } from '../theme/designSystem';
import { LoadingButton } from '../components/ui';
import { tokens } from '../theme/tokens';

const BETA_STORE = 'rivicq_beta_requests';

const BetaAccess: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [form, setForm] = React.useState({ name: '', email: '', organisation: '', useCase: '' });
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, createdAt: new Date().toISOString() };
      const prev = JSON.parse(localStorage.getItem(BETA_STORE) || '[]');
      localStorage.setItem(BETA_STORE, JSON.stringify([payload, ...(Array.isArray(prev) ? prev : [])].slice(0, 25)));
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: isDark ? designSystem.proBlue.commandCenter : 'linear-gradient(180deg,#fff,#eff6ff 55%,#f8fafc)' }}>
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center">
          <BrandLogo dark={isDark} />
          <Chip icon={<WorkspacePremium />} label="Design-partner beta" color="primary" sx={{ fontWeight: 700 }} />
          <Typography variant="h4" fontWeight={900} textAlign="center" sx={{ letterSpacing: '-0.03em' }}>
            Request Enterprise access
          </Typography>
          <Typography color="text.secondary" textAlign="center">
            Community stays free. Tell us about your organisation and we will provision an Enterprise workspace for client testing.
          </Typography>
          <Card sx={{ width: '100%', ...(isDark ? {} : glassSurface(theme, true)) }}>
            <CardContent sx={{ p: 3 }}>
              {submitted ? (
                <Stack spacing={2}>
                  <Alert severity="success">Request saved in this workspace. Open a GitHub Discussion or email us to complete onboarding.</Alert>
                  <Button variant="contained" endIcon={<ArrowForward />} onClick={() => navigate('/register')} sx={{ backgroundImage: designSystem.gradient.brand }}>
                    Continue with Community
                  </Button>
                  <Button variant="outlined" href="https://github.com/RivicQ/RivicQ_CSPM_EaaS/discussions" target="_blank" rel="noopener noreferrer">
                    Open GitHub Discussions
                  </Button>
                </Stack>
              ) : (
                <form onSubmit={submit}>
                  <Stack spacing={2}>
                    <TextField required label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                    <TextField required type="email" label="Work email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                    <TextField required label="Organisation" value={form.organisation} onChange={(e) => setForm((p) => ({ ...p, organisation: e.target.value }))} />
                    <TextField
                      label="Use case"
                      multiline
                      minRows={3}
                      placeholder="Clouds, asset volume, DORA / BSI / eIDAS needs…"
                      value={form.useCase}
                      onChange={(e) => setForm((p) => ({ ...p, useCase: e.target.value }))}
                    />
                    <LoadingButton type="submit" variant="contained" loading={loading} endIcon={<ArrowForward />} sx={{ backgroundImage: designSystem.gradient.brand }}>
                      Join the beta
                    </LoadingButton>
                    <Button variant="text" onClick={() => navigate('/switcher')} sx={{ color: tokens.colors.rivicq[600] }}>
                      Choose edition instead
                    </Button>
                  </Stack>
                </form>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default BetaAccess;

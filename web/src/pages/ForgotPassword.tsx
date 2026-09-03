import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Mail } from '@mui/icons-material';
import BrandLogo from '../components/BrandLogo';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import designSystem from '../theme/designSystem';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { backendReachable, isDemo } = useAuth();
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [demoToken, setDemoToken] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDemoToken('');
    try {
      if (!backendReachable) {
        setMessage('Password reset requires the RivicQ API. On GitHub Pages this is a static demo — ask your operator, or run the backend locally.');
        return;
      }
      const resp = await authService.forgotPassword(email);
      setMessage(resp.data?.message || 'If an account exists, a reset was issued.');
      if (resp.data?.demo_mode && resp.data?.reset_token) {
        setDemoToken(resp.data.reset_token);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to start password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: '#ffffff' }}>
      <Container maxWidth="sm">
        <BrandLogo />
        <Card sx={{ mt: 4, borderRadius: 1, border: `1px solid ${designSystem.proBlue.border}` }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              Reset your password
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              RivicQ Identity does not send mailbox email. If an account exists, a reset token is issued for your operator or labeled demo mode.
            </Typography>
            {isDemo && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Demo sessions cannot reset a production password. Sample data only.
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {demoToken && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>DEMO MODE token</strong> — not a production email.{' '}
                <Button
                  size="small"
                  onClick={() => navigate(`/reset-password?token=${encodeURIComponent(demoToken)}`)}
                >
                  Continue to reset
                </Button>
              </Alert>
            )}
            <form onSubmit={submit}>
              <Stack spacing={2}>
                <TextField
                  label="Work email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{ startAdornment: <Mail sx={{ mr: 1, color: 'text.secondary' }} /> }}
                  fullWidth
                  required
                />
                <Button type="submit" variant="contained" disabled={loading || !email}>
                  {loading ? 'Please wait…' : 'Request reset'}
                </Button>
                <Button component={RouterLink} to="/login" startIcon={<ArrowBack />} variant="text">
                  Back to sign in
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPassword;

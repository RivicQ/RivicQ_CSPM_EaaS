import React from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Lock } from '@mui/icons-material';
import BrandLogo from '../components/BrandLogo';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import designSystem from '../theme/designSystem';

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { backendReachable } = useAuth();
  const [token, setToken] = React.useState(params.get('token') || '');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!backendReachable) {
      setError('Password reset requires the RivicQ API.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Reset failed');
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
            <Typography variant="h4" fontWeight={800}>Set a new password</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Use the reset token from your operator or from labeled demo mode. Tokens expire in 30 minutes and are single-use.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {done ? (
              <Stack spacing={2}>
                <Alert severity="success">Password updated. Sign in with the new password.</Alert>
                <Button variant="contained" onClick={() => navigate('/login', { replace: true })}>
                  Go to sign in
                </Button>
              </Stack>
            ) : (
              <form onSubmit={submit}>
                <Stack spacing={2}>
                  <TextField
                    label="Reset token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="New password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    fullWidth
                    required
                  />
                  <Button type="submit" variant="contained" disabled={loading || !token}>
                    {loading ? 'Please wait…' : 'Update password'}
                  </Button>
                  <Button component={RouterLink} to="/forgot-password" startIcon={<ArrowBack />} variant="text">
                    Request a new token
                  </Button>
                </Stack>
              </form>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;

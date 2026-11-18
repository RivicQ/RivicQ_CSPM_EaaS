import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { ArrowBack, Mail } from '@mui/icons-material';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AuthChrome from '../components/brand/AuthChrome';
import { ARCHIFY_FONTS, nebulaCardSx } from '../theme/nebulaSurfaces';

const cardSx = {
  ...nebulaCardSx,
  mt: 1,
};

const ForgotPassword: React.FC = () => {
  const { backendReachable, isDemo } = useAuth();
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (!backendReachable) {
        setMessage('Password reset requires the RivicQ API.');
        return;
      }
      const resp = await authService.forgotPassword(email);
      setMessage(resp.data?.message || 'If an account exists, a reset link has been issued.');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to start password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthChrome>
      <Card sx={cardSx} elevation={0}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ fontFamily: ARCHIFY_FONTS.title, fontWeight: 600, letterSpacing: '-0.03em' }}>
            Reset your password
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            If an account exists, a reset token is issued. Enter the token on the reset page; tokens are not sent by email or shown here.
          </Typography>
          {isDemo && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Demo sessions cannot reset a production password. Sample data only.
            </Alert>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
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
              <Button component={RouterLink} to="/reset-password" variant="text">
                I have a reset token
              </Button>
              <Button component={RouterLink} to="/login" startIcon={<ArrowBack />} variant="text">
                Back to sign in
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </AuthChrome>
  );
};

export default ForgotPassword;

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Typography, Container, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { normalizeEdition } from '../config/editions';
import AuthChrome from '../components/brand/AuthChrome';
import { nebulaPanelSx } from '../theme/nebulaSurfaces';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { persistAuth } = useAuth();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const decode = (value: string | null) => {
      if (!value) return '';
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    const oauthError = searchParams.get('error');
    if (oauthError) {
      const description = decode(searchParams.get('error_description')) || oauthError;
      if (oauthError === 'redirect_uri_mismatch') {
        authService.googleStatus()
          .then((resp) => {
            const uri = resp.data?.redirect_uri;
            setError(
              uri
                ? `Google OAuth redirect URI mismatch. Add this exact URI in Google Cloud Console → Credentials → Authorized redirect URIs:\n${uri}`
                : `Google OAuth redirect URI mismatch (${description}).`
            );
          })
          .catch(() => setError(`Google OAuth redirect URI mismatch (${description}).`));
        return;
      }
      setError(description);
      return;
    }

    const exchangeCode = searchParams.get('exchange_code') || searchParams.get('code');
    const state = searchParams.get('state');
    const provider = (searchParams.get('provider') || '').toLowerCase();

    const finish = async () => {
      if (exchangeCode && state) {
        try {
          let resp;
          if (provider === 'github') {
            resp = await authService.githubExchange({ exchange_code: exchangeCode, state });
          } else {
            resp = await authService.googleExchange({ exchange_code: exchangeCode, state });
          }
          const data = resp.data;
          persistAuth({
            access_token: data.access_token,
            refresh_token: data.refresh_token || null,
            user: data.user ? {
              id: data.user.id,
              name: decode(data.user.name),
              email: decode(data.user.email),
              role: data.user.role || 'viewer',
            } : { id: 'loading', name: 'Loading...', email: '', role: 'viewer' },
            edition: normalizeEdition(data.edition),
          });
          navigate('/dashboard', { replace: true });
        } catch (err: any) {
          setError(err?.response?.data?.error || err?.message || 'Sign-in failed');
        }
        return;
      }

      setError('Missing exchange code. Please try signing in again.');
    };

    finish();
  }, [searchParams, navigate, persistAuth]);

  if (error) {
    return (
      <AuthChrome>
        <Alert severity="error" sx={{ ...nebulaPanelSx, borderColor: 'error.main' }}>{error}</Alert>
      </AuthChrome>
    );
  }

  return (
    <AuthChrome>
      <Container maxWidth="sm" sx={{ ...nebulaPanelSx, textAlign: 'center', p: 4 }} disableGutters>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6">Completing authentication...</Typography>
        <Typography variant="body2" color="text.secondary">
          Redirecting to your workspace
        </Typography>
      </Container>
    </AuthChrome>
  );
};

export default OAuthCallback;

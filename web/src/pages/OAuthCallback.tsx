import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Typography, Container, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { normalizeEdition } from '../config/editions';

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

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const finishWithTokens = async (
      accessToken: string,
      refreshToken: string | null,
      edition: ReturnType<typeof normalizeEdition>,
      user?: { id: string; name: string; email: string; role: string },
    ) => {
      try {
        if (user?.id && user.name) {
          persistAuth({
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
              id: user.id,
              name: decode(user.name),
              email: decode(user.email),
              role: user.role,
            },
            edition,
          });
        } else {
          persistAuth({
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { id: 'loading', name: 'Loading...', email: '', role: 'viewer' },
            edition,
          });
          const meResp = await authService.me();
          const me = meResp.data;
          persistAuth({
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { id: me.user_id, name: me.name || me.email, email: me.email, role: me.role },
            edition: me.edition || edition,
          });
        }
        navigate('/dashboard', { replace: true });
      } catch {
        setError('Failed to complete authentication. Please try logging in manually.');
      }
    };

    const finish = async () => {
      if (code && state) {
        try {
          const resp = await authService.googleExchange({ code, state });
          const data = resp.data;
          await finishWithTokens(
            data.access_token,
            data.refresh_token,
            normalizeEdition(data.edition),
            data.user
              ? {
                  id: data.user.id,
                  name: data.user.name,
                  email: data.user.email,
                  role: data.user.role || 'viewer',
                }
              : undefined,
          );
        } catch (err: any) {
          setError(err?.response?.data?.error || err?.message || 'Google sign-in failed');
        }
        return;
      }

      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const edition = normalizeEdition(searchParams.get('edition'));
      const userId = searchParams.get('user_id');
      const userName = searchParams.get('user_name');
      const userEmail = searchParams.get('user_email');
      const userRole = searchParams.get('user_role') || 'viewer';

      if (!accessToken) {
        setError('No access token received from authentication provider. Please try again.');
        return;
      }

      await finishWithTokens(accessToken, refreshToken, edition, {
        id: userId || '',
        name: userName || '',
        email: userEmail || '',
        role: userRole,
      });
    };

    finish();
  }, [searchParams, navigate, persistAuth]);

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <CircularProgress size={48} sx={{ mb: 2 }} />
      <Typography variant="h6">Completing authentication...</Typography>
      <Typography variant="body2" color="text.secondary">
        Redirecting to your workspace
      </Typography>
    </Container>
  );
};

export default OAuthCallback;

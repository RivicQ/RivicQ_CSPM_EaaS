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

    const finish = async () => {
      try {
        if (userId && userName) {
          persistAuth({
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { id: userId, name: userName, email: userEmail || '', role: userRole },
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

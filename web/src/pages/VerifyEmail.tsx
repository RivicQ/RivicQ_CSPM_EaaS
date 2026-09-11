import React from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { MarkEmailRead } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AuthChrome from '../components/brand/AuthChrome';

const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const { supabaseEnabled, backendReachable } = useAuth();

  return (
    <AuthChrome>
      <Card sx={{ mt: 1, borderRadius: 2, bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' }} elevation={0}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <MarkEmailRead color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4" fontWeight={800}>Check your inbox</Typography>
            <Typography color="text.secondary">
              {email ? <>A confirmation link may have been sent to <strong>{email}</strong>.</> : 'Confirm the address you used to register.'}
            </Typography>
            {backendReachable && !supabaseEnabled && (
              <Alert severity="info">
                RivicQ Identity creates the account immediately. There is no mailbox product on this API — sign in with the password you just set.
              </Alert>
            )}
            {supabaseEnabled && (
              <Alert severity="info">
                This deployment uses Supabase confirmation. We do not generate a fake mailbox. If no email arrives, check spam or contact your operator.
              </Alert>
            )}
            <Button component={RouterLink} to="/login" variant="contained">
              Continue to sign in
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </AuthChrome>
  );
};

export default VerifyEmail;

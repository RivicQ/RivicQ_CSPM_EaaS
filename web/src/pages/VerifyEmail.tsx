import React from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { MarkEmailRead } from '@mui/icons-material';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import designSystem from '../theme/designSystem';

/**
 * Honest email-verification surface.
 * RivicQ Identity does not operate a mailbox. Supabase confirmation is the only
 * path that may require a check-inbox step.
 */
const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const { supabaseEnabled, backendReachable } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: '#ffffff' }}>
      <Container maxWidth="sm">
        <BrandLogo />
        <Card sx={{ mt: 4, borderRadius: 1, border: `1px solid ${designSystem.proBlue.border}` }}>
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
      </Container>
    </Box>
  );
};

export default VerifyEmail;

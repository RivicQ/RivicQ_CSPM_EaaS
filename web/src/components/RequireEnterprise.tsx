import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { ArrowForward, Lock, WorkspacePremium } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition, isEnterpriseEdition } from '../config/editions';

const RequireEnterprise: React.FC<{ children: React.ReactElement; layers?: boolean }> = ({ children, layers }) => {
  const { edition } = useAuth();
  const navigate = useNavigate();
  const allowed = layers ? isEnterpriseEdition(edition) : isPaidEdition(edition);

  if (!allowed) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 2 }}>
        <Card sx={{ maxWidth: 720, width: '100%', bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2} alignItems="flex-start">
              <Lock sx={{ fontSize: 42, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={800} sx={{ color: '#fff' }}>
                Enterprise layer locked
              </Typography>
              <Typography variant="body1" sx={{ color: '#d1d5db' }}>
                This workspace is not entitled to this capability. Server-derived entitlements are required.
              </Typography>
              <Alert severity="info" sx={{ width: '100%' }}>
                Sign in to an entitled workspace provisioned by your administrator.
              </Alert>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <Button variant="contained" startIcon={<WorkspacePremium />} onClick={() => navigate('/switcher')}>
                  Choose edition
                </Button>
                <Button variant="outlined" endIcon={<ArrowForward />} onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return children;
};

export default RequireEnterprise;

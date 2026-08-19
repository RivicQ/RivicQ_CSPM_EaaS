import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { ArrowForward, Lock, WorkspacePremium } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';

const RequireEnterprise: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { edition } = useAuth();
  const navigate = useNavigate();

  if (!isPaidEdition(edition)) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 2 }}>
        <Card sx={{ maxWidth: 720, width: '100%', border: '1px solid rgba(90,82,104,0.30)' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2} alignItems="flex-start">
              <Lock sx={{ fontSize: 42, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={800}>
                Enterprise feature locked
              </Typography>
              <Typography variant="body1" color="text.secondary">
                This area is reserved for Professional and Enterprise workspaces. Community still gives you CBOM, scanner, analytics, and local workflows.
              </Typography>
              <Alert severity="info" sx={{ width: '100%' }}>
                Switch to Enterprise from the edition selector when your workspace is provisioned and approved.
              </Alert>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <Button variant="contained" startIcon={<WorkspacePremium />} onClick={() => navigate('/switcher')}>
                  Choose edition
                </Button>
                <Button variant="outlined" endIcon={<ArrowForward />} onClick={() => navigate('/dashboard')}>
                  Back to OSS dashboard
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

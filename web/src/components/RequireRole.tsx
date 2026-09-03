import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { roleAtLeast, WorkspaceRole } from '../auth/roles';

const RequireRole: React.FC<{ role: WorkspaceRole; children: React.ReactElement }> = ({ role, children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!roleAtLeast(user?.role, role)) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 2 }}>
        <Card sx={{ maxWidth: 640, width: '100%', border: '1px solid rgba(14,165,233,0.30)' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Lock color="primary" />
              <Typography variant="h5" fontWeight={800}>
                Insufficient role
              </Typography>
              <Typography color="text.secondary">
                This area requires the <strong>{role}</strong> role. Your workspace role is{' '}
                <strong>{user?.role || 'viewer'}</strong>.
              </Typography>
              <Alert severity="info">Ask a workspace admin to grant access. Roles are enforced on the server, not only in the UI.</Alert>
              <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                Back to Command Center
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return children;
};

export default RequireRole;

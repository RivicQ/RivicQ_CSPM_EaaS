import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { roleAtLeast, WorkspaceRole } from '../auth/roles';
import { NEBULA } from '../theme/nebulaSurfaces';

const RequireRole: React.FC<{ role: WorkspaceRole; children: React.ReactElement }> = ({ role, children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!roleAtLeast(user?.role, role)) {
    return (
      <Box
        sx={{
          maxWidth: 420,
          p: 1.5,
          border: '1px solid',
          borderColor: NEBULA.line,
          borderRadius: 1,
          bgcolor: NEBULA.panel,
        }}
      >
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, mb: 0.5 }}>Insufficient role</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: NEBULA.muted, mb: 1, lineHeight: 1.4 }}>
          This area needs the {role} role. Your workspace role is {user?.role || 'viewer'}.
        </Typography>
        <Button size="small" onClick={() => navigate('/dashboard')} sx={{ textTransform: 'none' }}>
          Dashboard
        </Button>
      </Box>
    );
  }

  return children;
};

export default RequireRole;

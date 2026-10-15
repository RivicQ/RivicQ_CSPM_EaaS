import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { DEMO_STORAGE_KEY, isClientDemoToken } from '../demo/constants';

const hasStoredSession = (): boolean => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) return true;
    return localStorage.getItem(DEMO_STORAGE_KEY) === '1' || isClientDemoToken(token);
  } catch {
    return false;
  }
};

/**
 * Gate console routes. Also trusts a just-written localStorage session so
 * Home → demoLogin → /scanner handoff cannot lose the race against React state.
 */
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated && !hasStoredSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default RequireAuth;

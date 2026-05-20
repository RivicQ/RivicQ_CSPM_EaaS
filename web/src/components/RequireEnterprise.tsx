import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireEnterprise: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { edition } = useAuth();

  if (edition !== 'enterprise') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RequireEnterprise;

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';

import Layout from './layouts/Layout';
import RequireAuth from './components/RequireAuth';
import RequireEnterprise from './components/RequireEnterprise';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import EditionSwitcher from './pages/EditionSwitcher';
import Dashboard from './pages/Dashboard';
import AssetDetails from './pages/AssetDetails';
import Assets from './pages/Assets';
import Scanner from './pages/Scanner';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import DevSecOpsTools from './pages/DevSecOpsTools';
import { ErrorBoundary } from './components/ErrorBoundary';

import Inventory from './pages/enterprise/Inventory';
import Compliance from './pages/enterprise/Compliance';
import Quantum from './pages/enterprise/Quantum';
import MultiCloud from './pages/enterprise/MultiCloud';
import CNCF from './pages/enterprise/CNCF';
import TerraformIaC from './pages/enterprise/Terraform';

import IBMCloud from './pages/enterprise/IBMCloud';
import AWSCloud from './pages/enterprise/AWSCloud';
import QuantumAttestation from './pages/enterprise/QuantumAttestation';
import InfraDiscovery from './pages/InfraDiscovery';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/switcher'} replace />;
};

const LogoutRedirect: React.FC = () => {
  const { logout } = useAuth();

  React.useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  // Create a theme for the application
  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#d4af37',
      },
      secondary: {
        main: '#00c2ff',
      },
      background: {
        default: '#08111f',
        paper: '#101a2d',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
      },
    },
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyles
              styles={{
                '*': {
                  boxSizing: 'border-box',
                },
                '::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '::-webkit-scrollbar-track': {
                  background: '#f5f5f5',
                },
                '::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '4px',
                },
                '::-webkit-scrollbar-thumb:hover': {
                  background: '#a8a8a8',
                },
              }}
            />
            <BrowserRouter basename={process.env.PUBLIC_URL}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Navigate to="/login" replace />} />
                <Route path="/switcher" element={<EditionSwitcher />} />
                <Route path="/logout" element={<LogoutRedirect />} />
                <Route path="/" element={<RootRedirect />} />
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Layout />
                    </RequireAuth>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="assets/:id" element={<AssetDetails />} />
                  <Route path="scanner" element={<Scanner />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="tools" element={<DevSecOpsTools />} />

                  {/* Enterprise Routes */}
                  <Route path="enterprise/inventory" element={<RequireEnterprise><Inventory /></RequireEnterprise>} />
                  <Route path="enterprise/compliance" element={<RequireEnterprise><Compliance /></RequireEnterprise>} />
                  <Route path="enterprise/quantum" element={<RequireEnterprise><Quantum /></RequireEnterprise>} />
                  <Route path="enterprise/multicloud" element={<RequireEnterprise><MultiCloud /></RequireEnterprise>} />
                  <Route path="enterprise/cncf" element={<RequireEnterprise><CNCF /></RequireEnterprise>} />
                  <Route path="enterprise/terraform" element={<RequireEnterprise><TerraformIaC /></RequireEnterprise>} />
                  <Route path="enterprise/ibmcloud" element={<RequireEnterprise><IBMCloud /></RequireEnterprise>} />
                  <Route path="enterprise/awscloud" element={<RequireEnterprise><AWSCloud /></RequireEnterprise>} />
                  <Route path="enterprise/quantum-attestation" element={<RequireEnterprise><QuantumAttestation /></RequireEnterprise>} />
                  <Route path="demo/infrastructure" element={<InfraDiscovery />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
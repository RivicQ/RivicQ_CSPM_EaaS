import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';

import Layout from './layouts/Layout';
import { ThemeModeProvider } from './theme/ThemeContext';
import RequireAuth from './components/RequireAuth';
import RequireEnterprise from './components/RequireEnterprise';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
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
import CSPM from './pages/CSPM';

const LogoutRedirect: React.FC = () => {
  const { logout } = useAuth();

  React.useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const [mode, setMode] = React.useState<'light' | 'dark'>('light');
  const theme = React.useMemo(() => {
    // lazy load our centralized theme generator
    // to keep App composition clean
    const { getAppTheme } = require('./theme/theme');
    return getAppTheme(mode);
  }, [mode]);

  const toggleMode = React.useCallback(() => setMode((m) => (m === 'light' ? 'dark' : 'light')), []);

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
          <ThemeModeProvider mode={mode} toggleMode={toggleMode}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {/* expose theme toggle via theme context; Layout will render a toggle control */}
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
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/switcher" element={<EditionSwitcher />} />
                <Route path="/logout" element={<LogoutRedirect />} />
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
                  <Route path="enterprise/cspm" element={<RequireEnterprise><CSPM /></RequireEnterprise>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            </ThemeProvider>
          </ThemeModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
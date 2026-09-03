import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { MotionConfig } from 'framer-motion';
import designSystem from './theme/designSystem';

import Layout from './layouts/Layout';
import { ThemeModeProvider } from './theme/ThemeContext';
import RequireAuth from './components/RequireAuth';
import RequireEnterprise from './components/RequireEnterprise';
import RequireRole from './components/RequireRole';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { PageSkeleton } from './components/LoadingScreen';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import EditionSwitcher from './pages/EditionSwitcher';
import Dashboard from './pages/Dashboard';
import AssetDetails from './pages/AssetDetails';
import Assets from './pages/Assets';
import Scanner from './pages/Scanner';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import DevSecOpsTools from './pages/DevSecOpsTools';
import RivicQEcosystem from './pages/RivicQEcosystem';
import OAuthCallback from './pages/OAuthCallback';
import DemoWelcome from './pages/DemoWelcome';
import { DemoTrailProvider } from './context/DemoTrailContext';

import Inventory from './pages/enterprise/Inventory';
import Compliance from './pages/enterprise/Compliance';
import Quantum from './pages/enterprise/Quantum';
import MultiCloud from './pages/enterprise/MultiCloud';
import CNCF from './pages/enterprise/CNCF';
import TerraformIaC from './pages/enterprise/Terraform';

import IBMCloud from './pages/enterprise/IBMCloud';
import AWSCloud from './pages/enterprise/AWSCloud';
import QuantumAttestation from './pages/enterprise/QuantumAttestation';
import CloudPosture from './pages/enterprise/CloudPosture';
import ConformancePacks from './pages/enterprise/ConformancePacks';
import SecurityModulePage from './pages/enterprise/SecurityModule';
import PlatformModules from './pages/enterprise/PlatformModules';
import CSPM from './pages/CSPM';
import InfraDiscovery from './pages/InfraDiscovery';

const LogoutRedirect: React.FC = () => {
  const { logout } = useAuth();

  React.useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
};

const wrap = (Component: React.ComponentType<any>, name: string) => (
  <PageErrorBoundary name={name}>
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  </PageErrorBoundary>
);

const App: React.FC = () => {
  const [mode, setMode] = React.useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('rivicq.theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      /* ignore */
    }
    return 'light';
  });
  const theme = React.useMemo(() => {
    const { getAppTheme } = require('./theme/theme');
    return getAppTheme(mode);
  }, [mode]);

  const toggleMode = React.useCallback(() => {
    setMode((m) => {
      const next = m === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('rivicq.theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
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
              <MotionConfig reducedMotion="user">
              <CssBaseline />
            <GlobalStyles
              styles={(theme) => ({
                '*': { boxSizing: 'border-box' },
                '::selection': {
                  background: theme.palette.mode === 'dark' ? 'rgba(14,165,233,0.4)' : 'rgba(14,165,233,0.18)',
                  color: theme.palette.text.primary,
                },
                ':focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
                body: {
                  ...(theme.palette.mode === 'dark'
                    ? { background: designSystem.gradient.meshDark, backgroundColor: theme.palette.background.default }
                    : { background: designSystem.gradient.meshLight, backgroundColor: theme.palette.background.default }),
                },
                '::-webkit-scrollbar': { width: 8, height: 8 },
                '::-webkit-scrollbar-track': { background: 'transparent' },
                '::-webkit-scrollbar-thumb': {
                  background: theme.palette.divider,
                  borderRadius: 4,
                },
                '::-webkit-scrollbar-thumb:hover': {
                  background: theme.palette.text.disabled,
                },
              })}
            />
            <BrowserRouter basename={process.env.PUBLIC_URL || '/platform'}>
              <DemoTrailProvider>
              <Routes>
                <Route path="/" element={wrap(Home, 'Home')} />
                <Route path="/demo" element={wrap(DemoWelcome, 'Demo')} />
                <Route path="/login" element={wrap(Login, 'Login')} />
                <Route path="/register" element={wrap(Register, 'Register')} />
                <Route path="/forgot-password" element={wrap(ForgotPassword, 'ForgotPassword')} />
                <Route path="/reset-password" element={wrap(ResetPassword, 'ResetPassword')} />
                <Route path="/verify-email" element={wrap(VerifyEmail, 'VerifyEmail')} />
                <Route path="/oauth/callback" element={wrap(OAuthCallback, 'OAuthCallback')} />
                <Route path="/switcher" element={wrap(EditionSwitcher, 'EditionSwitcher')} />
                <Route path="/logout" element={<LogoutRedirect />} />
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Layout />
                    </RequireAuth>
                  }
                >
                  <Route path="dashboard" element={wrap(Dashboard, 'Dashboard')} />
                  <Route path="assets" element={wrap(Assets, 'Assets')} />
                  <Route path="assets/:id" element={wrap(AssetDetails, 'AssetDetails')} />
                  <Route path="scanner" element={wrap(Scanner, 'Scanner')} />
                  <Route path="cspm" element={wrap(CSPM, 'CSPM')} />
                  <Route path="analytics" element={wrap(Analytics, 'Analytics')} />
                  <Route path="settings" element={wrap(Settings, 'Settings')} />
                  <Route path="admin" element={<RequireRole role="admin">{wrap(Admin, 'Admin')}</RequireRole>} />
                  <Route path="tools" element={wrap(DevSecOpsTools, 'DevSecOpsTools')} />
                  <Route path="ecosystem" element={wrap(RivicQEcosystem, 'RivicQEcosystem')} />
                  <Route path="infrastructure" element={wrap(InfraDiscovery, 'InfraDiscovery')} />

                  <Route path="enterprise/inventory" element={<RequireEnterprise>{wrap(Inventory, 'Inventory')}</RequireEnterprise>} />
                  <Route path="enterprise/compliance" element={<RequireEnterprise>{wrap(Compliance, 'Compliance')}</RequireEnterprise>} />
                  <Route path="enterprise/quantum" element={<RequireEnterprise>{wrap(Quantum, 'Quantum')}</RequireEnterprise>} />
                  <Route path="enterprise/multicloud" element={<RequireEnterprise>{wrap(MultiCloud, 'MultiCloud')}</RequireEnterprise>} />
                  <Route path="enterprise/cncf" element={<RequireEnterprise>{wrap(CNCF, 'CNCF')}</RequireEnterprise>} />
                  <Route path="enterprise/terraform" element={<RequireEnterprise>{wrap(TerraformIaC, 'Terraform')}</RequireEnterprise>} />
                  <Route path="enterprise/ibmcloud" element={<RequireEnterprise>{wrap(IBMCloud, 'IBMCloud')}</RequireEnterprise>} />
                  <Route path="enterprise/awscloud" element={<RequireEnterprise>{wrap(AWSCloud, 'AWSCloud')}</RequireEnterprise>} />
                  <Route path="enterprise/quantum-attestation" element={<RequireEnterprise>{wrap(QuantumAttestation, 'QuantumAttestation')}</RequireEnterprise>} />
                  <Route path="enterprise/cloud-posture" element={<RequireEnterprise>{wrap(CloudPosture, 'CloudPosture')}</RequireEnterprise>} />
                  <Route path="enterprise/conformance-packs" element={<RequireEnterprise>{wrap(ConformancePacks, 'ConformancePacks')}</RequireEnterprise>} />
                  <Route path="enterprise/cspm" element={<RequireEnterprise>{wrap(CSPM, 'CSPM')}</RequireEnterprise>} />
                  <Route path="modules" element={<RequireEnterprise>{wrap(PlatformModules, 'PlatformModules')}</RequireEnterprise>} />
                  <Route path="modules/:moduleId" element={<RequireEnterprise>{wrap(SecurityModulePage, 'SecurityModule')}</RequireEnterprise>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </DemoTrailProvider>
            </BrowserRouter>
              </MotionConfig>
            </ThemeProvider>
          </ThemeModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

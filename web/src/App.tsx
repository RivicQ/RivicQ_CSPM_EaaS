import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { MotionConfig } from 'framer-motion';
import designSystem from './theme/designSystem';
import { getAppTheme } from './theme/theme';

import Layout from './layouts/Layout';
import { ThemeModeProvider } from './theme/ThemeContext';
import RequireAuth from './components/RequireAuth';
import RequireEnterprise from './components/RequireEnterprise';
import RequireRole from './components/RequireRole';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { PageSkeleton } from './components/LoadingScreen';
import { DemoTrailProvider } from './context/DemoTrailContext';

// Routes are code-split: each page is loaded on demand so the initial bundle
// stays small. Layout, auth providers and route guards stay eager because they
// are always needed to render the shell.
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const EditionSwitcher = lazy(() => import('./pages/EditionSwitcher'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AssetDetails = lazy(() => import('./pages/AssetDetails'));
const Assets = lazy(() => import('./pages/Assets'));
const Findings = lazy(() => import('./pages/Findings'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin'));
const DevSecOpsTools = lazy(() => import('./pages/DevSecOpsTools'));
const RivicQEcosystem = lazy(() => import('./pages/RivicQEcosystem'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const DemoWelcome = lazy(() => import('./pages/DemoWelcome'));

const Inventory = lazy(() => import('./pages/enterprise/Inventory'));
const Compliance = lazy(() => import('./pages/enterprise/Compliance'));
const Quantum = lazy(() => import('./pages/enterprise/Quantum'));
const MultiCloud = lazy(() => import('./pages/enterprise/MultiCloud'));
const CNCF = lazy(() => import('./pages/enterprise/CNCF'));
const TerraformIaC = lazy(() => import('./pages/enterprise/Terraform'));

const IBMCloud = lazy(() => import('./pages/enterprise/IBMCloud'));
const AWSCloud = lazy(() => import('./pages/enterprise/AWSCloud'));
const QuantumAttestation = lazy(() => import('./pages/enterprise/QuantumAttestation'));
const CloudPosture = lazy(() => import('./pages/enterprise/CloudPosture'));
const ConformancePacks = lazy(() => import('./pages/enterprise/ConformancePacks'));
const SecurityModulePage = lazy(() => import('./pages/enterprise/SecurityModule'));
const PlatformModules = lazy(() => import('./pages/enterprise/PlatformModules'));
const CSPM = lazy(() => import('./pages/CSPM'));
const InfraDiscovery = lazy(() => import('./pages/InfraDiscovery'));
const BomIntelligence = lazy(() => import('./pages/BomIntelligence'));
const DevSecOpsPipeline = lazy(() => import('./pages/DevSecOpsPipeline'));
const ApiSecurity = lazy(() => import('./pages/ApiSecurity'));
const AiSecurity = lazy(() => import('./pages/AiSecurity'));
const HsmQuantum = lazy(() => import('./pages/HsmQuantum'));
const GovernanceHub = lazy(() => import('./pages/GovernanceHub'));
const MigrationHub = lazy(() => import('./pages/MigrationHub'));
const ContactHub = lazy(() => import('./pages/ContactHub'));
const RequestDemo = lazy(() => import('./pages/RequestDemo'));
const Pricing = lazy(() => import('./pages/Pricing'));
const IBMPartner = lazy(() => import('./pages/IBMPartner'));
const CRMLeads = lazy(() => import('./pages/CRMLeads'));
const Product = lazy(() => import('./pages/Product'));
const CspmPublic = lazy(() => import('./pages/CspmPublic'));
const CbomPublic = lazy(() => import('./pages/CbomPublic'));
const PqcPublic = lazy(() => import('./pages/PqcPublic'));
const EnterprisePublic = lazy(() => import('./pages/EnterprisePublic'));
const SecurityPublic = lazy(() => import('./pages/SecurityPublic'));

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
      localStorage.setItem('rivicq.theme', 'dark');
    } catch {
      /* ignore */
    }
    return 'dark';
  });
  const theme = React.useMemo(() => getAppTheme(mode), [mode]);

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
                  background: theme.palette.mode === 'dark' ? 'rgba(124,58,237,0.45)' : 'rgba(109,40,217,0.22)',
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
                <Route path="/contact" element={wrap(ContactHub, 'ContactHub')} />
                <Route path="/request-demo" element={wrap(RequestDemo, 'RequestDemo')} />
                <Route path="/pricing" element={wrap(Pricing, 'Pricing')} />
                <Route path="/ibm" element={wrap(IBMPartner, 'IBMPartner')} />
                <Route path="/product" element={wrap(Product, 'Product')} />
                <Route path="/product/cspm" element={wrap(CspmPublic, 'CspmPublic')} />
                <Route path="/cbom" element={wrap(CbomPublic, 'CbomPublic')} />
                <Route path="/pqc" element={wrap(PqcPublic, 'PqcPublic')} />
                <Route path="/enterprise" element={wrap(EnterprisePublic, 'EnterprisePublic')} />
                <Route path="/security" element={wrap(SecurityPublic, 'SecurityPublic')} />
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
                  <Route path="findings" element={wrap(Findings, 'Findings')} />
                  <Route path="scanner" element={wrap(Scanner, 'Scanner')} />
                  <Route path="cspm" element={wrap(CSPM, 'CSPM')} />
                  <Route path="analytics" element={wrap(Analytics, 'Analytics')} />
                  <Route path="settings" element={wrap(Settings, 'Settings')} />
                  <Route path="admin" element={<RequireRole role="admin">{wrap(Admin, 'Admin')}</RequireRole>} />
                  <Route path="tools" element={wrap(DevSecOpsTools, 'DevSecOpsTools')} />
                  <Route path="ecosystem" element={wrap(RivicQEcosystem, 'RivicQEcosystem')} />
                  <Route path="infrastructure" element={wrap(InfraDiscovery, 'InfraDiscovery')} />
                  <Route path="bom" element={wrap(BomIntelligence, 'BomIntelligence')} />
                  <Route path="pipeline" element={wrap(DevSecOpsPipeline, 'DevSecOpsPipeline')} />
                  <Route path="security/api" element={wrap(ApiSecurity, 'ApiSecurity')} />
                  <Route path="security/ai" element={<RequireEnterprise layers>{wrap(AiSecurity, 'AiSecurity')}</RequireEnterprise>} />
                  <Route path="connectors/hsm" element={<RequireEnterprise layers>{wrap(HsmQuantum, 'HsmQuantum')}</RequireEnterprise>} />
                  <Route path="governance" element={wrap(GovernanceHub, 'GovernanceHub')} />
                  <Route path="migration" element={wrap(MigrationHub, 'MigrationHub')} />
                  <Route path="crm" element={<RequireRole role="admin">{wrap(CRMLeads, 'CRM')}</RequireRole>} />

                  <Route path="enterprise/inventory" element={<RequireEnterprise>{wrap(Inventory, 'Inventory')}</RequireEnterprise>} />
                  <Route path="enterprise/compliance" element={<RequireEnterprise>{wrap(Compliance, 'Compliance')}</RequireEnterprise>} />
                  <Route path="enterprise/quantum" element={<RequireEnterprise layers>{wrap(Quantum, 'Quantum')}</RequireEnterprise>} />
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

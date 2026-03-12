import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';

import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import AssetDetails from './pages/AssetDetails';
import Assets from './pages/Assets';
import Scanner from './pages/Scanner';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
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
import ProjectPreview from './pages/ProjectPreview';

const App: React.FC = () => {
  // Create a theme for the application
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#667eea',
      },
      secondary: {
        main: '#764ba2',
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
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="assets" element={<Assets />} />
                <Route path="assets/:id" element={<AssetDetails />} />
                <Route path="scanner" element={<Scanner />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                
                {/* Enterprise Routes */}
                <Route path="enterprise/inventory" element={<Inventory />} />
                <Route path="enterprise/compliance" element={<Compliance />} />
                <Route path="enterprise/quantum" element={<Quantum />} />
                <Route path="enterprise/multicloud" element={<MultiCloud />} />
                <Route path="enterprise/cncf" element={<CNCF />} />
                <Route path="enterprise/terraform" element={<TerraformIaC />} />
                <Route path="enterprise/ibmcloud" element={<IBMCloud />} />
                <Route path="enterprise/awscloud" element={<AWSCloud />} />
                <Route path="enterprise/quantum-attestation" element={<QuantumAttestation />} />
                <Route path="demo/infrastructure" element={<InfraDiscovery />} />
              </Route>
              {/* Project preview - marketing overview (outside Layout) */}
              <Route path="preview" element={<ProjectPreview />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
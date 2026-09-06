import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Landing from './pages/Landing';
import Discover from './pages/Discover';
import Onboard from './pages/Onboard';
import Command from './pages/Command';
import GraphPage from './pages/GraphPage';
import CryptoBom from './pages/CryptoBom';
import Pqc from './pages/Pqc';
import Attack from './pages/Attack';
import Analyst from './pages/Analyst';
import Automation from './pages/Automation';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import LegalPage from './pages/LegalPage';
import Posture from './pages/Posture';
import Cloud from './pages/Cloud';
import Assets from './pages/Assets';
import Vulns from './pages/Vulns';
import Identity from './pages/Identity';
import DataSec from './pages/DataSec';
import Workloads from './pages/Workloads';
import Kubernetes from './pages/Kubernetes';
import Sbom from './pages/Sbom';
import Certs from './pages/Certs';
import Secrets from './pages/Secrets';
import AiSec from './pages/AiSec';
import Compliance from './pages/Compliance';
import Integrations from './pages/Integrations';
import Reports from './pages/Reports';
import Hbom from './pages/Hbom';
import Ibom from './pages/Ibom';

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/discover" element={<Discover />} />
    <Route path="/onboard" element={<Onboard />} />
    <Route path="/legal" element={<LegalPage />} />
    <Route path="/app" element={<Shell />}>
      <Route index element={<Navigate to="command" replace />} />
      <Route path="command" element={<Command />} />
      <Route path="graph" element={<GraphPage />} />
      <Route path="cryptobom" element={<CryptoBom />} />
      <Route path="pqc" element={<Pqc />} />
      <Route path="attack" element={<Attack />} />
      <Route path="analyst" element={<Analyst />} />
      <Route path="automation" element={<Automation />} />
      <Route path="billing" element={<Checkout />} />
      <Route path="admin" element={<Admin />} />
      <Route path="posture" element={<Posture />} />
      <Route path="cloud" element={<Cloud />} />
      <Route path="assets" element={<Assets />} />
      <Route path="vulns" element={<Vulns />} />
      <Route path="identity" element={<Identity />} />
      <Route path="data" element={<DataSec />} />
      <Route path="workloads" element={<Workloads />} />
      <Route path="kubernetes" element={<Kubernetes />} />
      <Route path="sbom" element={<Sbom />} />
      <Route path="certs" element={<Certs />} />
      <Route path="secrets" element={<Secrets />} />
      <Route path="ai" element={<AiSec />} />
      <Route path="compliance" element={<Compliance />} />
      <Route path="integrations" element={<Integrations />} />
      <Route path="reports" element={<Reports />} />
      <Route path="hbom" element={<Hbom />} />
      <Route path="ibom" element={<Ibom />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;

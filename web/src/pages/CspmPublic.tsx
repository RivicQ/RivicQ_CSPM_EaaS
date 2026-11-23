import React from 'react';
import SitePage from './SitePage';
import { useAuth } from '../context/AuthContext';
import { PUBLIC_ENGINE_STATIC_COPY } from '../data/publicInfrastructure';

const CspmPublic: React.FC = () => {
  const { backendReachable } = useAuth();

  return (
    <SitePage
      eyebrow="CSPM · Cryptographic Security Posture Management"
      title="Know the cryptography that protects the estate."
      lede="CSPM here means cryptographic and cloud-risk discovery from scans you run — tenant-scoped jobs, a readable console, findings, and evidence. GitHub Pages does not claim a live attach to every customer cloud."
      primary={{ label: 'Run a public scan', to: '/' }}
      secondary={{ label: 'Open the console', to: '/login' }}
      notice={backendReachable ? undefined : PUBLIC_ENGINE_STATIC_COPY}
      engineNotice="scan"
      sectionEyebrow="CSPM product and console"
      sectionTitle="What operators read after a tenant-scoped scan finishes."
      diagramId="console"
      diagramKicker="CSPM · product overview"
      diagramTitle="Public overview → console identity → scan engine → CycloneDX evidence."
      blocks={[
        { title: 'Security score', body: 'Comes from a completed scan or a connected workspace. Pages does not invent a live estate score.' },
        { title: 'Asset inventory', body: 'Repositories, hosts, certificates, and declared cloud accounts when a connector exists, is licensed, and is configured.' },
        { title: 'Findings queue', body: 'Fingerprinted critical / high / medium findings with evidence, impact, and remediation. No unlabeled mock CVEs in production views.' },
        { title: 'Operator views', body: 'Console routes cover dashboard, assets, findings, scanner, BOM, governance, and role-gated admin work.' },
        { title: 'Identity & MFA', body: 'Session, tenant, and edition come from /auth/me. MFA setup and disable require a live API, not a client-side flag.' },
        { title: 'Enterprise attach', body: 'AWS, GCP, Azure, and IBM Cloud connectors fail closed without credentials, a valid license, and a configured database.' },
      ]}
    />
  );
};

export default CspmPublic;

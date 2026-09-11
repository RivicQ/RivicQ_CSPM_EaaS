import React from 'react';
import SitePage from './SitePage';

const CspmPublic: React.FC = () => (
  <SitePage
    eyebrow="CSPM"
    title="Know the cryptography that protects the estate."
    lede="Cloud Security Posture Management here means cryptographic and cloud-risk discovery from scans you run — not a claimed live attach to every customer cloud on GitHub Pages."
    primary={{ label: 'Run a public scan', to: '/' }}
    secondary={{ label: 'Open the console', to: '/login' }}
    engineNotice="scan"
    blocks={[
      { title: 'Security score', body: 'Comes from a completed scan or a connected workspace. Pages does not invent a live estate score.' },
      { title: 'Assets', body: 'Repositories, hosts, certificates, and declared cloud accounts when a connector exists.' },
      { title: 'Findings', body: 'Critical / high / medium with evidence, impact, and remediation. No unlabeled mock CVEs in production views.' },
      { title: 'Remediation', body: 'Operator queue in the console. Enterprise continuous monitoring is licensed, not granted by cloning GitHub.' },
    ]}
  />
);

export default CspmPublic;

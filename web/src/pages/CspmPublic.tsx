import React from 'react';
import SitePage from './SitePage';

const CspmPublic: React.FC = () => (
  <SitePage
    eyebrow="CSPM · Cryptographic Security Posture Management"
    title="Know the cryptography that protects the estate."
    lede="Here CSPM means cryptographic and cloud-risk discovery from scans you run — posture score, assets, and findings with evidence. GitHub Pages does not claim a live attach to every customer cloud."
    primary={{ label: 'Run a public scan', to: '/' }}
    secondary={{ label: 'Open the console', to: '/login' }}
    notice="On this static build the engine is not hosted. Use the labeled interactive demo, the CLI, or a deployed API (docs/RENDER.md)."
    engineNotice="scan"
    sectionEyebrow="CSPM console"
    sectionTitle="What operators read after a real scan finishes."
    diagramKicker="CSPM · operator workflow"
    diagramTitle="Discover assets → classify crypto risk → gate CI → report posture evidence."
    blocks={[
      { title: 'Security score', body: 'Comes from a completed scan or a connected workspace. Pages does not invent a live estate score.' },
      { title: 'Asset inventory', body: 'Repositories, hosts, certificates, and declared cloud accounts when a connector exists and is licensed.' },
      { title: 'Findings queue', body: 'Critical / high / medium with evidence, impact, and remediation. No unlabeled mock CVEs in production views.' },
      { title: 'Remediation', body: 'Operator work items in the console. Continuous monitoring and cloud CSPM packs stay on Enterprise.' },
      { title: 'Demo honesty', body: 'The interactive demo uses labeled sample data so you can learn the UI without faking a live cloud estate.' },
      { title: 'Enterprise attach', body: 'AWS, GCP, Azure, and IBM Cloud connectors activate only with credentials plus a commercial license.' },
    ]}
  />
);

export default CspmPublic;

import React from 'react';
import SitePage from './SitePage';

const CbomPublic: React.FC = () => (
  <SitePage
    eyebrow="CBOM · Cryptographic bill of materials"
    title="A cryptographic bill of materials you can export."
    lede="Community produces CBOM and SBOM from `rivicq scan` and the GitHub Action. QBOM, HBOM, AIBOM, and IBOM are Enterprise control-plane layers — never implied by a Pages screenshot."
    primary={{ label: 'Start free CBOM pilot', to: '/' }}
    secondary={{ label: 'Read the workflow', to: `${process.env.PUBLIC_URL || ''}/docs/index.html` }}
    notice="A CBOM is evidence of what was scanned. It is not an ISO, SOC 2, or DORA certification."
    engineNotice="scan"
    sectionEyebrow="CBOM pipeline"
    sectionTitle="From scan input to CycloneDX evidence operators can keep."
    diagramId="operator"
    diagramKicker="CBOM · operator workflow"
    diagramTitle="Inventory cryptography → classify algorithms → fail CI on BLOCK → export CycloneDX CBOM."
    blocks={[
      { title: 'CycloneDX export', body: 'GET /api/v1/scans/:id/cyclonedx when an API is running. The CLI writes local JSON evidence without a mailbox product.' },
      { title: 'Inventory fields', body: 'Algorithms, key sizes, libraries, and locations from the scan — not a guessed fleet inventory.' },
      { title: 'Policy gate', body: 'BLOCK / WARN in CI via the Community GitHub Action. Continuous monitoring is Enterprise.' },
      { title: 'SBOM companion', body: 'Software components ride with CBOM on Community so operators see crypto in context of dependencies.' },
      { title: 'Enterprise layers', body: 'QBOM, HBOM, AIBOM, and IBOM tiles stay locked until a licensed workspace is selected.' },
      { title: 'Honesty bar', body: 'RSA-2048 is classified (Shor family). It is not treated as automatically broken on every finding card.' },
    ]}
  />
);

export default CbomPublic;

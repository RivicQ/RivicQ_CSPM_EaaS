import React from 'react';
import SitePage from './SitePage';

const CbomPublic: React.FC = () => (
  <SitePage
    eyebrow="CBOM"
    title="A cryptographic bill of materials you can export."
    lede="Community produces CBOM and SBOM from rivicq scan and the GitHub Action. Five-BOM (QBOM, AIBOM, IBOM) is the Enterprise workspace model — not implied by a Pages demo."
    primary={{ label: 'Start free CBOM pilot', to: '/' }}
    secondary={{ label: 'Read the workflow', to: `${process.env.PUBLIC_URL || ''}/docs/index.html` }}
    blocks={[
      { title: 'CycloneDX', body: 'GET /api/v1/scans/:id/cyclonedx when an API is running. The CLI writes local evidence.' },
      { title: 'Inventory', body: 'Algorithms, key sizes, libraries, and locations from the scan — not a guessed fleet inventory.' },
      { title: 'Policy gate', body: 'BLOCK / WARN in CI. The Action is Community; continuous monitoring is Enterprise.' },
      { title: 'Honesty', body: 'A CBOM is evidence of what was scanned. It is not a certification.' },
    ]}
  />
);

export default CbomPublic;

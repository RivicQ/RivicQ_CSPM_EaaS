import React from 'react';
import SitePage from './SitePage';

const Product: React.FC = () => (
  <SitePage
    eyebrow="Product · RivicQ GmbH · Berlin"
    title="Cryptographic security posture, in one control plane."
    lede="RivicQ discovers cryptographic assets, cloud risks, and migration exposure. Community is the scan engine on this GitHub project. Enterprise is the licensed SaaS. GitHub Pages is static."
    primary={{ label: 'Start security assessment', to: '/' }}
    secondary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    blocks={[
      { title: 'CSPM', body: 'Posture from declared and scanned assets. Live cloud attach needs customer credentials and an Enterprise license.' },
      { title: 'CBOM', body: 'CycloneDX cryptographic bill of materials from repository and host scans. Not a silent live estate on Pages.' },
      { title: 'PQC readiness', body: 'Harvest-now exposure and ML-KEM / ML-DSA planning. Qiskit scores are a local taxonomy — not IBM Quantum hardware.' },
      { title: 'Crypto-agility', body: 'Inventory algorithms and keys so operators can plan replacements. RSA-2048 is classified, not auto-marked vulnerable.' },
      { title: 'AI security', body: 'AIBOM for models, datasets, and AI identities. EU AI Act names are mappings, not a product certification.' },
      { title: 'Governance', body: 'DORA, NIS2, NIST, ISO, PCI, SOC 2 operator mappings. Mappings are not audits or certifications.' },
    ]}
  />
);

export default Product;

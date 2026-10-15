import React from 'react';
import SitePage from './SitePage';

const Product: React.FC = () => (
  <SitePage
    eyebrow="Product · RivicQ GmbH · Berlin"
    title="Cryptographic security posture, in one control plane."
    lede="RivicQ invents nothing on GitHub Pages. Community scans what you point at and exports CBOM + SBOM evidence. Enterprise licenses the connectors, SSO, and continuous monitoring. Same engine, two editions."
    primary={{ label: 'Start security assessment', to: '/' }}
    secondary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    notice="Control mappings (DORA, NIS2, NIST, ISO, PCI) help operators organize work. They are not certifications or audit pass marks."
    engineNotice="scan"
    sectionEyebrow="Product layers"
    sectionTitle="What ships in Community vs what stays licensed."
    diagramId="architecture"
    diagramKicker="Product · architecture"
    diagramTitle="From a public target to CBOM evidence — then Enterprise for continuous monitoring."
    blocks={[
      { title: 'CSPM', body: 'Posture from scanned and declared assets. Live multi-cloud attach needs customer credentials and an Enterprise license.' },
      { title: 'CBOM + SBOM', body: 'CycloneDX cryptographic and software bills from repository and host scans. Pages never invents a silent live estate.' },
      { title: 'PQC readiness', body: 'Harvest-now exposure scoring and ML-KEM / ML-DSA planning language. Qiskit scores are a local taxonomy — not IBM Quantum hardware.' },
      { title: 'Crypto-agility', body: 'Inventory algorithms and keys so operators can plan replacements. RSA-2048 is classified, not auto-marked vulnerable.' },
      { title: 'AI security', body: 'AIBOM is Enterprise. Community CBOM still flags cryptography on AI serving stacks. EU AI Act names are mappings only.' },
      { title: 'Governance', body: 'Operator mappings for DORA, NIS2, NIST, ISO, PCI, and SOC 2. Mappings are not audits or certifications.' },
    ]}
  />
);

export default Product;

import React from 'react';
import SitePage from './SitePage';

const PqcPublic: React.FC = () => (
  <SitePage
    eyebrow="PQC · Post-quantum readiness"
    title="Plan the migration before harvest-now becomes decrypt-later."
    lede="RivicQ scores PQC exposure from scan intelligence. Those scores are a local taxonomy for operators — not IBM Quantum Runtime jobs and not hardware attestation."
    primary={{ label: 'Assess a public target', to: '/' }}
    secondary={{ label: 'PQC migration notes', to: `${process.env.PUBLIC_URL || ''}/docs/read.html?doc=PQC_MIGRATION.md` }}
    notice="Hybrid ML-KEM / ML-DSA language helps plan cut-over. Migration remains an operator decision, not an automatic key rotation."
    engineNotice="scan"
    sectionEyebrow="PQC planning"
    sectionTitle="Classical inventory first — then a cut-over plan you can defend."
    diagramKicker="PQC · operator workflow"
    diagramTitle="Classify classical crypto → score harvest-now exposure → plan hybrid PQC → report evidence."
    blocks={[
      { title: 'Classical inventory', body: 'RSA, ECDSA, and other algorithms found in the scan, with sizes and code or host locations.' },
      { title: 'ML-KEM / ML-DSA', body: 'Planning language for FIPS 203/204. Not a claim that your estate already migrated.' },
      { title: 'Crypto-agility', body: 'See what must change, then track remediations in the operator console with evidence links.' },
      { title: 'Qiskit taxonomy', body: 'Local scoring only. It does not submit jobs to IBM Quantum hardware from this product surface.' },
      { title: 'IBM Quantum connector', body: 'Optional Enterprise path. Stays off unless an operator configures official credentials.' },
      { title: 'Evidence export', body: 'Community ships JSON. Enterprise adds contracted evidence packs — still mappings, not certifications.' },
    ]}
  />
);

export default PqcPublic;

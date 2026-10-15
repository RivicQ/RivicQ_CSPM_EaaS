import React from 'react';
import SitePage from './SitePage';
import { archifyDocsHref } from '../theme/docsLink';

const PqcPublic: React.FC = () => (
  <SitePage
    eyebrow="Post-quantum security"
    title="Plan the migration before harvest-now becomes decrypt-later."
    lede="RivicQ scores PQC exposure from scan intelligence. Those scores are a local taxonomy. They are not IBM Quantum Runtime jobs and not a hardware attestation."
    primary={{ label: 'Assess a public target', to: '/' }}
    secondary={{ label: 'PQC migration notes', to: archifyDocsHref('pqc_migration') }}
    engineNotice="scan"
    blocks={[
      { title: 'Classical inventory', body: 'RSA, ECDSA, and other algorithms found in the scan, with sizes and locations.' },
      { title: 'ML-KEM / ML-DSA', body: 'Planning language for FIPS 203/204. Not a claim that your estate already migrated.' },
      { title: 'Crypto-agility', body: 'See what must change, then track remediations in the operator console.' },
      { title: 'IBM Quantum', body: 'Optional connector exists. It stays off unless an operator configures official credentials.' },
    ]}
  />
);

export default PqcPublic;

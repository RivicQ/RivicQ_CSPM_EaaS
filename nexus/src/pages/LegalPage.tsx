import React from 'react';
import { Link } from 'react-router-dom';

const LegalPage: React.FC = () => (
  <div className="landing">
    <h1 className="h1">Legal, editions, and public-safety notes</h1>
    <p className="lede">
      NEXUS Quantum Security Fabric is an original product identity in this repository. Community source is Apache-2.0.
      Enterprise connectors, SSO, and support require a written license. Cloning GitHub does not grant Enterprise.
    </p>
    <ul>
      <li>This Pages build is a <strong>labeled synthetic demo</strong>. It is not customer telemetry.</li>
      <li>Control mappings (NIST, ISO, SOC 2, PCI, GDPR, DORA, NIS2, BSI, CIS, FIPS) are <strong>not certifications</strong> of the product or of the operator.</li>
      <li>ML-KEM / ML-DSA / SLH-DSA appear as NIST-standardized concepts. No claim of a completed PQC migration.</li>
      <li>Secret <em>values</em>, private keys, and production tokens are not published. Tables show names and status only.</li>
      <li>Domain administration mailboxes are not public product contacts. See the repository LEGAL, PRIVACY, SECURITY, and TRADEMARKS files.</li>
      <li>Do not contribute customer data or secrets to this repository.</li>
    </ul>
    <div className="btn-row" style={{ marginTop: 16 }}>
      <a className="btn" href="/RivicQ_CSPM_EaaS/docs/LEGAL.md">LEGAL.md</a>
      <a className="btn" href="/RivicQ_CSPM_EaaS/docs/PRIVACY.md">PRIVACY.md</a>
      <a className="btn" href="/RivicQ_CSPM_EaaS/docs/SECURITY.md">SECURITY.md</a>
      <Link className="btn" to="/">Back</Link>
    </div>
  </div>
);

export default LegalPage;

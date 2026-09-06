import React from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { sbom } from '../data/catalog';

const Sbom: React.FC = () => (
  <div>
    <PageHeader title="Software bill of materials" lede="Packages, versions, licenses, CVEs, repositories, and the crypto library they pull in. Application → npm package → crypto library → RSA implementation → algorithm." />
    <DataTable
      caption="SBOM"
      exportName="nexus-sbom"
      rows={sbom}
      rowKey={(r) => `${r.pkg}-${r.app}`}
      columns={[
        { id: 'pkg', header: 'Package', get: (r) => r.pkg, mono: true },
        { id: 'version', header: 'Version', get: (r) => r.version, mono: true },
        { id: 'license', header: 'License', get: (r) => r.license },
        { id: 'cve', header: 'CVE', get: (r) => r.cve, mono: true },
        { id: 'app', header: 'Application', get: (r) => r.app },
        { id: 'crypto', header: 'CryptoBOM link', get: (r) => r.crypto },
        { id: 'repo', header: 'Repository', get: (r) => r.repo, mono: true },
      ]}
    />
    <div className="workflow" style={{ marginTop: 16 }}>
      {['ledger-web', 'node-forge 0.10.0', 'RSA implementation', 'CVE-2022-24771', 'SHA-1 / RSA risk'].map((s) => <em key={s}>{s}</em>)}
    </div>
  </div>
);

export default Sbom;

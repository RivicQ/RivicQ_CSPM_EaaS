import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { sbom } from '../data/catalog';
import { DOMAIN_NODE_IDS, SBOM_NODE_IDS } from '../data/graph';

const Sbom: React.FC = () => {
  const [pkg, setPkg] = useState(sbom[0]?.pkg);
  return (
    <div>
      <PageHeader title="Software bill of materials" lede="Each package has a supply-chain graph: application → library → crypto implementation → algorithm." />
      <GraphPanel
        focusIds={pkg ? SBOM_NODE_IDS[pkg] || DOMAIN_NODE_IDS.sbom : DOMAIN_NODE_IDS.sbom}
        label="SBOM graph"
        caption={`${pkg || 'SBOM'} graph`}
      />
      <DataTable
        caption="SBOM"
        exportName="fabric-sbom"
        rows={sbom}
        rowKey={(r) => `${r.pkg}-${r.app}`}
        onOpen={(r) => setPkg(r.pkg)}
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
};

export default Sbom;

import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { secrets } from '../data/catalog';
import { DOMAIN_NODE_IDS, SECRET_NODE_IDS } from '../data/graph';

const Secrets: React.FC = () => {
  const [name, setName] = useState<string | undefined>();
  const row = secrets.find((s) => s.name === name);
  return (
    <div>
      <PageHeader title="Secrets center" lede="Each secret reference has a graph of applications and vaults. Values, tokens, and private keys are never rendered — including in drawers, exports, and AI answers." />
      <GraphPanel
        focusIds={name ? SECRET_NODE_IDS[name] || DOMAIN_NODE_IDS.secrets : DOMAIN_NODE_IDS.secrets}
        label="Secret-reference graph"
        caption={`${name || 'Secrets'} graph`}
      />
      <DataTable
        caption="Secret references"
        exportName="fabric-secret-refs"
        rows={secrets}
        rowKey={(r) => r.name}
        onOpen={(r) => setName(r.name)}
        columns={[
          { id: 'name', header: 'Name', get: (r) => r.name, mono: true },
          { id: 'status', header: 'Status', get: (r) => r.status },
          { id: 'lastRotation', header: 'Last rotation', get: (r) => r.lastRotation },
          { id: 'apps', header: 'Applications', get: (r) => r.apps },
          { id: 'vault', header: 'Vault', get: (r) => r.vault },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
          { id: 'risk', header: 'Risk', get: (r) => r.risk, render: (r) => <Badge tone={r.risk}>{r.risk}</Badge> },
        ]}
      />
      {row && (
        <Drawer title={row.name} onClose={() => setName(undefined)}>
          <p className="lede">Value redacted. Investigate uses the reference graph only.</p>
          <div className="btn-row">
            <button type="button" className="btn" disabled>Rotate</button>
            <button type="button" className="btn danger" disabled>Revoke</button>
            <button type="button" className="btn" disabled>Replace</button>
            <button type="button" className="btn">Investigate</button>
          </div>
          <GraphPanel focusIds={SECRET_NODE_IDS[row.name]} label={`Secret graph ${row.name}`} caption={`${row.name} graph`} />
        </Drawer>
      )}
    </div>
  );
};

export default Secrets;

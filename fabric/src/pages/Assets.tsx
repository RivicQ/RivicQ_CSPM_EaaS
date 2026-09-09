import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import SecurityGraph from '../components/graph/SecurityGraph';
import { assets } from '../data/catalog';
import { ASSET_NODE_IDS } from '../data/graph';

const Assets: React.FC = () => {
  const [name, setName] = useState(assets[0]?.name);
  const focusIds = name ? ASSET_NODE_IDS[name] : undefined;
  return (
    <div>
      <PageHeader title="Assets" lede="Everything is an asset: cloud account, workload, package, certificate, key, identity, model, hardware, and data. Open a row to see its discovery graph." />
      <div className="surface" style={{ padding: 12, marginBottom: 12 }}>
        <p className="mono" style={{ color: 'var(--faint)', marginBottom: 8 }}>{name || 'Asset'} graph</p>
        <SecurityGraph focusIds={focusIds} hideUnfocused={Boolean(focusIds)} label="Asset discovery graph" />
      </div>
      <DataTable
        caption="Unified asset inventory"
        exportName="fabric-assets"
        rows={assets}
        rowKey={(r) => r.name}
        onOpen={(r) => setName(r.name)}
        columns={[
          { id: 'name', header: 'Asset', get: (r) => r.name, mono: true },
          { id: 'kind', header: 'Kind', get: (r) => r.kind },
          { id: 'env', header: 'Environment', get: (r) => r.env },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
          { id: 'criticality', header: 'Business criticality', get: (r) => r.criticality, render: (r) => <Badge tone={r.criticality === 'critical' ? 'critical' : 'warn'}>{r.criticality}</Badge> },
          { id: 'exposure', header: 'Exposure', get: (r) => r.exposure },
          { id: 'findings', header: 'Findings', get: (r) => r.findings },
        ]}
      />
    </div>
  );
};

export default Assets;

import React from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { assets } from '../data/catalog';

const Assets: React.FC = () => (
  <div>
    <PageHeader title="Assets" lede="Everything is an asset: cloud account, workload, package, certificate, key, identity, model, hardware, and data. Each has risk, owner, environment, dependencies, and findings." />
    <DataTable
      caption="Unified asset inventory"
      exportName="nexus-assets"
      rows={assets}
      rowKey={(r) => r.name}
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

export default Assets;

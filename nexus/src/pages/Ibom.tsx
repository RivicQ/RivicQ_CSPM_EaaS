import React from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { ibom } from '../data/catalog';

const Ibom: React.FC = () => (
  <div>
    <PageHeader title="Infrastructure bill of materials" lede="Cloud, Kubernetes, Terraform, networks, clusters, databases, storage, IAM, secrets, and certificates as one inventory." />
    <DataTable
      caption="IBOM"
      exportName="nexus-ibom"
      rows={ibom}
      rowKey={(r) => r.asset}
      columns={[
        { id: 'asset', header: 'Asset', get: (r) => r.asset, mono: true },
        { id: 'kind', header: 'Kind', get: (r) => r.kind },
        { id: 'cloud', header: 'Cloud', get: (r) => r.cloud },
        { id: 'owner', header: 'Owner', get: (r) => r.owner },
        { id: 'deps', header: 'Dependencies', get: (r) => r.deps },
      ]}
    />
  </div>
);

export default Ibom;

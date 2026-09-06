import React from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { workloads } from '../data/catalog';

const Workloads: React.FC = () => (
  <div>
    <PageHeader title="Workloads" lede="Containers and services in the Payments fixture. Public workloads inherit attack-path priority." />
    <DataTable
      caption="Workloads"
      exportName="nexus-workloads"
      rows={workloads}
      rowKey={(r) => r.name}
      columns={[
        { id: 'name', header: 'Workload', get: (r) => r.name, mono: true },
        { id: 'image', header: 'Image', get: (r) => r.image, mono: true },
        { id: 'cluster', header: 'Cluster', get: (r) => r.cluster },
        { id: 'public', header: 'Public', get: (r) => (r.public ? 'yes' : 'no'), render: (r) => <Badge tone={r.public ? 'critical' : 'healthy'}>{r.public ? 'public' : 'private'}</Badge> },
        { id: 'findings', header: 'Findings', get: (r) => r.findings },
        { id: 'owner', header: 'Owner', get: (r) => r.owner },
      ]}
    />
  </div>
);

export default Workloads;

import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { workloads } from '../data/catalog';
import { DOMAIN_NODE_IDS, WORKLOAD_NODE_IDS } from '../data/graph';

const Workloads: React.FC = () => {
  const [name, setName] = useState(workloads[0]?.name);
  return (
  <div>
    <PageHeader title="Workloads" lede="Each container and service has a runtime graph. Public workloads inherit attack-path priority." />
    <GraphPanel
      focusIds={name ? WORKLOAD_NODE_IDS[name] || DOMAIN_NODE_IDS.workloads : DOMAIN_NODE_IDS.workloads}
      label="Workload graph"
      caption={`${name || 'Workload'} graph`}
    />
    <DataTable
      caption="Workloads"
      exportName="fabric-workloads"
      rows={workloads}
      rowKey={(r) => r.name}
      onOpen={(r) => setName(r.name)}
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
};

export default Workloads;

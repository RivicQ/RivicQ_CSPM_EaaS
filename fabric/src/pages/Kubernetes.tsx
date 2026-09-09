import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { clusters } from '../data/catalog';
import { CLUSTER_NODE_IDS, DOMAIN_NODE_IDS } from '../data/graph';
import { useSession } from '../state/session';

const Kubernetes: React.FC = () => {
  const { mode } = useSession();
  const [name, setName] = useState(clusters[0]?.name);
  return (
    <div>
      <PageHeader title="Kubernetes" lede="Each cluster has a workload graph. Declared inventory only — no live kubeconfig attach in Community Pages." />
      <GraphPanel
        focusIds={name ? CLUSTER_NODE_IDS[name] || DOMAIN_NODE_IDS.kubernetes : DOMAIN_NODE_IDS.kubernetes}
        label="Kubernetes discovery graph"
        caption={`${name || 'Cluster'} graph`}
      />
      <DataTable
        caption="Clusters"
        exportName="fabric-kubernetes"
        rows={clusters}
        rowKey={(r) => r.name}
        onOpen={(r) => setName(r.name)}
        columns={[
          { id: 'name', header: 'Cluster', get: (r) => r.name, mono: true },
          { id: 'provider', header: 'Provider', get: (r) => r.provider },
          { id: 'nodes', header: 'Nodes', get: (r) => r.nodes },
          { id: 'privileged', header: 'Privileged pods', get: (r) => r.privileged },
          { id: 'public', header: 'Public services', get: (r) => r.public },
          { id: 'findings', header: 'Findings', get: (r) => r.findings },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
        ]}
      />
      {mode === 'engineer' && (
        <div className="surface" style={{ padding: 16, marginTop: 16 }}>
          <h2 className="h2">Engineering evidence</h2>
          <p className="lede">Declared manifests and Terraform module tf-pay-edge. Privilege findings map to CIS Kubernetes 5.2. Privileged apply is disabled on this demo.</p>
        </div>
      )}
    </div>
  );
};

export default Kubernetes;

import React from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { clusters } from '../data/catalog';
import { useSession } from '../state/session';

const Kubernetes: React.FC = () => {
  const { mode } = useSession();
  return (
    <div>
      <PageHeader title="Kubernetes" lede="Declared cluster inventory. No live kubeconfig attach in Community Pages." />
      <DataTable
        caption="Clusters"
        exportName="nexus-kubernetes"
        rows={clusters}
        rowKey={(r) => r.name}
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

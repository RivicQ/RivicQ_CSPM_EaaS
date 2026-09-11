import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { ibom } from '../data/catalog';
import { DOMAIN_NODE_IDS, IBOM_NODE_IDS } from '../data/graph';

const Ibom: React.FC = () => {
  const [asset, setAsset] = useState(ibom[0]?.asset);
  return (
    <div>
      <PageHeader title="Infrastructure bill of materials" lede="Each infrastructure object has a discovery graph: cloud, cluster, network, database, and the workloads it hosts." />
      <GraphPanel
        focusIds={asset ? IBOM_NODE_IDS[asset] || DOMAIN_NODE_IDS.ibom : DOMAIN_NODE_IDS.ibom}
        label="IBOM graph"
        caption={`${asset || 'Infrastructure'} graph`}
      />
      <DataTable
        caption="IBOM"
        exportName="fabric-ibom"
        rows={ibom}
        rowKey={(r) => r.asset}
        onOpen={(r) => setAsset(r.asset)}
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
};

export default Ibom;

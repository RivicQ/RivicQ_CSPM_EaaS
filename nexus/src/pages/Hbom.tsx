import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { hbom } from '../data/catalog';
import { DOMAIN_NODE_IDS, HBOM_NODE_IDS } from '../data/graph';

const Hbom: React.FC = () => {
  const [asset, setAsset] = useState(hbom[0]?.asset);
  return (
    <div>
      <PageHeader title="Hardware bill of materials" lede="Each hardware asset has a graph linking firmware, keys, certificates, and the workloads that depend on it." />
      <GraphPanel
        focusIds={asset ? HBOM_NODE_IDS[asset] || DOMAIN_NODE_IDS.hbom : DOMAIN_NODE_IDS.hbom}
        label="HBOM graph"
        caption={`${asset || 'Hardware'} graph`}
      />
      <DataTable
        caption="HBOM"
        exportName="fabric-hbom"
        rows={hbom}
        rowKey={(r) => r.asset}
        onOpen={(r) => setAsset(r.asset)}
        columns={[
          { id: 'asset', header: 'Asset', get: (r) => r.asset, mono: true },
          { id: 'type', header: 'Type', get: (r) => r.type },
          { id: 'firmware', header: 'Firmware', get: (r) => r.firmware, mono: true },
          { id: 'crypto', header: 'Crypto capability', get: (r) => r.crypto },
          { id: 'eol', header: 'End of life', get: (r) => r.eol },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
          { id: 'linked', header: 'Linked asset', get: (r) => r.linked },
        ]}
      />
    </div>
  );
};

export default Hbom;

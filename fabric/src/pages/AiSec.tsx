import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { aibom } from '../data/catalog';
import { AIBOM_NODE_IDS, DOMAIN_NODE_IDS } from '../data/graph';

const AiSec: React.FC = () => {
  const [model, setModel] = useState(aibom[0]?.model);
  return (
    <div>
      <PageHeader title="AI bill of materials" lede="Each model has a graph of datasets, endpoints, identities, and secret references. EU AI Act names are mappings, not a product certification." />
      <GraphPanel
        focusIds={model ? AIBOM_NODE_IDS[model] || DOMAIN_NODE_IDS.ai : DOMAIN_NODE_IDS.ai}
        label="AI security graph"
        caption={`${model || 'AIBOM'} graph`}
      />
      <DataTable
        caption="AIBOM"
        exportName="fabric-aibom"
        rows={aibom}
        rowKey={(r) => r.model}
        onOpen={(r) => setModel(r.model)}
        columns={[
          { id: 'model', header: 'Model', get: (r) => r.model, mono: true },
          { id: 'provider', header: 'Provider', get: (r) => r.provider },
          { id: 'dataset', header: 'Dataset', get: (r) => r.dataset },
          { id: 'endpoint', header: 'Endpoint', get: (r) => r.endpoint, mono: true },
          { id: 'identity', header: 'AI identity', get: (r) => r.identity, mono: true },
          { id: 'secret', header: 'Secret ref', get: (r) => r.secret, mono: true },
          { id: 'compliance', header: 'Mapping', get: (r) => r.compliance },
        ]}
      />
    </div>
  );
};

export default AiSec;

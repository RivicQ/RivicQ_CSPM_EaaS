import React from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { aibom } from '../data/catalog';

const AiSec: React.FC = () => (
  <div>
    <PageHeader title="AI bill of materials" lede="Models, datasets, providers, endpoints, agents, libraries, identities, and AI secret references. Connected into the enterprise security graph. EU AI Act names are mappings, not a product certification." />
    <DataTable
      caption="AIBOM"
      exportName="nexus-aibom"
      rows={aibom}
      rowKey={(r) => r.model}
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

export default AiSec;

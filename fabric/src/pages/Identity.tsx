import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { identities } from '../data/catalog';
import { DOMAIN_NODE_IDS, IDENTITY_NODE_IDS } from '../data/graph';

const Identity: React.FC = () => {
  const [principal, setPrincipal] = useState(identities[0]?.principal);
  return (
    <div>
      <PageHeader title="Identity security" lede="Users, service accounts, and roles. Each principal has an identity graph. Privileged unused roles are treated as high risk. No live directory sync on Pages." />
      <GraphPanel
        focusIds={principal ? IDENTITY_NODE_IDS[principal] || DOMAIN_NODE_IDS.identity : DOMAIN_NODE_IDS.identity}
        label="Identity discovery graph"
        caption={`${principal || 'Identity'} graph`}
      />
      <DataTable
        caption="Identities"
        exportName="fabric-identity"
        rows={identities}
        rowKey={(r) => r.principal}
        onOpen={(r) => setPrincipal(r.principal)}
        columns={[
          { id: 'principal', header: 'Principal', get: (r) => r.principal, mono: true },
          { id: 'type', header: 'Type', get: (r) => r.type },
          { id: 'privilege', header: 'Privilege', get: (r) => r.privilege },
          { id: 'unused', header: 'Unused', get: (r) => (r.unused ? 'yes' : 'no') },
          { id: 'risk', header: 'Risk', get: (r) => r.risk, render: (r) => <Badge tone={r.risk}>{r.risk}</Badge> },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
        ]}
      />
    </div>
  );
};

export default Identity;

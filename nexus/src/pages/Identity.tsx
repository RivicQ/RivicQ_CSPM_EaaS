import React from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { identities } from '../data/catalog';

const Identity: React.FC = () => (
  <div>
    <PageHeader title="Identity security" lede="Users, service accounts, and roles. Privileged unused roles are treated as high risk. No live directory sync on Pages." />
    <DataTable
      caption="Identities"
      exportName="nexus-identity"
      rows={identities}
      rowKey={(r) => r.principal}
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

export default Identity;

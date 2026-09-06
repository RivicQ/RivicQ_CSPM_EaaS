import React from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { rbac, roles } from '../data/catalog';
import { useSession } from '../state/session';

const Admin: React.FC = () => {
  const { role, setRole, tenant } = useSession();
  return (
    <div>
      <PageHeader title="Administration" lede="Organization → tenant → business unit → environment → account → project → team → user → role. Permissions operate at organization, tenant, environment, asset, module, and action." />
      <div className="kvs" style={{ marginBottom: 16 }}>
        <span>Organization</span><b>{tenant.org} (fixture)</b>
        <span>Context</span><b>{tenant.unit} · {tenant.env} · {tenant.cloud} {tenant.region}</b>
        <span>Active role</span>
        <b>
          <select className="btn" value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="Active role">
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </b>
        <span>Secrets</span><b>References only. Values never stored in this Community demo.</b>
      </div>
      <DataTable
        caption="RBAC matrix"
        exportName="nexus-rbac"
        rows={rbac}
        rowKey={(r) => r.role}
        columns={[
          { id: 'role', header: 'Role', get: (r) => r.role },
          { id: 'org', header: 'Organization', get: (r) => r.org },
          { id: 'tenant', header: 'Tenant', get: (r) => r.tenant },
          { id: 'module', header: 'Module', get: (r) => r.module },
          { id: 'action', header: 'Action', get: (r) => r.action },
        ]}
      />
    </div>
  );
};

export default Admin;

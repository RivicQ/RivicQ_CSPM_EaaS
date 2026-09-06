import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import PageHeader from '../components/ui/PageHeader';
import { certificates } from '../data/catalog';

const buckets = ['90 days', '60 days', '30 days', '14 days', '7 days', 'Expired'];

const Certs: React.FC = () => {
  const [name, setName] = useState<string | undefined>();
  const row = certificates.find((c) => c.name === name);
  return (
    <div>
      <PageHeader title="Certificate inventory" lede="PKI lifecycle: inventory, expiration timeline, renew / rotate / revoke / replace. Destructive actions are approval-gated and disabled on Pages." />
      <div className="timeline" style={{ marginBottom: 16 }}>
        {buckets.map((b) => {
          const n = certificates.filter((c) => c.status === b).length;
          return (
            <div className="row" key={b}>
              <span className="mono">{b}</span>
              <div className="bar" aria-hidden="true">
                <div className="fill" style={{ width: `${Math.max(8, n * 28)}%`, background: b === 'Expired' ? 'var(--critical)' : 'var(--warn)' }} />
              </div>
            </div>
          );
        })}
      </div>
      <DataTable
        caption="Certificates"
        exportName="nexus-certificates"
        rows={certificates}
        rowKey={(r) => r.name}
        onOpen={(r) => setName(r.name)}
        columns={[
          { id: 'name', header: 'Certificate', get: (r) => r.name, mono: true },
          { id: 'issuer', header: 'Issuer', get: (r) => r.issuer },
          { id: 'algo', header: 'Algorithm', get: (r) => r.algo },
          { id: 'keySize', header: 'Key size', get: (r) => r.keySize },
          { id: 'days', header: 'Days', get: (r) => r.days },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
          { id: 'env', header: 'Environment', get: (r) => r.env },
          { id: 'risk', header: 'Risk', get: (r) => r.risk, render: (r) => <Badge tone={r.risk === 'medium' ? 'warn' : r.risk}>{r.risk}</Badge> },
        ]}
      />
      {row && (
        <Drawer title={row.name} onClose={() => setName(undefined)}>
          <div className="kvs">
            <span>Issuer</span><b>{row.issuer}</b>
            <span>Algorithm</span><b>{row.algo}</b>
            <span>Status</span><b>{row.status}</b>
            <span>Private key</span><b>Never displayed</b>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" disabled>Renew</button>
            <button type="button" className="btn" disabled>Rotate</button>
            <button type="button" className="btn danger" disabled>Revoke</button>
            <button type="button" className="btn">Automate (playbook)</button>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default Certs;

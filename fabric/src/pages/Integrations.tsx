import React from 'react';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { integrations } from '../data/catalog';

const Integrations: React.FC = () => (
  <div>
    <PageHeader title="Integrations" lede="Cloud, VCS, identity, vault, and HSM connectors. Community Pages never attaches live customer credentials." />
    <div className="grid grid-2">
      {integrations.map((i) => (
        <div key={i.name} className="surface" style={{ padding: 16 }}>
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <strong>{i.name}</strong>
            <Badge tone="warn">{i.status}</Badge>
          </div>
          <p className="lede">{i.note}</p>
          <button type="button" className="btn" disabled>Connect</button>
        </div>
      ))}
    </div>
  </div>
);

export default Integrations;

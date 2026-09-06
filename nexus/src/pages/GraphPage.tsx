import React, { useState } from 'react';
import SecurityGraph from '../components/graph/SecurityGraph';
import Drawer from '../components/ui/Drawer';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import { nodeDetails, nodes } from '../data/graph';

const GraphPage: React.FC = () => {
  const [id, setId] = useState<string | undefined>('app');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const node = nodes.find((n) => n.id === id);
  const detail = (id && nodeDetails[id]) || nodeDetails.app;
  const select = (next: string) => {
    setId(next);
    setOpen(true);
  };
  return (
    <div>
      <PageHeader title="Enterprise security graph" lede="What is exposed? What depends on what? What breaks if this asset is compromised? Which cryptographic assets are quantum-vulnerable? Magenta is cryptographic dependence. Red is attack path." />
      <div className="surface" style={{ padding: 12, marginTop: 12 }}>
        <SecurityGraph selected={id} onSelect={select} />
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="data">
          <caption className="visually-hidden">Accessible graph alternative</caption>
          <thead>
            <tr><th>Asset</th><th>Kind</th><th>Risk lens</th></tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id}>
                <td><button type="button" className="th-btn" onClick={() => select(n.id)}>{n.label}</button></td>
                <td>{n.kind}</td>
                <td>{n.risk || 'nominal'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && node && (
        <Drawer title={node.label} onClose={() => setOpen(false)}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={['overview', 'risk', 'config', 'network', 'identity', 'vulns', 'secrets', 'data', 'crypto', 'compliance', 'activity'].map((t) => ({ id: t, label: t }))}
          />
          <p>{detail[tab as keyof typeof detail] || detail.overview}</p>
        </Drawer>
      )}
    </div>
  );
};

export default GraphPage;

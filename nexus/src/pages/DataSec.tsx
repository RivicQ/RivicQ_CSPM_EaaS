import React from 'react';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import GraphPanel from '../components/graph/GraphPanel';
import { hndl } from '../data/catalog';
import { DOMAIN_NODE_IDS } from '../data/graph';

const DataSec: React.FC = () => (
  <div>
    <PageHeader title="Data security" lede="Harvest-now-decrypt-later is a DATA × CRYPTOGRAPHY × RETENTION problem. The graph shows the card-hold archive behind the payments database." />
    <GraphPanel focusIds={DOMAIN_NODE_IDS.data} label="Data-security graph" caption="card-hold harvest-now graph" />
    <div className="table-wrap">
      <table className="data">
        <caption className="visually-hidden">HNDL risk matrix</caption>
        <thead>
          <tr>
            <th>Data</th><th>Business value</th><th>Cryptography</th><th>Retention</th><th>Exposure window</th>
          </tr>
        </thead>
        <tbody>
          {hndl.map((r) => (
            <tr key={r.data}>
              <td>{r.data}</td>
              <td>{r.value}</td>
              <td className="mono">{r.crypto}</td>
              <td>{r.retention}</td>
              <td><Badge tone={r.window === 'Critical' ? 'critical' : r.window === 'High' ? 'warn' : 'info'}>{r.window}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="surface" style={{ padding: 16, marginTop: 16 }}>
      <h2 className="h2">Why this is different from a CSPM score</h2>
      <p className="lede">A public bucket is a cloud finding. A seven-year card-hold archive behind RSA-1024 is a cryptographic time-bomb. The fabric graph connects both.</p>
    </div>
  </div>
);

export default DataSec;

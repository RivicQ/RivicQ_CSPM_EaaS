import React from 'react';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { hndl } from '../data/catalog';

const DataSec: React.FC = () => (
  <div>
    <PageHeader title="Data security" lede="Harvest-now-decrypt-later is a DATA × CRYPTOGRAPHY × RETENTION problem. Long-lived high-value archives behind weak or quantum-vulnerable cryptography have the largest exposure window." />
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
      <p className="lede">A public bucket is a cloud finding. A seven-year card-hold archive behind RSA-1024 is a cryptographic time-bomb. NEXUS connects both to the same graph.</p>
    </div>
  </div>
);

export default DataSec;

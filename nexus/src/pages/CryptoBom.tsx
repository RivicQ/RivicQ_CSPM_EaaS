import React, { useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import GraphPanel from '../components/graph/GraphPanel';
import { cryptoRows } from '../data/catalog';
import { CRYPTO_ASSET_NODE_IDS, DOMAIN_NODE_IDS } from '../data/graph';

const CryptoBom: React.FC = () => {
  const [q, setQ] = useState('');
  const [asset, setAsset] = useState(cryptoRows[0]?.asset);
  const rows = useMemo(
    () => cryptoRows.filter((r) => `${r.asset} ${r.algorithm} ${r.application}`.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  return (
    <div>
      <h1 className="h1">Cryptographic inventory</h1>
      <p className="lede">Each crypto asset has a graph: algorithm, key, certificate, protocol, and the application that uses it. RSA-2048 is classified, not auto-vulnerable.</p>
      <GraphPanel
        focusIds={asset ? CRYPTO_ASSET_NODE_IDS[asset] || DOMAIN_NODE_IDS.crypto : DOMAIN_NODE_IDS.crypto}
        label="Cryptography graph"
        caption={`${asset || 'CryptoBOM'} graph`}
      />
      <input className="btn" style={{ margin: '12px 0', width: 'min(420px, 100%)' }} placeholder="Search assets" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Asset</th><th>Algorithm</th><th>Key</th><th>Protocol</th><th>Location</th><th>Application</th>
              <th>Env</th><th>Classical</th><th>Quantum</th><th>Compliance</th><th>Last seen</th><th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.asset} onClick={() => setAsset(r.asset)} style={{ cursor: 'pointer' }}>
                <td className="mono">{r.asset}</td>
                <td>{r.algorithm}</td>
                <td>{r.keySize}</td>
                <td>{r.protocol}</td>
                <td className="mono">{r.location}</td>
                <td>{r.application}</td>
                <td>{r.environment}</td>
                <td><Badge tone={r.risk}>{r.risk}</Badge></td>
                <td><Badge tone={r.quantum === 'low' ? 'healthy' : r.quantum === 'high' || r.quantum === 'critical' ? 'quantum' : 'warn'}>{r.quantum}</Badge></td>
                <td>{r.compliance}</td>
                <td>{r.lastSeen}</td>
                <td>{r.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CryptoBom;

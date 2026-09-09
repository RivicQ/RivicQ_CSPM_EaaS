import React, { useState } from 'react';
import SecurityGraph from '../components/graph/SecurityGraph';
import Drawer from '../components/ui/Drawer';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import {
  ATTACK_NODE_IDS,
  CRYPTO_NODE_IDS,
  FINDING_NODE_IDS,
  discoveryNodeIds,
  DISCOVERY_STAGES,
  nodeDetails,
  nodes,
  relatedFindingIds,
} from '../data/graph';
import { findings } from '../data/catalog';

const lenses = [
  { id: 'all', label: 'Full estate' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'detection', label: 'Detections' },
  { id: 'attack', label: 'Attack path' },
  { id: 'crypto', label: 'Cryptography' },
];

const GraphPage: React.FC = () => {
  const [id, setId] = useState<string | undefined>('app');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [lens, setLens] = useState('all');
  const [finding, setFinding] = useState(findings[0]?.id || 'QSF-1042');
  const node = nodes.find((n) => n.id === id);
  const detail = (id && nodeDetails[id]) || nodeDetails.app;
  const related = id ? relatedFindingIds(id) : [];
  const focusIds =
    lens === 'discovery' ? discoveryNodeIds(DISCOVERY_STAGES.length) :
    lens === 'detection' ? (FINDING_NODE_IDS[finding] || []) :
    lens === 'attack' ? ATTACK_NODE_IDS :
    lens === 'crypto' ? CRYPTO_NODE_IDS :
    undefined;
  const select = (next: string) => {
    setId(next);
    setOpen(true);
  };
  return (
    <div>
      <PageHeader
        title="Enterprise security graph"
        lede="Switch the lens: discovery inventory, each detection, attack path, or cryptographic dependence. Magenta is cryptographic. Red is attack path. Labeled Northbridge fixture only."
      />
      <div className="btn-row" style={{ marginTop: 12 }} role="tablist" aria-label="Graph lens">
        {lenses.map((l) => (
          <button
            key={l.id}
            type="button"
            className={lens === l.id ? 'btn primary' : 'btn'}
            onClick={() => setLens(l.id)}
            aria-pressed={lens === l.id}
          >
            {l.label}
          </button>
        ))}
        {lens === 'detection' && (
          <label>
            <span className="visually-hidden">Finding</span>
            <select className="btn" value={finding} onChange={(e) => setFinding(e.target.value)} aria-label="Detection">
              {findings.map((f) => (
                <option key={f.id} value={f.id}>{f.id} · {f.title}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="surface" style={{ padding: 12, marginTop: 12 }}>
        <p className="mono" style={{ color: 'var(--faint)', marginBottom: 8 }}>
          {lens === 'detection' ? `${finding} subgraph` : `${lens} graph`} · {(focusIds || nodes.map((n) => n.id)).length} focused nodes
        </p>
        <SecurityGraph
          selected={id}
          onSelect={select}
          focusIds={focusIds}
          hideUnfocused={lens !== 'all'}
          label={`${lens} security graph`}
        />
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="data">
          <caption className="visually-hidden">Accessible graph alternative</caption>
          <thead>
            <tr><th>Asset</th><th>Kind</th><th>Risk lens</th><th>Linked detections</th></tr>
          </thead>
          <tbody>
            {(focusIds ? nodes.filter((n) => focusIds.includes(n.id)) : nodes).map((n) => (
              <tr key={n.id}>
                <td><button type="button" className="th-btn" onClick={() => select(n.id)}>{n.label}</button></td>
                <td>{n.kind}</td>
                <td>{n.risk || 'nominal'}</td>
                <td className="mono">{relatedFindingIds(n.id).join(', ') || '—'}</td>
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
          {related.length > 0 && (
            <p className="mono" style={{ marginTop: 12 }}>Detections: {related.join(', ')}</p>
          )}
        </Drawer>
      )}
    </div>
  );
};

export default GraphPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityGraph from '../components/graph/SecurityGraph';
import { nodes } from '../data/graph';

const steps = [
  'Connecting AWS (read-only, demo fixture)…',
  'Connecting GitHub (public metadata only)…',
  'Discovering Kubernetes workloads…',
  'Discovering certificates…',
  'Discovering secret references (names only)…',
  'Discovering cryptographic assets…',
  'Building SBOM…',
  'Building CryptoBOM…',
  'Building infrastructure graph…',
  'Mapping controls (not certifications)…',
  'Calculating risk…',
];

const Discover: React.FC = () => {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= steps.length) return;
    const t = window.setTimeout(() => setI((n) => n + 1), 420);
    return () => window.clearTimeout(t);
  }, [i]);
  const done = i >= steps.length;
  const visible = Math.min(nodes.length, Math.max(3, Math.ceil((i / steps.length) * nodes.length)));
  return (
    <div className="landing">
      <h1 className="h1">Initial discovery</h1>
      <p className="lede">Progressive inventory of the labeled Northbridge fixture. No live cloud credentials are used on GitHub Pages.</p>
      <ol style={{ color: 'var(--muted)', paddingLeft: 18 }}>
        {steps.map((s, idx) => (
          <li key={s} style={{ opacity: idx <= i ? 1 : 0.35 }}>{s}</li>
        ))}
      </ol>
      <div className="surface" style={{ padding: 12, marginTop: 20 }}>
        <p className="mono" style={{ color: 'var(--faint)' }}>{visible} / {nodes.length} graph nodes revealed</p>
        <SecurityGraph />
      </div>
      {done && (
        <div style={{ marginTop: 24 }}>
          <h2 className="h2">Your security graph</h2>
          <p className="lede">Cloud, identity, application, cryptography, AI, and data are now one fabric. Continue to posture and the first remediation plan.</p>
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => nav('/app/command')}>Continue to command center</button>
            <button type="button" className="btn" onClick={() => nav('/app/analyst')}>Create first remediation plan</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;

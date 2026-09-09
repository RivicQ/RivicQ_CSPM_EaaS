import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityGraph from '../components/graph/SecurityGraph';
import { DISCOVERY_STAGES, discoveryNodeIds, nodes } from '../data/graph';

const Discover: React.FC = () => {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= DISCOVERY_STAGES.length) return;
    const t = window.setTimeout(() => setI((n) => n + 1), 420);
    return () => window.clearTimeout(t);
  }, [i]);
  const done = i >= DISCOVERY_STAGES.length;
  const visibleIds = discoveryNodeIds(Math.min(i + 1, DISCOVERY_STAGES.length));
  return (
    <div className="landing">
      <h1 className="h1">Initial discovery</h1>
      <p className="lede">Each step adds nodes to the security graph. Progressive inventory of the labeled Northbridge fixture. No live cloud credentials are used on GitHub Pages.</p>
      <ol style={{ color: 'var(--muted)', paddingLeft: 18 }}>
        {DISCOVERY_STAGES.map((s, idx) => (
          <li key={s.label} style={{ opacity: idx <= i ? 1 : 0.35 }}>{s.label}</li>
        ))}
      </ol>
      <div className="surface" style={{ padding: 12, marginTop: 20 }}>
        <p className="mono" style={{ color: 'var(--faint)' }}>{visibleIds.length} / {nodes.length} graph nodes revealed</p>
        <SecurityGraph
          focusIds={visibleIds}
          hideUnfocused
          label="Discovery graph"
        />
      </div>
      {done && (
        <div style={{ marginTop: 24 }}>
          <h2 className="h2">Your security graph</h2>
          <p className="lede">Cloud, identity, application, cryptography, AI, and data are now one fabric. Continue to posture, detections, or the first remediation plan.</p>
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => nav('/app/command')}>Continue to command center</button>
            <button type="button" className="btn" onClick={() => nav('/app/graph')}>Open detection graphs</button>
            <button type="button" className="btn" onClick={() => nav('/app/analyst')}>Create first remediation plan</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discover;

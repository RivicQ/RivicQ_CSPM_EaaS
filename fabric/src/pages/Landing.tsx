import React from 'react';
import { useNavigate } from 'react-router-dom';
import Mark from '../brand/Mark';
import SecurityGraph from '../components/graph/SecurityGraph';

const Landing: React.FC = () => {
  const nav = useNavigate();
  return (
    <div className="landing">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Mark size={36} />
        <div>
          <strong style={{ fontFamily: 'var(--font)', letterSpacing: '-0.02em', fontSize: '1.125rem' }}>RivicQ Graph</strong>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Labeled Community demo · synthetic estate only</div>
        </div>
      </div>
      <div className="hero-eyebrow">
        <b>Graph</b>
        <span>Cryptographic Security Posture Management · Berlin</span>
      </div>
      <h1 className="hero-title">
        See the estate once.<br />
        Leave with a map <em>you can trust.</em>
      </h1>
      <p className="lede">
        RivicQ Graph is a labeled demo of how CBOM, cloud, identity, and findings connect.
        Nodes and edges are synthetic Northbridge fixtures — not a customer estate and not a certification.
        Use it to understand the client path: discover → mitigate → report.
      </p>
      <div className="steps" aria-label="Client architecture">
        <span>01 Discover</span>
        <span>02 Mitigate</span>
        <span>03 Report</span>
      </div>
      <p className="lede" style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
        Same client path as the console and the Archify operator map.
        Firmware stays static metadata — not binary reverse engineering.
        {' '}
        <a href="../archify/site/index.html#diagrams">Open the Archify gallery</a>.
      </p>
      <div className="btn-row" style={{ marginBottom: 28 }}>
        <button type="button" className="btn primary" onClick={() => nav('/app/graph')}>Open security graph</button>
        <button type="button" className="btn" onClick={() => nav('/discover')}>Start discovery</button>
        <button type="button" className="btn" onClick={() => nav('/app/command')}>Open overview</button>
        <button type="button" className="btn" onClick={() => nav('/legal')}>Legal &amp; editions</button>
      </div>
      <div className="surface graph-plate">
        <h2 className="h2">Enterprise security graph</h2>
        <p className="lede">
          Cloud, applications, cryptography, identity, and AI as one readable system.
          Magenta marks cryptographic dependence. Red marks attack-path pressure. Every node is labeled DEMO data.
        </p>
        <SecurityGraph />
      </div>
    </div>
  );
};

export default Landing;

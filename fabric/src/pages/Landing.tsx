import React from 'react';
import { useNavigate } from 'react-router-dom';
import SecurityGraph from '../components/graph/SecurityGraph';
import PublicBar from '../components/layout/PublicBar';

const Landing: React.FC = () => {
  const nav = useNavigate();
  return (
    <div className="landing">
      <PublicBar />
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
        Use it to understand the operator path: discover → classify → gate → report.
      </p>
      <div className="steps" aria-label="Product loop">
        <span>01 Discover</span>
        <span>02 Assess</span>
        <span>03 Remediate</span>
        <span>04 Migrate</span>
        <span>05 Report</span>
      </div>
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

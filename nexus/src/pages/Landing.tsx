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
          <strong style={{ letterSpacing: '0.12em' }}>NEXUS</strong>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Quantum Security Fabric</div>
        </div>
      </div>
      <p style={{ color: 'var(--intel)', letterSpacing: '0.08em', fontSize: 12, textTransform: 'uppercase' }}>The operating system for enterprise security</p>
      <h1 className="hero-title">See every asset.<br />Understand every risk.<br />Secure what comes next.</h1>
      <p className="lede">
        Unified security graph for cloud, identity, software, cryptography, AI, and compliance.
        A misconfiguration is never just a misconfiguration — it is a workload, an identity, a dependency, a certificate, a dataset, a regulation, and a business impact.
        This GitHub Pages build is a labeled Community demo with synthetic data. It is not a certification and does not collect payment or production secrets.
      </p>
      <div className="steps" aria-label="Product loop">
        <span>Discover</span><span>Assess</span><span>Remediate</span><span>Migrate</span><span>Monitor</span>
      </div>
      <div className="btn-row" style={{ marginBottom: 28 }}>
        <button type="button" className="btn primary" onClick={() => nav('/discover')}>Start discovery</button>
        <button type="button" className="btn" onClick={() => nav('/onboard')}>Create organization</button>
        <button type="button" className="btn" onClick={() => nav('/app/command')}>Open command center</button>
        <button type="button" className="btn" onClick={() => nav('/legal')}>Legal &amp; editions</button>
      </div>
      <div className="surface" style={{ padding: 16 }}>
        <h2 className="h2">Enterprise security graph</h2>
        <p className="lede" style={{ marginBottom: 12 }}>Cloud, applications, cryptography, identity, and AI as one system. Nodes use distinct shapes. Red is threat. Magenta is quantum impact.</p>
        <SecurityGraph />
      </div>
    </div>
  );
};

export default Landing;

import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';

const Analyst: React.FC = () => {
  const [q, setQ] = useState('Show me our highest-risk production assets.');
  const [out, setOut] = useState(false);
  return (
    <div>
      <PageHeader title="AI security analyst" lede="Answers are generated from the labeled fixture graph. Destructive actions are never applied silently. Every recommendation shows why, evidence, confidence, impact, rollback, approval, and an audit line." />
      <textarea className="btn" style={{ width: '100%', minHeight: 80 }} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask the analyst" />
      <div className="btn-row" style={{ margin: '12px 0' }}>
        <button type="button" className="btn primary" onClick={() => setOut(true)}>Investigate</button>
        <button type="button" className="btn" disabled>Apply remediation</button>
      </div>
      {out && (
        <div className="surface" style={{ padding: 16 }}>
          <p><Badge tone="intel">AI</Badge> Fixture response — not live model inference.</p>
          <p><strong>Top assets:</strong> pay-edge-tls, public ALB, pay-postgres, GH_DEPLOY_TOKEN reference, old-settlement certificate.</p>
          <p><strong>Why:</strong> Public TLS 1.0 + RSA-1024 on the payments edge, path to card-hold, unused secret reference, expired cert.</p>
          <p><strong>Evidence:</strong> CryptoBOM rows, CSPM public-lb control fail, certificate expiry = −6 days.</p>
          <p><strong>Attack path:</strong> Internet → ALB → container → service account → privileged role → PostgreSQL → card-hold.</p>
          <p><strong>Business impact:</strong> Payments unit, PCI-scope archive.</p>
          <p><strong>Compliance:</strong> PCI DSS 4.2.1, DORA ICT risk, NIS2 technical measures — mappings, not certifications.</p>
          <p><strong>Crypto risk:</strong> Classical critical + quantum critical on the edge listener.</p>
          <p><strong>Recommendation:</strong> Disable TLS 1.0 listener (dry-run), renew certificate, rotate secret reference, plan ML-KEM hybrid.</p>
          <p><strong>Confidence:</strong> 0.78 · <strong>Impact:</strong> availability if rollback skipped · <strong>Rollback:</strong> restore previous ALB policy · <strong>Approval:</strong> required · <strong>Audit:</strong> NX-AI-20260906-01</p>
          <div className="btn-row">
            <button type="button" className="btn">Create ticket</button>
            <button type="button" className="btn">Generate report</button>
            <button type="button" className="btn">Create playbook</button>
            <button type="button" className="btn">Simulate remediation</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyst;

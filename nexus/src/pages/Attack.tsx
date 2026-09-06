import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { attackPath } from '../data/graph';

const stages = [
  { name: 'Initial access', detail: 'Internet → public ALB with TLS 1.0' },
  { name: 'Privilege escalation', detail: 'Vulnerable container → pay-pod-sa' },
  { name: 'Lateral movement', detail: 'Service account → privileged role' },
  { name: 'Data access', detail: 'PostgreSQL → card-hold archive' },
  { name: 'Cryptographic exposure', detail: 'RSA-1024 wrap + 7-year retention' },
  { name: 'Business impact', detail: 'PCI-scope payments data' },
];

const Attack: React.FC = () => {
  const [pulse, setPulse] = useState(false);
  return (
    <div>
      <PageHeader title="Attack surface" lede="Calculated blast radius across network, identity, data, and cryptography. Threat pulse is the signature interaction — red for classical compromise, magenta for quantum impact." />
      <div className="workflow" style={{ margin: '16px 0' }}>
        {attackPath.map((s) => <em key={s}>{s}</em>)}
      </div>
      <div className="grid grid-2">
        <div className="surface metric"><small>Blast radius</small><b>High</b><small>7 hops to card-hold. Privileged role is the pivot.</small></div>
        <div className="surface metric">
          <small>Threat pulse</small>
          <b className={pulse ? 'pulse-threat' : undefined}>{pulse ? 'Active' : 'Armed'}</b>
          <small>Critical finding illuminates related assets. AI explanation is advisory.</small>
        </div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        {stages.map((s) => (
          <div key={s.name} className="surface" style={{ padding: 16 }}>
            <Badge tone="critical">{s.name}</Badge>
            <p>{s.detail}</p>
          </div>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={() => setPulse(true)}>Simulate threat pulse</button>
        <button type="button" className="btn" onClick={() => setPulse(false)}>Reset</button>
      </div>
    </div>
  );
};

export default Attack;

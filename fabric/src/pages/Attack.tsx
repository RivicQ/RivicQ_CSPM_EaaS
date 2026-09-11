import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import SecurityGraph from '../components/graph/SecurityGraph';
import { ATTACK_NODE_IDS, attackPath } from '../data/graph';

const stages = [
  { name: 'Initial access', detail: 'Internet → public ALB with TLS 1.0', nodes: ['threat', 'cert'] },
  { name: 'Privilege escalation', detail: 'Vulnerable container → pay-pod-sa', nodes: ['ctr', 'app'] },
  { name: 'Lateral movement', detail: 'Service account → privileged role', nodes: ['id'] },
  { name: 'Data access', detail: 'PostgreSQL → card-hold archive', nodes: ['db', 'data'] },
  { name: 'Cryptographic exposure', detail: 'RSA-1024 wrap + 7-year retention', nodes: ['rsa'] },
  { name: 'Business impact', detail: 'PCI-scope payments data', nodes: ['data'] },
];

const Attack: React.FC = () => {
  const [pulse, setPulse] = useState(false);
  const [stage, setStage] = useState(0);
  const focusIds = pulse ? ATTACK_NODE_IDS : stages[stage]?.nodes;
  return (
    <div>
      <PageHeader title="Attack surface" lede="Each kill-chain stage has its own graph. Threat pulse lights the full blast radius — red for classical compromise, magenta for quantum impact." />
      <div className="workflow" style={{ margin: '16px 0' }}>
        {attackPath.map((s) => <em key={s}>{s}</em>)}
      </div>
      <div className="surface" style={{ padding: 12, marginBottom: 16 }}>
        <p className="mono" style={{ color: 'var(--faint)', marginBottom: 8 }}>
          {pulse ? 'Full blast-radius graph' : `${stages[stage].name} graph`}
        </p>
        <SecurityGraph focusIds={focusIds} hideUnfocused label="Attack path graph" />
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
        {stages.map((s, idx) => (
          <button
            key={s.name}
            type="button"
            className="surface"
            style={{ padding: 16, textAlign: 'left', border: idx === stage && !pulse ? '1px solid var(--intel, #4aa3b8)' : undefined }}
            onClick={() => { setStage(idx); setPulse(false); }}
          >
            <Badge tone="critical">{s.name}</Badge>
            <p>{s.detail}</p>
          </button>
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  'Create organization',
  'Choose deployment',
  'Connect cloud',
  'Connect GitHub / GitLab',
  'Connect Kubernetes',
  'Connect identity',
  'Connect secrets',
  'Run initial discovery',
  'Generate security graph',
  'Calculate posture',
  'Show critical findings',
  'Create first remediation plan',
  'Invite team',
];

const Onboard: React.FC = () => {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  return (
    <div className="landing">
      <h1 className="h1">Enterprise onboarding</h1>
      <p className="lede">Guided setup. Connectors stay disconnected on GitHub Pages — no customer credentials are collected.</p>
      <div className="workflow" style={{ margin: '16px 0' }}>
        {steps.map((s, idx) => (
          <em key={s} style={{ opacity: idx === i ? 1 : 0.45 }}>{s}</em>
        ))}
      </div>
      <div className="surface" style={{ padding: 16 }}>
        <h2 className="h2">{steps[i]}</h2>
        <p className="lede">
          {i < 7
            ? 'This step would request an operator credential in a licensed deployment. On Pages it is a labeled no-op.'
            : 'Fixture analytics only. Invite-team does not send email from this demo.'}
        </p>
        <div className="btn-row">
          <button type="button" className="btn" disabled={i === 0} onClick={() => setI((n) => n - 1)}>Back</button>
          {i < steps.length - 1 ? (
            <button type="button" className="btn primary" onClick={() => setI((n) => n + 1)}>Continue</button>
          ) : (
            <button type="button" className="btn primary" onClick={() => nav('/discover')}>Start discovery</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboard;

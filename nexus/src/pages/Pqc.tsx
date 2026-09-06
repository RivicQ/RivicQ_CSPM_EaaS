import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import Metric from '../components/ui/Metric';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import { hndl, migrations, posture } from '../data/catalog';

const steps = ['RSA-2048', 'Identify dependencies', 'Find applications', 'Find certificates', 'Find services', 'Assess compatibility', 'Select ML-KEM / ML-DSA', 'Test', 'Deploy hybrid', 'Monitor', 'Complete'];

const Pqc: React.FC = () => {
  const [tab, setTab] = useState('score');
  const [step, setStep] = useState(0);
  return (
    <div>
      <PageHeader title="PQC readiness center" lede="NIST-standardized algorithms appear as product concepts (ML-KEM, ML-DSA, SLH-DSA). Status is labeled. This demo does not claim a completed migration or a certification." />
      <div className="grid grid-4" style={{ margin: '12px 0' }}>
        <Metric label="Quantum readiness" value={`${posture.pqc}%`} />
        <Metric label="Cryptographic assets" value="8,421" />
        <Metric label="Quantum vulnerable" value={posture.quantumVulnerable} />
        <Metric label="Migration ready / unknown" value="42% / 17%" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'score', label: 'Readiness' },
          { id: 'hndl', label: 'Harvest-now risk' },
          { id: 'plan', label: 'Migration planner' },
        ]}
      />
      {tab === 'score' && (
        <div className="grid grid-2">
          {migrations.map((m) => (
            <div key={m.from} className="surface" style={{ padding: 16 }}>
              <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                <strong>{m.from}</strong>
                <Badge tone="quantum">{m.ready} ready</Badge>
              </div>
              <p className="lede">Potential migration: {m.to}. Effort {m.effort}. Impact: {m.impact}.</p>
            </div>
          ))}
        </div>
      )}
      {tab === 'hndl' && (
        <div>
          <p className="lede">DATA × CRYPTOGRAPHY × RETENTION. Magenta is quantum impact, not a classical CVE score.</p>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data">
              <thead>
                <tr><th>Data</th><th>Value</th><th>Cryptography</th><th>Retention</th><th>Window</th></tr>
              </thead>
              <tbody>
                {hndl.map((r) => (
                  <tr key={r.data}>
                    <td>{r.data}</td><td>{r.value}</td><td className="mono">{r.crypto}</td><td>{r.retention}</td>
                    <td><Badge tone={r.window === 'Critical' ? 'quantum' : r.window === 'High' ? 'warn' : 'info'}>{r.window}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'plan' && (
        <div className="surface" style={{ padding: 16 }}>
          <div className="workflow" aria-label="Migration workflow">
            {steps.map((s, i) => (
              <button key={s} type="button" className={`btn ${i <= step ? 'primary' : ''}`} onClick={() => setStep(i)}>{s}</button>
            ))}
          </div>
          <div className="kvs" style={{ marginTop: 16 }}>
            <span>Readiness</span><b>Hybrid canary only (pay-mlkem-pilot)</b>
            <span>Affected applications</span><b>payments-api, corp-vpn, idp-bridge</b>
            <span>Estimated effort</span><b>High — edge + certificate + client compatibility</b>
            <span>Business impact</span><b>Payments availability if rollback is skipped</b>
            <span>Recommended algorithm</span><b>TLS 1.3 hybrid with ML-KEM-768 (FIPS 203 concept)</b>
            <span>Rollback</span><b>Restore previous ACM certificate. Approval required.</b>
            <span>Validation</span><b>Dry-run only on this demo</b>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pqc;

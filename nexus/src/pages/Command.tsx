import React from 'react';
import { useNavigate } from 'react-router-dom';
import Metric from '../components/ui/Metric';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { actions, changes, dimensions, posture } from '../data/catalog';
import { useSession } from '../state/session';

const Command: React.FC = () => {
  const nav = useNavigate();
  const { mode } = useSession();
  return (
    <div>
      <PageHeader title="Security Command Center" lede="How secure are we? What changed? What requires action?" />
      <div className="surface metric" style={{ margin: '0 0 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <small>Overall security posture</small>
          <b>{posture.overall} / 100</b>
        </div>
        <Badge tone="healthy">{posture.label}</Badge>
      </div>
      <div className="grid grid-4">
        <Metric label="Critical findings" value={posture.criticalFindings} />
        <Metric label="High-risk assets" value={posture.highRiskAssets} />
        <Metric label="Cloud misconfigurations" value={posture.cloudMisconfigs} />
        <Metric label="Crypto vulnerabilities" value={posture.cryptoVulns} />
        <Metric label="Expired certificates" value={posture.expiredCerts} />
        <Metric label="Secrets at risk" value={posture.secretsAtRisk} hint="Names only" />
        <Metric label="Quantum-vulnerable assets" value={posture.quantumVulnerable} />
        <Metric label="Compliance / PQC" value={`${posture.compliance}% / ${posture.pqc}%`} />
      </div>

      {mode === 'ciso' && (
        <div className="surface" style={{ padding: 16, marginTop: 16 }}>
          <h2 className="h2">Top 5 business risks</h2>
          <p>1. Public payments edge still offers TLS 1.0 (PCI + harvest-now risk).</p>
          <p>2. Privileged role can reach card-hold from a public container.</p>
          <p>3. SHA-1 remains in ledger-web CMS signatures.</p>
          <p>4. Model endpoint identity is over-scoped.</p>
          <p>5. Expired settlement certificate breaks the customer trust path.</p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => nav('/app/reports')}>Board report</button>
            <button type="button" className="btn" onClick={() => nav('/app/pqc')}>PQC readiness</button>
          </div>
        </div>
      )}

      {mode !== 'ciso' && (
        <div className="grid grid-3" style={{ marginTop: 16 }}>
          {dimensions.map((d) => (
            <button key={d.id} type="button" className="surface metric" onClick={() => nav(d.href)}>
              <small>{d.name}</small>
              <b>{d.score}</b>
              <small>{d.critical} critical · {d.assets.toLocaleString()} assets · trend {d.trend}</small>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="surface" style={{ padding: 16 }}>
          <h2 className="h2">What changed</h2>
          {changes.map((c) => (
            <p key={c.title}><span className="mono">{c.when}</span> — {c.title} <Badge tone="info">{c.area}</Badge></p>
          ))}
        </div>
        <div className="surface" style={{ padding: 16 }}>
          <h2 className="h2">Requires action</h2>
          {actions.map((a) => (
            <p key={a.id}><Badge tone={a.risk}>{a.risk}</Badge> {a.title} · {a.owner} · {a.approval}</p>
          ))}
          <button type="button" className="btn" onClick={() => nav('/app/analyst')}>Ask AI analyst</button>
        </div>
      </div>
    </div>
  );
};

export default Command;

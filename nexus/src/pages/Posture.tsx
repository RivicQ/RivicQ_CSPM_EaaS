import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { assets, dimensions } from '../data/catalog';

const drill = ['Enterprise', 'Payments', 'AWS', 'nbx-prod-pay', 'payments-api', 'alb/pay-public', 'NX-1042'];

const Posture: React.FC = () => {
  const nav = useNavigate();
  const [depth, setDepth] = useState(0);
  return (
    <div>
      <PageHeader title="Security posture" lede="Nine scored dimensions. Drill Enterprise → business unit → cloud → account → application → asset → finding. Scores are fixture analytics, not a certification." />
      <div className="workflow" style={{ marginBottom: 16 }}>
        {drill.map((step, i) => (
          <button key={step} type="button" className={`btn ${i <= depth ? 'primary' : ''}`} onClick={() => setDepth(i)}>
            {step}
          </button>
        ))}
      </div>
      <p className="lede">Current slice: {drill.slice(0, depth + 1).join(' / ')}</p>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        {dimensions.map((d) => (
          <button key={d.id} type="button" className="surface metric" onClick={() => nav(d.href)}>
            <small>{d.name}</small>
            <b>{d.score}</b>
            <small>Trend {d.trend} · {d.critical} critical · {d.assets.toLocaleString()} assets</small>
            <small>{d.action}</small>
          </button>
        ))}
      </div>
      <div className="surface" style={{ padding: 16, marginTop: 16 }}>
        <h2 className="h2">Business criticality × security exposure</h2>
        <div className="matrix" role="table" aria-label="Posture matrix">
          <div className="axis" />
          <div className="axis">Low exposure</div>
          <div className="axis">Medium exposure</div>
          <div className="axis">High exposure</div>
          {['Low', 'High', 'Critical'].map((crit) => (
            <React.Fragment key={crit}>
              <div className="axis">{crit} criticality</div>
              {['low', 'medium', 'high'].map((exp) => {
                const here = assets.filter((a) => a.criticality.toLowerCase() === crit.toLowerCase() && a.exposure === exp);
                const hot = crit === 'Critical' && exp === 'high';
                return (
                  <div key={exp} className={`cell ${hot ? 'hot' : ''}`}>
                    {here.length ? here.map((a) => <div key={a.name}>{a.name}</div>) : <span style={{ color: 'var(--faint)' }}>—</span>}
                    {hot && <Badge tone="critical">Priority</Badge>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Posture;

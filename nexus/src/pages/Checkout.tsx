import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { plans, pricingDims } from '../data/catalog';

const Checkout: React.FC = () => {
  const [plan, setPlan] = useState('ent');
  return (
    <div>
      <PageHeader title="Plans & checkout" lede="Native purchasing inside the security fabric. GitHub Pages does not collect payment, tax IDs, or card numbers. Enterprise SLA and HSM integration are contractual, not implied by this demo." />
      <div className="grid grid-2" style={{ margin: '16px 0' }}>
        {plans.map((p) => (
          <button key={p.id} type="button" className="surface metric" onClick={() => setPlan(p.id)} aria-pressed={plan === p.id}>
            <small>{p.name}</small>
            <b>{p.users} users</b>
            <small>{p.accounts} accounts · {p.note}</small>
          </button>
        ))}
      </div>
      <div className="surface" style={{ padding: 16, marginBottom: 16 }}>
        <h2 className="h2">Selected: {plans.find((p) => p.id === plan)?.name}</h2>
        <p>Deployment options: Cloud · Hybrid · On-premise · Private cloud · optional HSM.</p>
        <ul>
          {pricingDims.map((d) => <li key={d}>{d}</li>)}
        </ul>
        <button type="button" className="btn" disabled>Continue to payment (disabled on Pages)</button>
      </div>
    </div>
  );
};

export default Checkout;

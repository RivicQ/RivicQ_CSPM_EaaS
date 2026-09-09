import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';

const nodes = [
  'WHEN critical CSPM finding',
  'IF production AND risk > 80',
  'THEN create ticket',
  'Notify security',
  'Generate evidence',
  'Request approval',
  'Apply remediation',
  'Validate',
  'Close finding',
];

const Automation: React.FC = () => {
  const [dry, setDry] = useState('Idle');
  return (
    <div>
      <PageHeader title="Automation engine" lede="Visual playbook. Manual approval by default. Dry-run, rollback, versioning, and audit history are first-class. No silent production change on this demo." />
      <div className="auto-grid">
        {nodes.map((n) => (
          <div key={n} className="auto-node">{n}</div>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={() => setDry('Dry-run completed. No change applied.')}>Dry run</button>
        <button type="button" className="btn">Version 1.3</button>
        <button type="button" className="btn">Audit history</button>
        <button type="button" className="btn">Schedule</button>
        <button type="button" className="btn" disabled>Automatic approval</button>
        <button type="button" className="btn" disabled>Execute</button>
      </div>
      <p className="lede" style={{ marginTop: 12 }}>{dry}</p>
    </div>
  );
};

export default Automation;

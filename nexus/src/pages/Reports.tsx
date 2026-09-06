import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { posture } from '../data/catalog';
import { useSession } from '../state/session';

const Reports: React.FC = () => {
  const { mode } = useSession();
  const [body, setBody] = useState('');
  const generate = (kind: string) => {
    const text = [
      `NEXUS ${kind} — labeled Northbridge Exchange fixture`,
      `Generated as on-screen copy. Not an audit opinion.`,
      `Posture ${posture.overall}/100 · Compliance mapping ${posture.compliance}% · PQC ${posture.pqc}%`,
      mode === 'ciso' ? 'Executive: five business risks, remediation progress, board narrative.' : '',
      mode === 'auditor' ? 'Auditor: controls, evidence hashes, exceptions, timestamps.' : '',
      mode === 'engineer' ? 'Engineering: findings, Terraform modules, SBOM/CBOM links.' : '',
    ].filter(Boolean).join('\n');
    setBody(text);
  };
  const download = (ext: 'txt' | 'csv') => {
    const blob = new Blob([body || 'No report generated'], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nexus-${mode}-report.${ext}`;
    a.click();
  };
  return (
    <div>
      <PageHeader title="Reports" lede="Executive, engineering, and auditor exports. This demo generates on-screen copy and a local text download. It is not a certified PDF pack." />
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn primary" onClick={() => generate('Executive report')}>Executive report</button>
        <button type="button" className="btn" onClick={() => generate('Audit report')}>Audit report</button>
        <button type="button" className="btn" onClick={() => generate('Engineering evidence')}>Engineering evidence</button>
        <button type="button" className="btn" disabled={!body} onClick={() => download('txt')}>Download TXT</button>
        <button type="button" className="btn" disabled={!body} onClick={() => download('csv')}>Download CSV</button>
      </div>
      {body && <pre className="surface" style={{ padding: 16, whiteSpace: 'pre-wrap' }}>{body}</pre>}
    </div>
  );
};

export default Reports;

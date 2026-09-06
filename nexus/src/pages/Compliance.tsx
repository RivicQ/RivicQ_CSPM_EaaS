import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import PageHeader from '../components/ui/PageHeader';
import { controls, findings, frameworks } from '../data/catalog';
import { useSession } from '../state/session';

const Compliance: React.FC = () => {
  const { mode } = useSession();
  const [id, setId] = useState<string | undefined>();
  const row = controls.find((c) => c.id === id);
  return (
    <div>
      <PageHeader title="Compliance center" lede="Finding → control → regulation → evidence → remediation. Framework names are engineering mappings. This is not an audit opinion or a certification of NEXUS or of RivicQ GmbH." />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        {frameworks.map((f) => (
          <div key={f.name} className="surface metric">
            <small>{f.name}</small>
            <b>{f.score}%</b>
            <small>{f.fails} failing · {f.evidence} evidence objects · mapping only</small>
          </div>
        ))}
      </div>
      <DataTable
        caption="Controls"
        exportName="nexus-controls"
        rows={controls}
        rowKey={(r) => r.id}
        onOpen={(r) => setId(r.id)}
        columns={[
          { id: 'id', header: 'Control', get: (r) => r.id, mono: true },
          { id: 'framework', header: 'Framework', get: (r) => r.framework },
          { id: 'title', header: 'Title', get: (r) => r.title },
          { id: 'severity', header: 'Severity', get: (r) => r.severity, render: (r) => <Badge tone={r.severity}>{r.severity}</Badge> },
          { id: 'pass', header: 'Pass', get: (r) => r.pass },
          { id: 'fail', header: 'Fail', get: (r) => r.fail },
          { id: 'exceptions', header: 'Exceptions', get: (r) => r.exceptions },
          { id: 'regulation', header: 'Regulation', get: (r) => r.regulation },
        ]}
      />
      {row && (
        <Drawer title={row.id} onClose={() => setId(undefined)}>
          <div className="workflow" style={{ marginBottom: 12 }}>
            {(mode === 'auditor'
              ? ['Control', 'Evidence', 'Exception', 'Owner', 'Timestamp']
              : ['Finding', 'Control', 'Regulation', 'Evidence', 'Remediation']
            ).map((s) => <em key={s}>{s}</em>)}
          </div>
          <div className="kvs">
            <span>Control</span><b>{row.title}</b>
            <span>Related findings</span><b>{findings.filter((f) => f.control === row.id).map((f) => f.id).join(', ') || '—'}</b>
            <span>Evidence</span><b>Synthetic snapshot hash e3b0c4… (truncated). Immutable demo trail.</b>
            <span>Exception</span><b>{row.exceptions} recorded · time-boxed · owner required</b>
            <span>Remediation</span><b>Ticket + approval. No silent close.</b>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default Compliance;

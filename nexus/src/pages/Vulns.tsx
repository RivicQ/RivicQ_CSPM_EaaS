import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import PageHeader from '../components/ui/PageHeader';
import SecurityGraph from '../components/graph/SecurityGraph';
import { findings } from '../data/catalog';
import { FINDING_NODE_IDS } from '../data/graph';

const Vulns: React.FC = () => {
  const [id, setId] = useState<string | undefined>(findings[0]?.id);
  const row = findings.find((f) => f.id === id);
  const focusIds = row ? FINDING_NODE_IDS[row.id] : undefined;
  return (
    <div>
      <PageHeader title="Vulnerability management" lede="Each detection has its own subgraph: workload, identity, cryptography, data, control, and business impact." />
      <div className="surface" style={{ padding: 12, marginBottom: 12 }}>
        <p className="mono" style={{ color: 'var(--faint)', marginBottom: 8 }}>
          {row ? `${row.id} detection graph` : 'Select a finding'}
        </p>
        <SecurityGraph
          focusIds={focusIds}
          hideUnfocused
          label={row ? `Detection graph for ${row.id}` : 'Detection graph'}
        />
      </div>
      <DataTable
        caption="Findings"
        exportName="fabric-findings"
        rows={findings}
        rowKey={(r) => r.id}
        onOpen={(r) => setId(r.id)}
        columns={[
          { id: 'id', header: 'Finding', get: (r) => r.id, mono: true },
          { id: 'title', header: 'Title', get: (r) => r.title },
          { id: 'sev', header: 'Severity', get: (r) => r.sev, render: (r) => <Badge tone={r.sev}>{r.sev}</Badge> },
          { id: 'asset', header: 'Asset', get: (r) => r.asset, mono: true },
          { id: 'owner', header: 'Owner', get: (r) => r.owner },
          { id: 'control', header: 'Control', get: (r) => r.control },
          { id: 'regulation', header: 'Regulation', get: (r) => r.regulation },
          { id: 'env', header: 'Env', get: (r) => r.env },
        ]}
      />
      {row && (
        <Drawer title={row.id} onClose={() => setId(undefined)}>
          <div className="workflow" style={{ marginBottom: 12 }}>
            {['Finding', 'Control', 'Regulation', 'Evidence', 'Remediation'].map((s) => <em key={s}>{s}</em>)}
          </div>
          <div className="kvs">
            <span>Finding</span><b>{row.title}</b>
            <span>Control</span><b>{row.control}</b>
            <span>Regulation</span><b>{row.regulation} — mapping only</b>
            <span>Evidence</span><b>Synthetic config snapshot. No customer payload.</b>
            <span>Remediation</span><b>Approval-gated. Dry-run on Pages. Rollback required.</b>
          </div>
          <div className="surface" style={{ padding: 12, marginTop: 16 }}>
            <SecurityGraph focusIds={FINDING_NODE_IDS[row.id]} hideUnfocused label={`Detection graph ${row.id}`} />
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default Vulns;

import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import Metric from '../components/ui/Metric';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import Topology from '../components/graph/Topology';
import { clouds, policies } from '../data/catalog';
import { nodeDetails, topology } from '../data/graph';

const Cloud: React.FC = () => {
  const [tab, setTab] = useState('accounts');
  const [node, setNode] = useState<string | undefined>();
  const [policy, setPolicy] = useState<string | undefined>();
  const selected = topology.find((n) => n.id === node);
  const detail = node && (nodeDetails[node] || nodeDetails.app);
  const pol = policies.find((p) => p.id === policy);

  return (
    <div>
      <PageHeader title="Cloud security posture" lede="AWS, Azure, Google Cloud, Kubernetes, OCI, and hybrid. Fixture accounts only. No live attach on GitHub Pages." />
      <div className="grid grid-4">
        <Metric label="Accounts" value={24} />
        <Metric label="Resources" value="18,420" />
        <Metric label="Critical misconfigurations" value={31} />
        <Metric label="High risk" value={147} />
        <Metric label="Public resources" value={83} />
        <Metric label="Unencrypted resources" value={29} />
        <Metric label="Identity risks" value={42} />
        <Metric label="Providers" value="6" hint="AWS · Azure · GCP · OCI · K8s · Hybrid" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'accounts', label: 'Accounts' },
          { id: 'topology', label: 'Resource graph' },
          { id: 'policies', label: 'Policy engine' },
        ]}
      />
      {tab === 'accounts' && (
        <DataTable
          caption="Cloud accounts"
          exportName="nexus-cloud-accounts"
          rows={clouds}
          rowKey={(r) => r.account}
          columns={[
            { id: 'account', header: 'Account', get: (r) => r.account, mono: true },
            { id: 'provider', header: 'Provider', get: (r) => r.provider },
            { id: 'region', header: 'Region', get: (r) => r.region, mono: true },
            { id: 'resources', header: 'Resources', get: (r) => r.resources },
            { id: 'critical', header: 'Critical', get: (r) => r.critical },
            { id: 'high', header: 'High', get: (r) => r.high },
            { id: 'publicRes', header: 'Public', get: (r) => r.publicRes },
            { id: 'unencrypted', header: 'Unencrypted', get: (r) => r.unencrypted },
            { id: 'identity', header: 'Identity', get: (r) => r.identity },
            { id: 'owner', header: 'Owner', get: (r) => r.owner },
          ]}
        />
      )}
      {tab === 'topology' && (
        <div className="grid grid-2">
          <div className="surface" style={{ padding: 16 }}>
            <Topology selected={node} onSelect={setNode} />
          </div>
          <div className="surface" style={{ padding: 16 }}>
            <h2 className="h2">{selected?.label || 'Select a resource'}</h2>
            {detail ? (
              <div className="kvs">
                <span>Overview</span><b>{detail.overview}</b>
                <span>Risk</span><b>{detail.risk}</b>
                <span>Configuration</span><b>{detail.config}</b>
                <span>Network</span><b>{detail.network}</b>
                <span>Identity</span><b>{detail.identity}</b>
                <span>Vulnerabilities</span><b>{detail.vulns}</b>
                <span>Secrets</span><b>{detail.secrets}</b>
                <span>Data</span><b>{detail.data}</b>
                <span>Crypto</span><b>{detail.crypto}</b>
                <span>Compliance</span><b>{detail.compliance}</b>
                <span>Activity</span><b>{detail.activity}</b>
              </div>
            ) : <p className="lede">Selecting a node opens overview, risk, configuration, exposure, identity, vulnerabilities, secrets, data, crypto, compliance, and activity.</p>}
          </div>
        </div>
      )}
      {tab === 'policies' && (
        <DataTable
          caption="CSPM policies"
          exportName="nexus-policies"
          rows={policies}
          rowKey={(r) => r.id}
          onOpen={(r) => setPolicy(r.id)}
          columns={[
            { id: 'id', header: 'Policy', get: (r) => r.id, mono: true },
            { id: 'domain', header: 'Domain', get: (r) => r.domain },
            { id: 'control', header: 'Control', get: (r) => r.control },
            { id: 'severity', header: 'Severity', get: (r) => r.severity, render: (r) => <Badge tone={r.severity}>{r.severity}</Badge> },
            { id: 'framework', header: 'Framework', get: (r) => r.framework },
            { id: 'pass', header: 'Pass', get: (r) => r.pass },
            { id: 'fail', header: 'Fail', get: (r) => r.fail },
            { id: 'exceptions', header: 'Exception', get: (r) => r.exceptions },
            { id: 'version', header: 'Version', get: (r) => r.version },
          ]}
        />
      )}
      {pol && (
        <Drawer title={pol.id} onClose={() => setPolicy(undefined)}>
          <div className="kvs">
            <span>Control</span><b>{pol.control}</b>
            <span>Severity</span><b>{pol.severity}</b>
            <span>Framework</span><b>{pol.framework}</b>
            <span>Pass / fail / exception</span><b>{pol.pass} / {pol.fail} / {pol.exceptions}</b>
            <span>Remediation</span><b>Dry-run only on this demo. Approval required. No silent apply.</b>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn">Duplicate</button>
            <button type="button" className="btn">Test policy</button>
            <button type="button" className="btn">Audit history</button>
            <button type="button" className="btn" disabled>Disable</button>
          </div>
        </Drawer>
      )}
    </div>
  );
};

export default Cloud;

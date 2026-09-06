import React from 'react';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { hbom } from '../data/catalog';

const Hbom: React.FC = () => (
  <div>
    <PageHeader title="Hardware bill of materials" lede="Servers, HSMs, TPMs, appliances, firmware, and end-of-life. Hardware is linked to software, certificates, keys, and cloud workloads." />
    <DataTable
      caption="HBOM"
      exportName="nexus-hbom"
      rows={hbom}
      rowKey={(r) => r.asset}
      columns={[
        { id: 'asset', header: 'Asset', get: (r) => r.asset, mono: true },
        { id: 'type', header: 'Type', get: (r) => r.type },
        { id: 'firmware', header: 'Firmware', get: (r) => r.firmware, mono: true },
        { id: 'crypto', header: 'Crypto capability', get: (r) => r.crypto },
        { id: 'eol', header: 'End of life', get: (r) => r.eol },
        { id: 'owner', header: 'Owner', get: (r) => r.owner },
        { id: 'linked', header: 'Linked asset', get: (r) => r.linked },
      ]}
    />
  </div>
);

export default Hbom;

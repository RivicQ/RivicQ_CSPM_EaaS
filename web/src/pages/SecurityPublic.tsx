import React from 'react';
import SitePage from './SitePage';

const SecurityPublic: React.FC = () => (
  <SitePage
    eyebrow="Security · trust boundaries"
    title="How RivicQ handles secrets, tenants, and Pages."
    lede="GitHub Pages is a public static site. It must never hold database credentials, admin tools, or customer estates. Production scans need the CLI or a running API with real tenancy."
    primary={{ label: 'Security policy', to: `${process.env.PUBLIC_URL || ''}/docs/read.html?doc=SECURITY.md` }}
    secondary={{ label: 'Report a vulnerability', to: 'mailto:security@rivicq.com' }}
    notice="Report security issues to security@rivicq.com. Do not file secrets in public GitHub issues."
    engineNotice="scan"
    sectionEyebrow="Trust model"
    sectionTitle="Public desks, tenant isolation, and what never ships on Pages."
    diagramKicker="Security · operator workflow"
    diagramTitle="Scan public targets safely → keep secrets out of Pages → export evidence without fabricating estates."
    blocks={[
      { title: 'Public desks', body: 'hello@, sales@, support@, security@, privacy@ on rivicq.com. admin@ and finance aliases stay private.' },
      { title: 'Tenant isolation', body: 'JWT tenant_id scopes Community scans. Spoofable X-Tenant-ID headers are ignored by the API.' },
      { title: 'Payments', body: 'No PAN or CVV on RivicQ APIs. Provider-hosted checkout activates only when a PSP adapter is configured.' },
      { title: 'Discord notify', body: 'Optional notify strips email and secrets. Discord is never the system of record for leads or findings.' },
      { title: 'Demo data', body: 'Interactive demo workspaces are labeled DEMO. They cannot see customer telemetry or production keys.' },
      { title: 'Pages boundary', body: 'Static hosting serves the console shell only. The CBOM engine stays off this host until you deploy it.' },
    ]}
  />
);

export default SecurityPublic;

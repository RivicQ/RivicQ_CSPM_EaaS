import React from 'react';
import SitePage from './SitePage';

const SecurityPublic: React.FC = () => (
  <SitePage
    eyebrow="Security"
    title="How RivicQ handles secrets, tenants, and Pages."
    lede="GitHub Pages is a public static site. It must never hold database credentials, admin tools, or customer estates. Production scans need the CLI or a running API."
    primary={{ label: 'Security policy', to: `${process.env.PUBLIC_URL || ''}/docs/read.html?doc=SECURITY.md` }}
    secondary={{ label: 'Report a vulnerability', to: 'mailto:security@rivicq.com' }}
    engineNotice="scan"
    blocks={[
      { title: 'Public desks', body: 'hello@, sales@, support@, security@, privacy@ on rivicq.com. admin@ is private.' },
      { title: 'Tenant isolation', body: 'JWT tenant_id scopes Community scans. Spoofable X-Tenant-ID is ignored.' },
      { title: 'Payments', body: 'No PAN or CVV on RivicQ APIs. Provider-hosted checkout when a PSP adapter is live.' },
      { title: 'Discord', body: 'Optional notify. Email and secrets are stripped. Discord is not the system of record.' },
    ]}
  />
);

export default SecurityPublic;

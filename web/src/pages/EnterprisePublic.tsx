import React from 'react';
import SitePage from './SitePage';

const EnterprisePublic: React.FC = () => (
  <SitePage
    eyebrow="Enterprise"
    title="Licensed control plane. Same security model."
    lede="Cloning this repository gives you the Community scan engine. Enterprise SSO, RBAC, audit, and cloud connectors are a commercial contract with RivicQ GmbH."
    primary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    secondary={{ label: 'See pricing', to: '/pricing' }}
    blocks={[
      { title: 'SSO and RBAC', body: 'Workspace roles on the API. Edition switcher in the UI is a preference, not a license grant.' },
      { title: 'Cloud connectors', body: 'AWS, GCP, Azure, IBM Cloud when credentials and a license exist. Nothing is auto-attached.' },
      { title: 'Evidence packs', body: 'Governance mappings for operators. Not ISO, SOC 2, or DORA certifications.' },
      { title: 'Support', body: 'Named support is contractual. Public desk: support@rivicq.com.' },
    ]}
  />
);

export default EnterprisePublic;

import React from 'react';
import SitePage from './SitePage';

const EnterprisePublic: React.FC = () => (
  <SitePage
    eyebrow="Enterprise · licensed control plane"
    title="Licensed control plane. Same security model."
    lede="Cloning this repository gives you the Community scan engine under Apache-2.0. Enterprise SSO, RBAC, audit, cloud connectors, and continuous monitoring are a commercial contract with RivicQ GmbH."
    primary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    secondary={{ label: 'See pricing', to: '/pricing' }}
    notice="The edition switcher in the UI is a workspace preference. It is not a license grant and does not unlock production connectors on GitHub Pages."
    engineNotice="scan"
    diagramId="architecture"
    diagramKicker="Enterprise · architecture"
    diagramTitle="Same engine. Licensed control plane, SSO, connectors, and evidence packs."
    sectionEyebrow="Enterprise scope"
    sectionTitle="What the commercial control plane adds on top of Community."
    blocks={[
      { title: 'SSO and RBAC', body: 'Workspace roles on the API with audit history. Community stays CLI + labeled console without enterprise IdP.' },
      { title: 'Cloud connectors', body: 'AWS, GCP, Azure, IBM Cloud when credentials and a license exist. Nothing is auto-attached from Pages.' },
      { title: 'BOM layers', body: 'QBOM, HBOM, AIBOM, and IBOM unlock on Enterprise. Community keeps CBOM + SBOM only.' },
      { title: 'Evidence packs', body: 'Governance mappings for operators under contract. Not ISO, SOC 2, or DORA certifications.' },
      { title: 'HSM / quantum', body: 'PKCS#11 inventory and optional quantum runtime connectors — declared, credential-gated, never implied by OSS clone.' },
      { title: 'Support', body: 'Named support is contractual. Public desk remains support@rivicq.com for general questions.' },
    ]}
  />
);

export default EnterprisePublic;

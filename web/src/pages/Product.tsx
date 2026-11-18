import React from 'react';
import SitePage from './SitePage';

const Product: React.FC = () => (
  <SitePage
    eyebrow="Product · RivicQ GmbH · Berlin"
    title="Cryptographic posture, from public product to console evidence."
    lede="RivicQ is one CSPM engine with public product pages, an authenticated console, tenant-scoped scans, and CycloneDX evidence. Community runs locally and in CI; Enterprise needs a valid license and configured integrations."
    primary={{ label: 'Start security assessment', to: '/' }}
    secondary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    notice="Control mappings (DORA, NIS2, NIST, ISO, PCI) help operators organize work. They are not certifications or audit pass marks."
    engineNotice="scan"
    sectionEyebrow="Product layers"
    sectionTitle="What the complete CSPM product ships — and what stays licensed."
    diagramId="console"
    diagramKicker="Product · CSPM overview"
    diagramTitle="Public overview → authenticated console → tenant-scoped engine → CBOM evidence."
    blocks={[
      { title: 'Project overview', body: 'Home, Product, and CSPM pages explain the engine before sign-in. The same maps live in the Archify gallery and reference.' },
      { title: 'Operator console', body: 'Dashboard, assets, findings, scanner, BOM, governance, and role-gated admin views sit behind a real API session.' },
      { title: 'Identity & MFA', body: 'Tenant, role, and server-derived edition come from /auth/me. TOTP setup and disable require a live session; demo mode stores no secrets.' },
      { title: 'Tenant-scoped scans', body: 'POST /scans returns 202 with a result URL. Status and report reads stay inside the caller tenant.' },
      { title: 'Policy evidence', body: 'Fingerprinted findings pass through BLOCK / WARN / ALLOW rules before a CycloneDX-compatible CBOM report is published.' },
      { title: 'Edition boundary', body: 'Enterprise fails closed without a valid license and database. Unconfigured cloud, HSM, and advanced BOM layers stay unavailable.' },
    ]}
  />
);

export default Product;

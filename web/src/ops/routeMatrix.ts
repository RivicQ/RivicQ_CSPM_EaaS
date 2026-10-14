/**
 * Route inventory for the React console.
 *
 * Paths must stay aligned with `web/src/App.tsx`. This file is the testable
 * catalog; App.tsx remains the router. When you add a route, add it here too.
 *
 * Availability:
 * - live: wired to the Go API when REACT_APP_API_URL is set
 * - demo: labeled client-side demo session (not a JWT)
 * - enterprise: gated by RequireEnterprise
 * - static: marketing / docs page, no live scan
 * - unavailable: rendered, but the control is disabled without a backend
 */
export type RouteAvailability = 'live' | 'demo' | 'enterprise' | 'static' | 'unavailable';

export type AppRoute = {
  path: string;
  name: string;
  auth: boolean;
  availability: RouteAvailability;
  notes: string;
};

export const APP_ROUTES: AppRoute[] = [
  { path: '/', name: 'Home', auth: false, availability: 'static', notes: 'Marketing + optional live scan when API is configured' },
  { path: '/demo', name: 'Demo', auth: false, availability: 'demo', notes: 'Labeled in-browser demo session' },
  { path: '/login', name: 'Login', auth: false, availability: 'live', notes: 'Requires API; Pages shows engine-needed state' },
  { path: '/register', name: 'Register', auth: false, availability: 'live', notes: 'Requires API' },
  { path: '/forgot-password', name: 'ForgotPassword', auth: false, availability: 'live', notes: 'In-memory reset token; no mailbox product' },
  { path: '/reset-password', name: 'ResetPassword', auth: false, availability: 'live', notes: 'Completes in-memory reset' },
  { path: '/verify-email', name: 'VerifyEmail', auth: false, availability: 'live', notes: 'Requires API' },
  { path: '/oauth/callback', name: 'OAuthCallback', auth: false, availability: 'live', notes: 'Google/GitHub OAuth; SSO/SAML ACS is not this route' },
  { path: '/switcher', name: 'EditionSwitcher', auth: false, availability: 'static', notes: 'Community vs Enterprise picker' },
  { path: '/contact', name: 'ContactHub', auth: false, availability: 'static', notes: 'Public desks only' },
  { path: '/request-demo', name: 'RequestDemo', auth: false, availability: 'static', notes: 'Lead form' },
  { path: '/pricing', name: 'Pricing', auth: false, availability: 'static', notes: 'Edition comparison' },
  { path: '/ibm', name: 'IBMPartner', auth: false, availability: 'static', notes: 'Partner-plus status; not a live IBM connector' },
  { path: '/product', name: 'Product', auth: false, availability: 'static', notes: '' },
  { path: '/product/cspm', name: 'CspmPublic', auth: false, availability: 'static', notes: '' },
  { path: '/cbom', name: 'CbomPublic', auth: false, availability: 'static', notes: '' },
  { path: '/pqc', name: 'PqcPublic', auth: false, availability: 'static', notes: '' },
  { path: '/enterprise', name: 'EnterprisePublic', auth: false, availability: 'static', notes: '' },
  { path: '/security', name: 'SecurityPublic', auth: false, availability: 'static', notes: '' },
  { path: '/logout', name: 'Logout', auth: false, availability: 'live', notes: 'Clears session and redirects' },
  { path: '/dashboard', name: 'Dashboard', auth: true, availability: 'live', notes: 'Metrics come from API or labeled demo; never invented live counts' },
  { path: '/assets', name: 'Assets', auth: true, availability: 'live', notes: '' },
  { path: '/assets/:id', name: 'AssetDetails', auth: true, availability: 'live', notes: '' },
  { path: '/findings', name: 'Findings', auth: true, availability: 'live', notes: 'Evidence, severity, PQC class' },
  { path: '/scanner', name: 'Scanner', auth: true, availability: 'live', notes: 'Start scan / status / failures' },
  { path: '/cspm', name: 'CSPM', auth: true, availability: 'live', notes: '' },
  { path: '/analytics', name: 'Analytics', auth: true, availability: 'live', notes: 'Export when a report exists' },
  { path: '/settings', name: 'Settings', auth: true, availability: 'live', notes: '' },
  { path: '/admin', name: 'Admin', auth: true, availability: 'live', notes: 'RequireRole admin' },
  { path: '/tools', name: 'DevSecOpsTools', auth: true, availability: 'live', notes: 'PATH scanner status; optional tools may be unavailable' },
  { path: '/ecosystem', name: 'RivicQEcosystem', auth: true, availability: 'static', notes: '' },
  { path: '/infrastructure', name: 'InfraDiscovery', auth: true, availability: 'live', notes: '' },
  { path: '/bom', name: 'BomIntelligence', auth: true, availability: 'live', notes: 'CBOM / unified BOM view' },
  { path: '/pipeline', name: 'DevSecOpsPipeline', auth: true, availability: 'live', notes: '' },
  { path: '/security/api', name: 'ApiSecurity', auth: true, availability: 'live', notes: 'TLS/HTTPS derived' },
  { path: '/security/ai', name: 'AiSecurity', auth: true, availability: 'enterprise', notes: 'AIBOM layer; 403 without Enterprise' },
  { path: '/connectors/hsm', name: 'HsmQuantum', auth: true, availability: 'enterprise', notes: 'Connector-dependent' },
  { path: '/governance', name: 'GovernanceHub', auth: true, availability: 'live', notes: 'Control mappings, not certifications' },
  { path: '/migration', name: 'MigrationHub', auth: true, availability: 'live', notes: 'PQC plan; no automatic key rotation' },
  { path: '/crm', name: 'CRM', auth: true, availability: 'live', notes: 'Admin only' },
  { path: '/enterprise/inventory', name: 'Inventory', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/compliance', name: 'Compliance', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/quantum', name: 'Quantum', auth: true, availability: 'enterprise', notes: 'Local taxonomy; IBM Quantum not invoked' },
  { path: '/enterprise/multicloud', name: 'MultiCloud', auth: true, availability: 'enterprise', notes: 'Empty without customer credentials' },
  { path: '/enterprise/cncf', name: 'CNCF', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/terraform', name: 'Terraform', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/ibmcloud', name: 'IBMCloud', auth: true, availability: 'enterprise', notes: 'Connector-dependent' },
  { path: '/enterprise/awscloud', name: 'AWSCloud', auth: true, availability: 'enterprise', notes: 'Connector-dependent' },
  { path: '/enterprise/quantum-attestation', name: 'QuantumAttestation', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/cloud-posture', name: 'CloudPosture', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/conformance-packs', name: 'ConformancePacks', auth: true, availability: 'enterprise', notes: '' },
  { path: '/enterprise/cspm', name: 'EnterpriseCSPM', auth: true, availability: 'enterprise', notes: '' },
  { path: '/modules', name: 'PlatformModules', auth: true, availability: 'enterprise', notes: '' },
  { path: '/modules/:moduleId', name: 'SecurityModule', auth: true, availability: 'enterprise', notes: '' },
];

export function routeByPath(path: string): AppRoute | undefined {
  return APP_ROUTES.find((r) => r.path === path);
}

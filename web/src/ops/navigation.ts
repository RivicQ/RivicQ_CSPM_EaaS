export type OpsSection = 'Operations' | 'Posture' | 'Integrations' | 'Enterprise';

export type OpsRoute = {
  text: string;
  path: string;
  section: OpsSection;
  keywords: string[];
  enterpriseOnly?: boolean;
  adminOnly?: boolean;
  demoOnly?: boolean;
};

/** Minimum IA for an operator console. Marketing/demo items are not primary. */
export const OPS_ROUTES: OpsRoute[] = [
  { text: 'Overview', path: '/dashboard', section: 'Operations', keywords: ['command', 'ciso', 'inbox', 'posture', 'home'] },
  { text: 'Findings', path: '/findings', section: 'Operations', keywords: ['critical', 'high', 'evidence', 'remediation', 'queue'] },
  { text: 'Assets', path: '/assets', section: 'Operations', keywords: ['inventory', 'crypto', 'certificate', 'key'] },
  { text: 'Scans', path: '/scanner', section: 'Operations', keywords: ['cbom', 'github', 'website', 'history', 'failed'] },
  { text: 'CBOM', path: '/bom', section: 'Operations', keywords: ['sbom', 'cspm', 'inventory', 'explorer'] },
  { text: 'PQC Migration', path: '/migration', section: 'Operations', keywords: ['quantum', 'readiness', 'roadmap', 'hybrid'] },

  { text: 'Crypto Posture', path: '/cspm', section: 'Posture', keywords: ['cspm', 'risk', 'score'] },
  { text: 'Governance', path: '/governance', section: 'Posture', keywords: ['compliance', 'controls', 'dora', 'nis2', 'mapping'] },
  { text: 'API Security', path: '/security/api', section: 'Posture', keywords: ['tls', 'https'] },
  { text: 'Reports', path: '/analytics', section: 'Posture', keywords: ['trend', 'export', 'executive'] },

  { text: 'PATH Scanners', path: '/tools', section: 'Integrations', keywords: ['trivy', 'syft', 'gitleaks', 'osv', 'devsecops'] },
  { text: 'Ecosystem', path: '/ecosystem', section: 'Integrations', keywords: ['sdk', 'cli', 'plugin'] },
  { text: 'Pipeline', path: '/pipeline', section: 'Integrations', keywords: ['ci', 'github actions', 'gate'] },
  { text: 'Contact', path: '/contact', section: 'Integrations', keywords: ['hello', 'support', 'sales'] },
  { text: 'IBM Partner Plus', path: '/ibm', section: 'Integrations', keywords: ['ibm', 'partner', 'marketplace', 'cosell'] },
  { text: 'CRM', path: '/crm', section: 'Integrations', keywords: ['leads', 'sales', 'funnel'], adminOnly: true },

  { text: 'HSM & Quantum', path: '/connectors/hsm', section: 'Enterprise', keywords: ['pkcs11', 'ibm', 'hbom'], enterpriseOnly: true },
  { text: 'AIBOM', path: '/security/ai', section: 'Enterprise', keywords: ['ai', 'model', 'aibom'], enterpriseOnly: true },
  { text: 'Cloud Posture', path: '/enterprise/cloud-posture', section: 'Enterprise', keywords: ['aws', 'gcp', 'azure'], enterpriseOnly: true },
  { text: 'Compliance', path: '/enterprise/compliance', section: 'Enterprise', keywords: ['framework', 'gap'], enterpriseOnly: true },
  { text: 'Quantum', path: '/enterprise/quantum', section: 'Enterprise', keywords: ['qiskit', 'attestation'], enterpriseOnly: true },
  { text: 'Multi-Cloud', path: '/enterprise/multicloud', section: 'Enterprise', keywords: ['connector', 'account'], enterpriseOnly: true },
  { text: 'Inventory', path: '/enterprise/inventory', section: 'Enterprise', keywords: ['crud'], enterpriseOnly: true },
  { text: 'CSPM', path: '/enterprise/cspm', section: 'Enterprise', keywords: ['posture'], enterpriseOnly: true },
  { text: 'Conformance Packs', path: '/enterprise/conformance-packs', section: 'Enterprise', keywords: ['cis', 'nist'], enterpriseOnly: true },
  { text: 'Terraform', path: '/enterprise/terraform', section: 'Enterprise', keywords: ['iac'], enterpriseOnly: true },
  { text: 'Modules', path: '/modules', section: 'Enterprise', keywords: ['catalog'], enterpriseOnly: true },
];

export const PALETTE_ACTIONS: Array<{ id: string; label: string; path: string; keywords: string[] }> = [
  { id: 'scan', label: 'Run scan', path: '/scanner', keywords: ['new', 'website', 'github'] },
  { id: 'critical', label: 'View critical findings', path: '/findings?severity=critical', keywords: ['p0', 'high'] },
  { id: 'cbom', label: 'Open CBOM', path: '/bom', keywords: ['inventory'] },
  { id: 'pqc', label: 'View PQC roadmap', path: '/migration', keywords: ['quantum'] },
  { id: 'tools', label: 'PATH scanner integrations', path: '/tools', keywords: ['trivy', 'syft'] },
  { id: 'admin', label: 'Manage users', path: '/admin', keywords: ['sso', 'roles', 'keys'] },
  { id: 'report', label: 'Open reports', path: '/analytics', keywords: ['export'] },
];

export function breadcrumbFor(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: 'RivicQ', path: '/dashboard' }];
  if (pathname.startsWith('/assets/')) {
    crumbs.push({ label: 'Assets', path: '/assets' });
    crumbs.push({ label: 'Asset', path: pathname });
    return crumbs;
  }
  const hit = OPS_ROUTES.find((r) => r.path !== '/dashboard' && (pathname === r.path || pathname.startsWith(r.path + '/')));
  if (hit) {
    crumbs.push({ label: hit.section, path: hit.path });
    crumbs.push({ label: hit.text, path: hit.path });
  } else if (pathname === '/dashboard') {
    crumbs.push({ label: 'Overview', path: '/dashboard' });
  } else if (pathname === '/settings') {
    crumbs.push({ label: 'Settings', path: '/settings' });
  } else if (pathname === '/admin') {
    crumbs.push({ label: 'Administration', path: '/admin' });
  }
  return crumbs;
}

export function titleFor(pathname: string, fallback = 'Overview'): string {
  if (pathname.startsWith('/assets/')) return 'Asset';
  const hit = OPS_ROUTES.find((r) => pathname === r.path);
  if (hit) return hit.text;
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/admin') return 'Administration';
  if (pathname === '/demo') return 'Demo trail';
  return fallback;
}

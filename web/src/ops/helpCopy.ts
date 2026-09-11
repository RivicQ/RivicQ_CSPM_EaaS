const HELP: Record<string, { title: string; body: string }> = {
  '/dashboard': {
    title: 'Overview',
    body: 'This is the operator inbox. Numbers come from scans in this workspace when a backend is running. GitHub Pages is static and cannot show a live estate. Control mappings are not certifications.',
  },
  '/findings': {
    title: 'Findings',
    body: 'Findings are aggregated from completed CBOM scans (GET /scans/findings). Evidence is the scanner payload — not marketing copy. Secret values are never rendered. Bulk assign is not available in Community; export is local.',
  },
  '/assets': {
    title: 'Assets',
    body: 'Cryptographic inventory derived from scans you run. Empty means nothing has been discovered yet — run a scan or the CLI.',
  },
  '/scanner': {
    title: 'Scans',
    body: 'Community can scan websites, hosts, IPs, servers, declared pods, and hardware catalog entries. Progress is only a percent when the API reports one. Failed jobs include the API error when present.',
  },
  '/bom': {
    title: 'CBOM',
    body: 'CBOM and SBOM from GET /bom/unified. QBOM, HBOM, AIBOM, and IBOM are Enterprise layers. Counts of 0 mean that layer has no records in this workspace, not a live cloud estate.',
  },
  '/migration': {
    title: 'PQC migration',
    body: 'Readiness comes from scan intelligence and PQC classes on CBOM findings. RSA-2048 is classified, not automatically marked vulnerable. IBM Quantum hardware is not invoked. QBOM as a product layer is Enterprise.',
  },
  '/governance': {
    title: 'Governance',
    body: 'Framework rows are control mappings for operators. They are not ISO/SOC/PCI certifications.',
  },
  default: {
    title: 'RivicQ workspace',
    body: 'Community is a limited scan engine. Enterprise connectors, SSO ACS, and continuous monitoring need a licensed backend with credentials. Public desks: hello@, sales@, support@, security@, privacy@ rivicq.com.',
  },
};

export function helpFor(pathname: string) {
  if (HELP[pathname]) return HELP[pathname];
  const key = Object.keys(HELP).find((p) => p !== 'default' && pathname.startsWith(p));
  return HELP[key || 'default'];
}

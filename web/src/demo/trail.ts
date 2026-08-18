export type DemoTrailStep = {
  id: string;
  title: string;
  body: string;
  path: string;
  hint?: string;
};

/** Guided product walkthrough. Paths are real app routes — not a slideshow. */
export const DEMO_TRAIL_STEPS: DemoTrailStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RivicQ',
    body: 'Continuous security visibility for your cloud, applications, dependencies, and cryptographic posture. This tour uses labeled DEMO DATA — not customer telemetry.',
    path: '/demo',
    hint: 'Start the tour or jump straight into the command center.',
  },
  {
    id: 'overview',
    title: 'Security overview',
    body: 'This is the command center. Read posture first, then critical risks, then what to fix. Every figure on this dashboard is labeled DEMO or LIVE.',
    path: '/dashboard',
    hint: 'Click a score or finding to open evidence.',
  },
  {
    id: 'cspm',
    title: 'Cloud security posture',
    body: 'CSPM correlates cloud assets, misconfigurations, and cryptographic exposure. Open a finding to see remediation — this is a simulated demo estate.',
    path: '/enterprise/cspm',
    hint: 'Review health score, then drill into at-risk algorithms.',
  },
  {
    id: 'cbom',
    title: 'CryptoBOM inventory',
    body: 'Cryptographic assets, algorithms, libraries, and quantum-vulnerable primitives are inventoried as a CBOM. RSA-2048 is classified, not automatically “vulnerable”.',
    path: '/assets',
    hint: 'Open an asset to see algorithm, key size, and PQC status.',
  },
  {
    id: 'vuln',
    title: 'Vulnerability & dependency scanning',
    body: 'Scan a repository or hostname. Built-in SAST, SCA, secrets, SBOM, CBOM, and IaC feed one policy gate. GitHub scans use a synthetic fixture unless a token is configured.',
    path: '/scanner',
    hint: 'Try the GitHub tab or run a CBOM scan against a hostname.',
  },
  {
    id: 'devsecops',
    title: 'DevSecOps integration',
    body: 'RivicQ sits in CI after commit: secrets, SAST, SCA, SBOM, CBOM, IaC, then policy. The CLI is `rivicq scan .` — this step is a guided explanation, not a live pipeline attach.',
    path: '/tools',
    hint: 'See how scanners map into the intelligence engine.',
  },
  {
    id: 'compliance',
    title: 'Compliance mapping',
    body: 'Controls map to ISO 27001, NIS2, DORA, GDPR, and BSI-oriented crypto guidance. Scores are demo control results, not a certification claim.',
    path: '/enterprise/compliance',
    hint: 'Open a framework to see passed vs failed controls.',
  },
  {
    id: 'remediation',
    title: 'Risk & remediation',
    body: 'Every finding should explain what happened, why it matters, the affected asset, and a recommended fix. Use the drill-down drawer on the command center.',
    path: '/dashboard',
    hint: 'Click a critical finding, then Exit Demo when you are done.',
  },
];

export function clampTrailStep(index: number): number {
  if (index < 0) return 0;
  if (index >= DEMO_TRAIL_STEPS.length) return DEMO_TRAIL_STEPS.length - 1;
  return index;
}

export function trailStepByPath(pathname: string): number {
  const idx = DEMO_TRAIL_STEPS.findIndex((s, i) => i > 0 && s.path === pathname);
  return idx >= 0 ? idx : -1;
}

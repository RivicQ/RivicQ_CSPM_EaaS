export type DemoTrailStep = {
  id: string;
  title: string;
  body: string;
  path: string;
  hint?: string;
};

/** Guided product walkthrough. Community-limited on the live demo. Paths are real app routes. */
export const DEMO_TRAIL_STEPS: DemoTrailStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RivicQ Community',
    body: 'This live demo is the limited Community edition: CBOM scan, dashboard, and discover → mitigate → report. Multi-cloud, SSO, and the DORA pack stay on Enterprise. Sample data is labeled DEMO — not customer telemetry.',
    path: '/demo',
    hint: 'Start the tour or jump into the command center.',
  },
  {
    id: 'overview',
    title: 'Security overview',
    body: 'The command center is the operational home. Read posture first, then findings. Every figure is labeled DEMO or LIVE. Enterprise tiles stay locked until a licensed workspace is selected.',
    path: '/dashboard',
    hint: 'Click a score or finding to open evidence.',
  },
  {
    id: 'cbom',
    title: 'Discover cryptography',
    body: 'Scan a website, host, IP, server, or declared Kubernetes pod. Hardware/QSIC is a catalog declaration, not a shipped chip. Qiskit scores are a local taxonomy — not IBM Quantum hardware.',
    path: '/scanner',
    hint: 'Try https://example.com (website) or pod://prod/api (declared inventory).',
  },
  {
    id: 'assets',
    title: 'Inventory',
    body: 'Cryptographic assets, algorithms, and PQC status land in the CBOM inventory. RSA-2048 is classified (Shor family), not automatically “vulnerable”.',
    path: '/assets',
    hint: 'Open an asset to see algorithm, key size, and PQC status.',
  },
  {
    id: 'devsecops',
    title: 'CLI and GitHub Action',
    body: 'Community includes `rivicq scan .` and the policy gate. The GitHub Action can fail CI on BLOCK findings. This step explains the path — it does not attach to your pipeline.',
    path: '/tools',
    hint: 'See how scanners map into the intelligence engine.',
  },
  {
    id: 'cspm',
    title: 'Limited posture view',
    body: 'Community shows cryptographic posture from scans you run. Cloud account CSPM, conformance packs, and multi-cloud inventory are Enterprise and need customer credentials.',
    path: '/cspm',
    hint: 'This page stays honest when the API is empty.',
  },
  {
    id: 'editions',
    title: 'Enterprise is licensed',
    body: 'SSO, audit, API keys, DORA pack, live Kubernetes attach, and cloud/HSM/quantum connectors are Enterprise. Switching edition on Pages is a UI preference, not a license grant.',
    path: '/switcher',
    hint: 'Read what Community locks before you evaluate Enterprise.',
  },
  {
    id: 'remediation',
    title: 'Mitigate and report',
    body: 'Intelligence maps findings to ML-KEM / ML-DSA / SLH-DSA and DORA RTS / NIS2 / BSI controls. Community exports JSON CBOM. Enterprise adds the evidence pack. Exit Demo when you are done.',
    path: '/dashboard',
    hint: 'Open a finding, then Exit Demo.',
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

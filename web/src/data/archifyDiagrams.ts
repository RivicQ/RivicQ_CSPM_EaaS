/**
 * Source of truth: archify/site/index.html#diagrams
 * Live: https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#diagrams
 *
 * Use:
 *   embed  → `{file}?embed=1&theme=dark` inside an iframe plate
 *   present → `{file}?present=1` for a full-page open
 */
export const ARCHIFY_BASE = `${process.env.PUBLIC_URL || ''}/archify`;
export const ARCHIFY_SITE = `${ARCHIFY_BASE}/site/index.html`;
export const ARCHIFY_DIAGRAMS_HUB = `${ARCHIFY_SITE}#diagrams`;

export type ArchifyDiagramId =
  | 'architecture'
  | 'dataflow'
  | 'lifecycle'
  | 'operator'
  | 'analysis'
  | 'compliance'
  | 'pqc'
  | 'scanning'
  | 'roadmap';

export type ArchifyDiagram = {
  id: ArchifyDiagramId;
  file: string;
  kind: string;
  question: string;
  title: string;
  description: string;
  previewTitle: string;
};

export const ARCHIFY_DIAGRAMS: readonly ArchifyDiagram[] = [
  {
    id: 'architecture',
    file: 'rivicq-architecture.html',
    kind: 'Architecture',
    question: 'What is RivicQ made of?',
    title: 'One engine, two editions',
    description:
      'Control plane, auth boundary, scanners, policy gate, BOM layer, and store — Community OSS and Enterprise sharing one engine.',
    previewTitle: 'RivicQ Platform Architecture preview',
  },
  {
    id: 'dataflow',
    file: 'rivicq-dataflow.html',
    kind: 'Data flow',
    question: 'Where does every crypto asset go?',
    title: 'Discover → Analyze → Deliver',
    description:
      'Asset sources, built-in scanners, profiles, intelligence, then BOMs, evidence, and surfaces in one left-to-right journey.',
    previewTitle: 'RivicQ asset data flow preview',
  },
  {
    id: 'lifecycle',
    file: 'rivicq-lifecycle.html',
    kind: 'Lifecycle',
    question: 'Where does each finding stand now?',
    title: 'Waits, retries, honest endings',
    description:
      'Discovered → triaged → planned → migrating → remediated — with unassigned pauses, re-scan recovery, and documented terminals.',
    previewTitle: 'RivicQ finding lifecycle preview',
  },
  {
    id: 'operator',
    file: 'rivicq-cspm-operator-workflow.html',
    kind: 'Workflow',
    question: 'How does an operator scan run?',
    title: 'Discover → Gate → CBOM',
    description:
      'Console or CLI posts a scan, the engine fingerprints and classifies, the policy gate decides, QBOM stays Enterprise (403 on OSS), and the CBOM report publishes.',
    previewTitle: 'RivicQ operator workflow preview',
  },
  {
    id: 'analysis',
    file: 'rivicq-analysis-workflow.html',
    kind: 'Workflow',
    question: 'What happens to each artifact?',
    title: 'Fingerprint → Gate → Evidence',
    description:
      'Every artifact is fingerprinted, classified deterministically, gated as BLOCK / WARN / PASS, and published with a signed evidence pack.',
    previewTitle: 'RivicQ analysis pipeline preview',
  },
  {
    id: 'compliance',
    file: 'rivicq-compliance-workflow.html',
    kind: 'Workflow',
    question: 'How does evidence get trusted?',
    title: 'Map standards, attest, or waive',
    description:
      'Collect, normalize once, map to DORA / BSI / eIDAS / NIST / ISO, then attest or issue a time-boxed waiver — evidence retained and signed.',
    previewTitle: 'RivicQ compliance evidence preview',
  },
  {
    id: 'pqc',
    file: 'rivicq-pqc-migration.html',
    kind: 'Workflow',
    question: 'How do you reach quantum readiness?',
    title: 'Inventory → Hybrid → Attest',
    description:
      'Classify every algorithm, plan ML-KEM / ML-DSA hybrids, roll out in phases, and verify before / after with a fresh scan.',
    previewTitle: 'RivicQ PQC migration preview',
  },
  {
    id: 'scanning',
    file: 'rivicq-scanning-sequence.html',
    kind: 'Sequence',
    question: 'Who says what during a scan?',
    title: 'Auth first, evidence always',
    description:
      'Console → API → Authn/RBAC → Scanner → BOM store → evidence, with every return and audit event in order.',
    previewTitle: 'RivicQ scan request sequence preview',
  },
  {
    id: 'roadmap',
    file: 'rivicq-roadmap.html',
    kind: 'Workflow',
    question: 'What ships, and when?',
    title: 'Now → Next → Later',
    description:
      'Community, Enterprise, partner programs, and quantum across three horizons — shipped markers on real items, not adjectives.',
    previewTitle: 'RivicQ delivery roadmap preview',
  },
];

const catalogById = (): Record<ArchifyDiagramId, ArchifyDiagram> => {
  const empty: Partial<Record<ArchifyDiagramId, ArchifyDiagram>> = {};
  for (const d of ARCHIFY_DIAGRAMS) empty[d.id] = d;
  const missing = (['architecture', 'dataflow', 'lifecycle', 'operator', 'analysis', 'compliance', 'pqc', 'scanning', 'roadmap'] as const)
    .filter((id) => !empty[id]);
  if (missing.length > 0) {
    throw new Error(`Archify catalog missing: ${missing.join(', ')}`);
  }
  return empty as Record<ArchifyDiagramId, ArchifyDiagram>;
};

const ARCHIFY_BY_ID = catalogById();

export const archifyDiagram = (id: ArchifyDiagramId): ArchifyDiagram => ARCHIFY_BY_ID[id];

export const archifyDiagramHref = (file: string, mode: 'embed' | 'present'): string => {
  const q = mode === 'embed' ? 'embed=1&theme=dark' : 'present=1';
  return `${ARCHIFY_BASE}/diagrams/${file}?${q}`;
};

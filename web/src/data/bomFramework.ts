export type BomLayerId = 'cbom' | 'qbom' | 'sbom' | 'aibom' | 'ibom';

export type BomLayer = {
  id: BomLayerId;
  name: string;
  role: string;
  community: boolean;
  enabled: boolean;
  regulations: string[];
  honesty: string;
};

export type PipelineStage = {
  id: number;
  name: string;
  boms: BomLayerId[];
  action: string;
  artifact: string;
  oss: boolean;
};

export const BOM_LAYERS: BomLayer[] = [
  {
    id: 'cbom', name: 'CBOM', role: 'Cryptographic inventory — algorithms, keys, certs, libraries',
    community: true, enabled: true,
    regulations: ['DORA RTS Art. 9', 'NIS2 Art. 21', 'FIPS 140-3'],
    honesty: 'Primary Apache-2.0 product. Shared engine for both editions.',
  },
  {
    id: 'qbom', name: 'QBOM', role: 'Quantum vulnerability, CRQC urgency, PQC replacement',
    community: true, enabled: true,
    regulations: ['NIST IR 8105', 'FIPS 203/204/205'],
    honesty: 'Local Shor/Grover/PQC taxonomy. Not IBM Quantum hardware.',
  },
  {
    id: 'sbom', name: 'SBOM', role: 'Software components with a crypto-library flag',
    community: true, enabled: true,
    regulations: ['US EO 14028', 'EU CRA', 'DORA RTS Art. 9(4)'],
    honesty: 'From lockfiles / local path. Optional Syft/Trivy when installed.',
  },
  {
    id: 'aibom', name: 'AIBOM', role: 'AI/ML provenance, EU AI Act risk tier, serving crypto',
    community: false, enabled: false,
    regulations: ['EU AI Act Art. 6', 'NIST AI RMF'],
    honesty: 'Enterprise declared inventory. Not a live model-weight scanner.',
  },
  {
    id: 'ibom', name: 'IBOM', role: 'Human, machine, and service identities bound to crypto assets',
    community: false, enabled: false,
    regulations: ['NIST SP 800-207', 'Zero Trust'],
    honesty: 'Enterprise directory / NHI connector. Community still scans secrets into CBOM.',
  },
];

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 1, name: 'Developer IDE', boms: ['qbom', 'ibom'], action: 'Crypto API lint + secrets scan', artifact: 'Pre-commit violations', oss: true },
  { id: 2, name: 'Source commit', boms: ['sbom'], action: 'cdxgen / syft from lock files', artifact: 'SBOM JSON', oss: true },
  { id: 3, name: 'CI/CD build', boms: ['cbom', 'qbom', 'sbom', 'aibom', 'ibom'], action: 'rivicq scan . — unified merge', artifact: 'unified-bom.cdx.json', oss: true },
  { id: 4, name: 'Container scan', boms: ['cbom', 'sbom'], action: 'Optional Trivy/Grype + crypto libs', artifact: 'Container CBOM patch', oss: true },
  { id: 5, name: 'Staging deploy', boms: ['cbom', 'qbom'], action: 'TLS/HTTPS + QBOM scoring', artifact: 'CBOM report JSON', oss: true },
  { id: 6, name: 'Security gate', boms: ['cbom', 'qbom', 'sbom'], action: 'Policy gate BLOCK / WARN / ALLOW', artifact: 'Pass / block', oss: true },
  { id: 7, name: 'Production', boms: ['cbom', 'ibom'], action: 'Continuous EaaS monitoring', artifact: 'Live dashboard', oss: false },
  { id: 8, name: 'Compliance report', boms: ['cbom', 'qbom', 'sbom', 'aibom', 'ibom'], action: 'DORA / NIS2 / SOC 2 mappings', artifact: 'JSON or Enterprise pack', oss: true },
];

export const GOVERNANCE_CONTROLS = [
  { framework: 'DORA RTS', control: 'Art. 9 ICT + crypto inventory', bom: 'cbom', community: true },
  { framework: 'NIS2', control: 'Art. 21 cryptographic measures', bom: 'qbom', community: true },
  { framework: 'EU AI Act', control: 'Art. 6 / Annex IV documentation', bom: 'aibom', community: false },
  { framework: 'EU CRA', control: 'Software component transparency', bom: 'sbom', community: true },
  { framework: 'NIST SP 800-207', control: 'Zero Trust identity inventory', bom: 'ibom', community: false },
  { framework: 'FIPS 203/204/205', control: 'PQC migration mapping', bom: 'qbom', community: true },
  { framework: 'BSI TR-02102', control: 'Algorithm strength', bom: 'cbom', community: true },
  { framework: 'FIPS 140-3', control: 'Module inventory (declared HSM/QSIC)', bom: 'cbom', community: true },
];

export function layersForEdition(paid: boolean): BomLayer[] {
  return BOM_LAYERS.map((l) => ({ ...l, enabled: l.community || paid }));
}

import type { Provenance } from './types';

/**
 * Competitive / market intelligence. NEVER mixed into customer CSPM telemetry.
 * Figures are cited from named public research; estimates disagree by methodology.
 */
export type MarketEstimate = {
  label: string;
  value: string;
  note: string;
  provenance: Provenance;
};

export const MARKET_INTELLIGENCE: MarketEstimate[] = [
  {
    label: 'CSPM spending 2025 (Gartner, secondary report)',
    value: 'USD 4.7B',
    note: 'Cited via Software Strategies Blog summary of Gartner 2026 forecast. Primary Gartner document is paywalled; treat as a secondary citation.',
    provenance: {
      kind: 'benchmark',
      source: 'Software Strategies Blog summary of Gartner 2026 information security forecast',
      sourceUrl: 'https://softwarestrategiesblog.com/2026/04/01/top-10-fastest-growing-security-categories-gartner-2026-forecast/',
      publicationDate: '2026-04-01',
      retrievedAt: '2026-08-18',
      datasetVersion: 'gartner-2026-forecast-secondary',
      metricDefinition: 'Worldwide CSPM category spending in 2025 as reported in a secondary summary of Gartner figures.',
    },
  },
  {
    label: 'CSPM market 2024 (Grand View Research)',
    value: 'USD 5.75B',
    note: 'Grand View Research public snapshot; CAGR 10.3% 2025–2030. Not comparable 1:1 with Gartner category definitions.',
    provenance: {
      kind: 'benchmark',
      source: 'Grand View Research — Cloud Security Posture Management Market',
      sourceUrl: 'https://www.grandviewresearch.com/industry-analysis/cloud-security-posture-management-market-report',
      publicationDate: '2025-01-01',
      retrievedAt: '2026-08-18',
      datasetVersion: 'gvr-cspm-public-snapshot',
      metricDefinition: 'Vendor research estimate of global CSPM market size in 2024.',
    },
  },
  {
    label: 'CSPM market 2025 (Fortune Business Insights)',
    value: 'USD 3.14B',
    note: 'Public FBI snapshot; CAGR 24.2% 2026–2034. Range vs Gartner/GVR shows methodology variance — do not collapse to a single number.',
    provenance: {
      kind: 'benchmark',
      source: 'Fortune Business Insights — CSPM market',
      sourceUrl: 'https://www.fortunebusinessinsights.com/cloud-security-posture-management-market-113864',
      publicationDate: '2026-01-01',
      retrievedAt: '2026-08-18',
      datasetVersion: 'fbi-cspm-public-snapshot',
      metricDefinition: 'Vendor research estimate of global CSPM market size in 2025.',
    },
  },
];

export type CapabilityMark = 'yes' | 'partial' | 'unknown';

export type CompetitorRow = {
  capability: string;
  rivicq: CapabilityMark;
  wiz: CapabilityMark;
  prisma: CapabilityMark;
  orca: CapabilityMark;
  tenable: CapabilityMark;
  note: string;
};

/**
 * Only capabilities that are publicly marketed are marked yes.
 * PQC / CryptoBOM for competitors is Unknown — not publicly verified here.
 */
export const COMPETITIVE_MATRIX: CompetitorRow[] = [
  { capability: 'CSPM', rivicq: 'yes', wiz: 'yes', prisma: 'yes', orca: 'yes', tenable: 'yes', note: 'Public product category for each vendor.' },
  { capability: 'CNAPP', rivicq: 'partial', wiz: 'yes', prisma: 'yes', orca: 'yes', tenable: 'yes', note: 'RivicQ is crypto-posture first; full CNAPP coverage is not claimed.' },
  { capability: 'CIEM', rivicq: 'partial', wiz: 'yes', prisma: 'yes', orca: 'yes', tenable: 'unknown', note: 'Tenable CIEM packaging not verified in this snapshot.' },
  { capability: 'KSPM', rivicq: 'partial', wiz: 'yes', prisma: 'yes', orca: 'yes', tenable: 'yes', note: 'RivicQ inventories Kubernetes crypto/config; not a full KSPM suite.' },
  { capability: 'DSPM', rivicq: 'unknown', wiz: 'yes', prisma: 'yes', orca: 'yes', tenable: 'unknown', note: 'RivicQ does not claim DSPM. Competitor DSPM depth not independently audited.' },
  { capability: 'Compliance', rivicq: 'yes', wiz: 'yes', prisma: 'yes', orca: 'yes', tenable: 'yes', note: 'Framework mapping is publicly marketed across the set.' },
  { capability: 'AI remediation', rivicq: 'partial', wiz: 'unknown', prisma: 'unknown', orca: 'unknown', tenable: 'unknown', note: 'Assistant exists in RivicQ; competitor AI remediation claims are not verified here.' },
  { capability: 'PQC / crypto security', rivicq: 'yes', wiz: 'unknown', prisma: 'unknown', orca: 'unknown', tenable: 'unknown', note: 'Not publicly verified for listed competitors in this snapshot.' },
  { capability: 'CryptoBOM', rivicq: 'yes', wiz: 'unknown', prisma: 'unknown', orca: 'unknown', tenable: 'unknown', note: 'CycloneDX/SPDX CBOM is a RivicQ product surface. Competitor CBOM support not verified.' },
  { capability: 'Crypto-agility', rivicq: 'yes', wiz: 'unknown', prisma: 'unknown', orca: 'unknown', tenable: 'unknown', note: 'Not publicly verified for listed competitors.' },
];

export const CAPABILITY_LABEL: Record<CapabilityMark, string> = {
  yes: 'Yes',
  partial: 'Partial',
  unknown: 'Not publicly verified',
};

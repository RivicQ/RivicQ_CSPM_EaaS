import type { Provenance } from './types';

const RETRIEVED = '2026-08-18';

export const PROVENANCE = {
  nvd: (cve: string, published: string): Provenance => ({
    kind: 'intel',
    source: 'NVD CVE API 2.0',
    sourceUrl: `https://nvd.nist.gov/vuln/detail/${cve}`,
    publicationDate: published,
    retrievedAt: RETRIEVED,
    datasetVersion: 'nvd-2.0',
    metricDefinition: 'NVD CVSS base score and CWE for a published CVE identifier.',
  }),
  cisaKev: {
    kind: 'intel',
    source: 'CISA Known Exploited Vulnerabilities Catalog',
    sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    publicationDate: '2026-08-17',
    retrievedAt: RETRIEVED,
    datasetVersion: '2026.08.17',
    metricDefinition: 'Whether CISA has listed the CVE as known to be exploited in the wild.',
  } satisfies Provenance,
  epss: {
    kind: 'intel',
    source: 'FIRST.org EPSS',
    sourceUrl: 'https://www.first.org/epss/',
    publicationDate: '2026-08-17',
    retrievedAt: RETRIEVED,
    datasetVersion: 'epss-2026-08-17',
    metricDefinition: 'Estimated probability that a CVE will be exploited in the next 30 days.',
  } satisfies Provenance,
  gcthH1_2025: {
    kind: 'benchmark',
    source: 'Google Cloud Threat Horizons H2 2025 (H1 2025 observations)',
    sourceUrl: 'https://cloud.google.com/security/report/resources/cloud-threat-horizons-report-h2-2025',
    publicationDate: '2025-07-01',
    retrievedAt: RETRIEVED,
    datasetVersion: 'gcth-h2-2025-fig1',
    metricDefinition:
      'Share of Google Cloud–observed cloud initial-access incidents in H1 2025. Not RivicQ telemetry.',
  } satisfies Provenance,
  simulation: {
    kind: 'demo',
    source: 'RivicQ enterprise simulation',
    retrievedAt: RETRIEVED,
    datasetVersion: 'enterprise-sim-v1.0',
    metricDefinition:
      'Deterministic simulated multi-cloud estate used when live connectors are not attached. Counts are generated, not observed customer telemetry.',
  } satisfies Provenance,
  calculated: {
    kind: 'calculated',
    source: 'RivicQ scoring engine',
    retrievedAt: RETRIEVED,
    datasetVersion: 'posture-v1.0',
    metricDefinition:
      'Derived from simulated or live inventory, findings, exposure, KEV presence, and control results. See score contributors.',
  } satisfies Provenance,
  live: {
    kind: 'live',
    source: 'Connected RivicQ APIs',
    retrievedAt: RETRIEVED,
    datasetVersion: 'live',
    metricDefinition: 'Values returned by inventory, CSPM, compliance, or scan APIs for this tenant.',
  } satisfies Provenance,
};

/** Industry initial-access mix — Google Cloud Threat Horizons, H1 2025 observations. */
export const INDUSTRY_INITIAL_ACCESS = [
  {
    label: 'Weak or absent credentials',
    percent: 47.1,
    provenance: PROVENANCE.gcthH1_2025,
  },
  {
    label: 'Misconfigurations',
    percent: 29.4,
    provenance: PROVENANCE.gcthH1_2025,
  },
  {
    label: 'API / UI compromise',
    percent: 11.8,
    provenance: PROVENANCE.gcthH1_2025,
  },
  {
    label: 'Leaked credentials',
    percent: 2.9,
    provenance: PROVENANCE.gcthH1_2025,
  },
] as const;

export const DATA_KIND_LABEL: Record<string, string> = {
  live: 'LIVE',
  demo: 'DEMO',
  benchmark: 'BENCHMARK',
  intel: 'THREAT INTEL',
  calculated: 'CALCULATED',
};

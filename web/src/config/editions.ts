import axios from 'axios';

export const OSS_PORT = 8080;
export const ENTERPRISE_PORT = 9090;
export const API_PREFIX = '/api/v1';

export type Edition = 'community' | 'professional' | 'enterprise';

export const EDITIONS: Edition[] = ['community', 'professional', 'enterprise'];

export const normalizeEdition = (raw: string | null | undefined): Edition => {
  switch ((raw || '').toLowerCase()) {
    case 'oss':
    case 'community':
      return 'community';
    case 'professional':
    case 'pro':
      return 'professional';
    case 'enterprise':
      return 'enterprise';
    default:
      return 'community';
  }
};

export const isPaidEdition = (edition: Edition): boolean =>
  edition === 'professional' || edition === 'enterprise';

export const isEnterpriseEdition = (edition: Edition): boolean =>
  edition === 'enterprise';

function detectBaseURL(): string {
  try {
    const stored = localStorage.getItem('api_base_url');
    if (stored) return normalizeAPIBaseURL(stored);
  } catch {}
  const env = process.env.REACT_APP_API_URL;
  if (env) return normalizeAPIBaseURL(env);
  return API_PREFIX;
}

export function normalizeAPIBaseURL(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  if (trimmed.endsWith(API_PREFIX)) return trimmed;
  if (trimmed.match(/:\d+$/)) return `${trimmed}${API_PREFIX}`;
  return trimmed;
}

let apiBaseURL = detectBaseURL();

export function getAPIBaseURL(): string {
  return apiBaseURL;
}

export function setAPIBaseURL(url: string): void {
  apiBaseURL = normalizeAPIBaseURL(url);
  try {
    localStorage.setItem('api_base_url', url);
  } catch {}
}

export const COMMUNITY_CONFIG = {
  edition: 'community',
  name: 'RivicQ Community',
  features: {
    dashboard: true,
    assetInventory: true,
    scanner: true,
    analytics: true,
    settings: true,
    cspm: false,
    qbom: true,
    eaas: false,
    recovery: false,
    integrations: false,
    pricing: false,
    enterprise: false,
    multiCloud: false,
    quantum: false,
    cncf: false,
    compliance: false,
    terraform: false,
    ibmCloud: false,
    awsCloud: false,
    quantumAttestation: false,
    gitHubScanning: true,
    agenticSecurity: false,
    crosschainProtocol: false,
    aiSecurity: false,
    identity: false,
    supplyChain: false,
    dspm: false,
    threatIntel: false,
    vulnerability: false,
    apiSecurity: true,
    incidentResponse: false,
    aibom: false,
    ibom: false,
    fiveBom: true,
    hsmConnector: false,
    pipeline: true,
  },
};

export const PROFESSIONAL_CONFIG = {
  edition: 'professional',
  name: 'RivicQ Professional',
  features: {
    dashboard: true,
    assetInventory: true,
    scanner: true,
    analytics: true,
    settings: true,
    cspm: true,
    qbom: true,
    eaas: true,
    recovery: true,
    integrations: true,
    pricing: false,
    enterprise: true,
    multiCloud: true,
    quantum: false,
    cncf: true,
    compliance: true,
    terraform: true,
    ibmCloud: false,
    awsCloud: true,
    quantumAttestation: false,
    gitHubScanning: true,
    agenticSecurity: true,
    crosschainProtocol: true,
    aiSecurity: true,
    identity: true,
    supplyChain: true,
    dspm: true,
    threatIntel: true,
    vulnerability: true,
    apiSecurity: true,
    incidentResponse: true,
    aibom: true,
    ibom: true,
    fiveBom: true,
    hsmConnector: false,
    pipeline: true,
  },
};

export const ENTERPRISE_CONFIG = {
  edition: 'enterprise',
  name: 'RivicQ Enterprise',
  features: {
    dashboard: true,
    assetInventory: true,
    scanner: true,
    analytics: true,
    settings: true,
    cspm: true,
    qbom: true,
    eaas: true,
    recovery: true,
    integrations: true,
    pricing: false,
    enterprise: true,
    multiCloud: true,
    quantum: true,
    cncf: true,
    compliance: true,
    terraform: true,
    ibmCloud: true,
    awsCloud: true,
    quantumAttestation: true,
    gitHubScanning: true,
    agenticSecurity: true,
    crosschainProtocol: true,
    aiSecurity: true,
    identity: true,
    supplyChain: true,
    dspm: true,
    threatIntel: true,
    vulnerability: true,
    apiSecurity: true,
    incidentResponse: true,
    aibom: true,
    ibom: true,
    fiveBom: true,
    hsmConnector: true,
    pipeline: true,
  },
};

export type EditionConfig = typeof COMMUNITY_CONFIG;

const EDITION_CONFIGS: Record<Edition, EditionConfig> = {
  community: COMMUNITY_CONFIG,
  professional: PROFESSIONAL_CONFIG,
  enterprise: ENTERPRISE_CONFIG,
};

export const getEditionConfig = (): EditionConfig => {
  const raw = (() => {
    try {
      return localStorage.getItem('app_edition') || process.env.REACT_APP_EDITION || 'community';
    } catch {
      return process.env.REACT_APP_EDITION || 'community';
    }
  })();
  return EDITION_CONFIGS[normalizeEdition(raw)];
};

export const setEditionPreference = (edition: Edition) => {
  try {
    localStorage.setItem('app_edition', edition);
  } catch {}
};

const editionClient = axios.create({ timeout: 3000 });

export const getEditionFromBackend = async (): Promise<{ edition: string; features: Record<string, any>; baseURL: string } | null> => {
  // Port probing is only valid in local dev (http://localhost). On https
  // deployments (GitHub Pages, production) plain-http probes are mixed
  // content and always fail, so skip them entirely.
  const host = window.location.hostname;
  const isLocalHttp =
    window.location.protocol === 'http:' &&
    (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local'));

  if (isLocalHttp) {
    for (const port of [OSS_PORT, ENTERPRISE_PORT]) {
      try {
        // Try the backend directly on each port for edition detection.
        const resp = await editionClient.get(`http://${host}:${port}/edition`, { timeout: 2000 });
        if (resp.data && resp.data.edition) {
          const detectedURL = `http://${host}:${port}${API_PREFIX}`;
          setAPIBaseURL(detectedURL);
          return { ...resp.data, baseURL: detectedURL };
        }
      } catch {
        continue;
      }
    }
  }
  return null;
};

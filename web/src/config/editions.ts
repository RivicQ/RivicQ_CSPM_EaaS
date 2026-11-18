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

function normalizeAPIBaseURL(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return API_PREFIX;
  if (trimmed.endsWith(API_PREFIX)) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || /^\/[^/]/.test(trimmed) || trimmed === '') {
    return `${trimmed}${API_PREFIX}`;
  }
  return trimmed;
}

function configuredBaseURL(): string {
  const env = process.env.REACT_APP_API_URL;
  if (env && env.trim()) return normalizeAPIBaseURL(env.trim());
  return API_PREFIX;
}

export function getAPIBaseURL(): string {
  return configuredBaseURL();
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
    qbom: false,
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
    fiveBom: false,
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
    qbom: false,
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
    aibom: false,
    ibom: false,
    fiveBom: false,
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

export const getEditionConfig = (edition?: string | null): EditionConfig => {
  return EDITION_CONFIGS[normalizeEdition(edition)];
};

// Kept for non-entitlement UI hints only; must not be treated as entitlement.
export const setEditionPreference = (_edition: Edition) => {
  void _edition;
};

const editionClient = axios.create({ timeout: 3000 });

export const getEditionFromBackend = async (): Promise<{ edition: string; features: Record<string, any>; baseURL: string } | null> => {
  const host = window.location.hostname;
  const isLocalHttp =
    window.location.protocol === 'http:' &&
    (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local'));

  const candidates: string[] = [];
  const configured = configuredBaseURL();
  if (configured) {
    if (/^https?:\/\//i.test(configured)) {
      candidates.push(configured.replace(/\/api\/v1\/?$/, ''));
    } else if (!isLocalHttp) {
      // same-origin / configured path on https deployments
      candidates.push('');
    }
  }

  if (isLocalHttp) {
    const env = process.env.REACT_APP_API_URL;
    const portMatch = env ? env.match(/https?:\/\/[^/]+:(\d+)/) : null;
    const ports = [portMatch ? Number(portMatch[1]) : null, OSS_PORT, ENTERPRISE_PORT].filter(
      (p): p is number => p !== null
    );
    for (const port of ports.filter((p, i) => ports.indexOf(p) === i)) {
      candidates.push(`http://${host}:${port}`);
    }
  }

  for (const origin of candidates.filter((v, i, a) => a.indexOf(v) === i)) {
    try {
      const base = origin ? origin.replace(/\/+$/, '') : '';
      const resp = await editionClient.get(`${base}/edition`, { timeout: 2000 });
      if (resp.data && resp.data.edition) {
        return { ...resp.data, baseURL: getAPIBaseURL() };
      }
    } catch {
      continue;
    }
  }
  return null;
};

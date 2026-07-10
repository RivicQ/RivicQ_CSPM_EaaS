import axios from 'axios';

export const OSS_PORT = 8080;
export const ENTERPRISE_PORT = 9090;
export const API_PREFIX = '/api/v1';

function detectBaseURL(): string {
  try {
    const stored = localStorage.getItem('api_base_url');
    if (stored) return stored;
  } catch {}
  return process.env.REACT_APP_API_URL || `/api/v1`;
}

let apiBaseURL = detectBaseURL();

export function getAPIBaseURL(): string {
  return apiBaseURL;
}

export function setAPIBaseURL(url: string): void {
  apiBaseURL = url;
  try {
    localStorage.setItem('api_base_url', url);
  } catch {}
}

export const OSS_CONFIG = {
  edition: 'oss',
  name: 'CryptoBOM OSS',
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
    agenticSecurity: true,
    crosschainProtocol: true,
  },
};

export const ENTERPRISE_CONFIG = {
  edition: 'enterprise',
  name: 'CryptoBOM Enterprise',
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
  },
};

export type EditionConfig = typeof OSS_CONFIG;

export const getEditionConfig = (): EditionConfig => {
  const edition = (() => {
    try {
      return localStorage.getItem('app_edition') || process.env.REACT_APP_EDITION || 'oss';
    } catch {
      return process.env.REACT_APP_EDITION || 'oss';
    }
  })();
  return edition === 'enterprise' ? ENTERPRISE_CONFIG : OSS_CONFIG;
};

export const setEditionPreference = (edition: 'oss' | 'enterprise') => {
  try {
    localStorage.setItem('app_edition', edition);
  } catch {}
};

const editionClient = axios.create({ timeout: 3000 });

export const getEditionFromBackend = async (): Promise<{ edition: string; features: Record<string, any>; baseURL: string } | null> => {
  // Try direct proxy port first (dev: CRA proxy forwards /edition to the backend)
  const proxyBase = process.env.REACT_APP_API_URL || window.location.origin;

  for (const port of [OSS_PORT, ENTERPRISE_PORT]) {
    try {
      // In dev mode, CRA proxy handles requests to the backend.
      // Try the backend directly on each port for edition detection.
      const host = window.location.hostname;
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
  return null;
};

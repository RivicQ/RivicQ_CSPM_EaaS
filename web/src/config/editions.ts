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
  } catch {
    // ignore storage failures in restricted environments
  }
};

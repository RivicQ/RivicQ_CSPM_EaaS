// Edition configuration for CryptoBOM SaaS OSS vs Enterprise feature gating.
export type Edition = 'oss' | 'enterprise';

export interface EditionFeatures {
  ibmCloudIntegration: boolean;
  awsHSMIntegration: boolean;
  quantumAttestation: boolean;
  multiCloudInventory: boolean;
  complianceReporting: boolean;
  ssoSAML: boolean;
  auditLog: boolean;
  apiRateLimit: number; // -1 = unlimited
}

export interface EditionConfig {
  edition: Edition;
  features: EditionFeatures;
}

export const OSS_CONFIG: EditionConfig = {
  edition: 'oss',
  features: {
    ibmCloudIntegration: false,
    awsHSMIntegration: false,
    quantumAttestation: false,
    multiCloudInventory: false,
    complianceReporting: false,
    ssoSAML: false,
    auditLog: false,
    apiRateLimit: 100,
  },
};

export const ENTERPRISE_CONFIG: EditionConfig = {
  edition: 'enterprise',
  features: {
    ibmCloudIntegration: true,
    awsHSMIntegration: true,
    quantumAttestation: true,
    multiCloudInventory: true,
    complianceReporting: true,
    ssoSAML: true,
    auditLog: true,
    apiRateLimit: -1,
  },
};

/** Returns the active edition config based on env var or localStorage override. */
export function getEditionConfig(): EditionConfig {
  const env = process.env.REACT_APP_EDITION || localStorage.getItem('cryptobom_edition') || 'oss';
  return env === 'enterprise' ? ENTERPRISE_CONFIG : OSS_CONFIG;
}

export function isEnterprise(): boolean {
  return getEditionConfig().edition === 'enterprise';
}

export function hasFeature(feature: keyof EditionFeatures): boolean {
  return getEditionConfig().features[feature] as boolean;
}

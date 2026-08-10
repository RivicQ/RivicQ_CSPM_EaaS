import axios from 'axios';
import { getAPIBaseURL, setAPIBaseURL, Edition } from '../config/editions';

const api = axios.create({
  baseURL: getAPIBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-update base URL when edition detection changes it
export function syncAPIBaseURL(): void {
  const url = getAPIBaseURL();
  if (api.defaults.baseURL !== url) {
    api.defaults.baseURL = url;
  }
}

// Allow external code to update the API base URL at runtime
export { setAPIBaseURL, getAPIBaseURL };

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || '';
    // Auth endpoints fail with 401/403 for invalid credentials — do NOT treat
    // those as an expired session. Letting the interceptor redirect here would
    // reload the page mid-login and swallow the real error message.
    const isAuthCall = /\/auth\/(login|register|mfa|refresh|demo|me)/.test(url);
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Redirect to the login route under the app's router basename so it
      // works both in dev (/platform) and on GitHub Pages (/CSPM/).
      const base = process.env.PUBLIC_URL || '/platform';
      window.location.href = `${window.location.origin}${base}/login`;
    }
    return Promise.reject(error);
  }
);

export const inventoryService = {
  getAssets: (params?: { category?: string; cloud_provider?: string }) =>
    api.get('/inventory/assets', { params }),
  
  getAsset: (id: string) =>
    api.get(`/inventory/assets/${id}`),
  
  createAsset: (data: any) =>
    api.post('/inventory/assets', data),
  
  updateAsset: (id: string, data: any) =>
    api.put(`/inventory/assets/${id}`, data),
  
  deleteAsset: (id: string) =>
    api.delete(`/inventory/assets/${id}`),
  
  getAssetsByCategory: (category: string) =>
    api.get(`/inventory/assets/category/${category}`),
  
  getAssetsByCloud: (provider: string) =>
    api.get(`/inventory/assets/cloud/${provider}`),
  
  getCryptoAssets: () =>
    api.get('/inventory/crypto'),
  
  scanCryptoAssets: (assetIds: string[]) =>
    api.post('/inventory/crypto/scan', { asset_ids: assetIds }),
  
  getAIAssets: () =>
    api.get('/inventory/ai'),
  
  registerAIModel: (data: any) =>
    api.post('/inventory/ai/models', data),
  
  getHardwareAssets: () =>
    api.get('/inventory/hardware'),
  
  discoverHardware: () =>
    api.post('/inventory/hardware/discover'),
  
  getSoftwareAssets: () =>
    api.get('/inventory/software'),
  
  importSBOM: (data: any) =>
    api.post('/inventory/software/sbom', data),
  
  getInfrastructureAssets: () =>
    api.get('/inventory/infrastructure'),
  
  syncInfrastructure: () =>
    api.post('/inventory/infrastructure/sync'),
  
  getInventorySummary: () =>
    api.get('/inventory/summary'),
  
  exportInventory: (format: string = 'json') =>
    api.get('/inventory/export', { params: { format } }),
};

export const authService = {
  login: async (data: { email: string; password: string; edition?: Edition }) => {
    return api.post('/auth/login', data);
  },

  register: async (data: { name: string; email: string; password: string; edition?: Edition }) => {
    return api.post('/auth/register', data);
  },

  verifyMfa: async (data: { email: string; mfa_code: string; mfa_session: string; edition?: Edition }) => {
    return api.post('/auth/mfa/verify', data);
  },

  me: () => api.get('/auth/me'),

  editions: () => api.get('/auth/editions'),

  googleLogin: () => api.get('/auth/google/login'),

  googleStatus: () => api.get('/auth/google/status'),

  githubLogin: () => api.get('/auth/github/login'),

  githubStatus: () => api.get('/auth/github/status'),

  demo: (edition?: Edition) => api.get('/auth/demo', { params: { edition } }),
};

export const complianceService = {
  getFrameworks: () =>
    api.get('/compliance/frameworks'),
  
  createFramework: (data: { framework: string; scope?: string }) =>
    api.post('/compliance/frameworks', data),
  
  getFramework: (id: string) =>
    api.get(`/compliance/frameworks/${id}`),
  
  updateFramework: (id: string, data: any) =>
    api.put(`/compliance/frameworks/${id}`, data),
  
  getControls: (frameworkId: string) =>
    api.get(`/compliance/frameworks/${frameworkId}/controls`),
  
  getComplianceDashboard: (frameworkId: string) =>
    api.get(`/compliance/frameworks/${frameworkId}/dashboard`),
  
  getAllDashboards: () =>
    api.get('/compliance/dashboard'),
  
  scanCompliance: (frameworkId: string) =>
    api.post(`/compliance/frameworks/${frameworkId}/scan`),
  
  getRemediationPlan: (frameworkId: string) =>
    api.post(`/compliance/frameworks/${frameworkId}/remediate`),
  
  getReports: () =>
    api.get('/compliance/reports'),
  
  generateReport: (data: { framework: string; title?: string; format?: string }) =>
    api.post('/compliance/reports/generate', data),
  
  connectDelve: (config: { api_endpoint: string; api_key: string }) =>
    api.post('/compliance/delve/connect', config),
  
  getDelveStatus: () =>
    api.get('/compliance/delve/status'),
  
  syncDelveData: () =>
    api.post('/compliance/delve/sync'),
  
  connectKertos: (config: { api_endpoint: string; api_key: string }) =>
    api.post('/compliance/kertos/connect', config),
  
  getKertosStatus: () =>
    api.get('/compliance/kertos/status'),
  
  syncKertosData: () =>
    api.post('/compliance/kertos/sync'),
  
  getRisks: (params?: { level?: string }) =>
    api.get('/compliance/risks', { params }),
  
  createRisk: (data: any) =>
    api.post('/compliance/risks', data),
  
  updateRisk: (id: string, data: any) =>
    api.put(`/compliance/risks/${id}`, data),
  
  mitigateRisk: (id: string) =>
    api.post(`/compliance/risks/${id}/mitigate`),
};

export const quantumService = {
  getAttestations: (params?: { status?: string }) =>
    api.get('/quantum/attestations', { params }),
  
  createAttestation: (data: any) =>
    api.post('/quantum/attestations', data),
  
  getAttestation: (id: string) =>
    api.get(`/quantum/attestations/${id}`),
  
  verifyAttestation: (id: string) =>
    api.post(`/quantum/attestations/${id}/verify`),
  
  refreshAttestation: (id: string) =>
    api.post(`/quantum/attestations/${id}/refresh`),
  
  getQuantumNetworks: () =>
    api.get('/quantum/networks'),
  
  getQuantumProviders: () =>
    api.get('/quantum/providers'),
  
  getQuantumReadiness: () =>
    api.get('/quantum/readiness'),
  
  getMigrationPlan: () =>
    api.get('/quantum/migration'),
  
  getPQCAlgorithms: () =>
    api.get('/quantum/algorithms'),
  
  migrateAlgorithm: (data: { asset_id: string; source_algorithm: string; target_algorithm: string }) =>
    api.post('/quantum/algorithms/migrate', data),
};

export const cloudService = {
  getCloudAccounts: (params?: { provider?: string }) =>
    api.get('/cloud/accounts', { params }),
  
  addCloudAccount: (data: any) =>
    api.post('/cloud/accounts', data),
  
  updateCloudAccount: (id: string, data: any) =>
    api.put(`/cloud/accounts/${id}`, data),
  
  deleteCloudAccount: (id: string) =>
    api.delete(`/cloud/accounts/${id}`),
  
  syncCloudAccount: (id: string) =>
    api.post(`/cloud/accounts/${id}/sync`),
  
  getCloudResources: (accountId: string) =>
    api.get(`/cloud/accounts/${accountId}/resources`),
  
  getAWSInventory: () =>
    api.get('/cloud/aws/inventory'),
  
  scanAWS: () =>
    api.post('/cloud/aws/scan'),
  
  getGCPInventory: () =>
    api.get('/cloud/gcp/inventory'),
  
  scanGCP: () =>
    api.post('/cloud/gcp/scan'),
  
  getIBMCloudInventory: () =>
    api.get('/cloud/ibm/inventory'),
  
  scanIBMCloud: () =>
    api.post('/cloud/ibm/scan'),
  
  getResourcesSummary: () =>
    api.get('/cloud/resources/summary'),
};

export const cncfService = {
  getTools: (params?: { type?: string }) =>
    api.get('/cncf/tools', { params }),
  
  registerTool: (data: any) =>
    api.post('/cncf/tools', data),
  
  updateTool: (id: string, data: any) =>
    api.put(`/cncf/tools/${id}`, data),
  
  deleteTool: (id: string) =>
    api.delete(`/cncf/tools/${id}`),
  
  getToolMetrics: (id: string) =>
    api.get(`/cncf/tools/${id}/metrics`),
  
  checkToolHealth: (id: string) =>
    api.post(`/cncf/tools/${id}/health`),
  
  getPrometheusIntegration: () =>
    api.get('/cncf/prometheus'),
  
  getGrafanaIntegration: () =>
    api.get('/cncf/grafana'),
  
  getArgoCDIntegration: () =>
    api.get('/cncf/argocd'),
  
  getFluxIntegration: () =>
    api.get('/cncf/flux'),
  
  getIstioIntegration: () =>
    api.get('/cncf/istio'),
  
  getLinkerdIntegration: () =>
    api.get('/cncf/linkerd'),
  
  getCiliumIntegration: () =>
    api.get('/cncf/cilium'),
  
  getK3sIntegration: () =>
    api.get('/cncf/k3s'),
  
  getCNCFDashboard: () =>
    api.get('/cncf/dashboard'),
};

export const terraformService = {
  getResources: (params?: { provider?: string; type?: string }) =>
    api.get('/terraform/resources', { params }),
  
  scanResources: (data?: { workspace?: string; module_path?: string }) =>
    api.post('/terraform/resources/scan', data),
  
  getResource: (id: string) =>
    api.get(`/terraform/resources/${id}`),
  
  updateResource: (id: string, data: any) =>
    api.put(`/terraform/resources/${id}`, data),
  
  getWorkspaces: () =>
    api.get('/terraform/workspaces'),
  
  createWorkspace: (data: any) =>
    api.post('/terraform/workspaces', data),
  
  getWorkspaceState: (id: string) =>
    api.get(`/terraform/workspaces/${id}/state`),
  
  getSecurityFindings: (params?: { severity?: string; provider?: string }) =>
    api.get('/terraform/security-findings', { params }),
  
  getComplianceViolations: (params?: { framework?: string }) =>
    api.get('/terraform/compliance-violations', { params }),
  
  getModules: () =>
    api.get('/terraform/modules'),
  
  scanModules: () =>
    api.post('/terraform/modules/scan'),
  
  detectDrift: (workspace?: string) =>
    api.get('/terraform/drift', { params: { workspace } }),
  
  getPlanHistory: (workspace?: string) =>
    api.get('/terraform/plan-history', { params: { workspace } }),
};

export const cbomService = {
  getReports: () =>
    api.get('/cbom'),
  
  createReport: (data: any) =>
    api.post('/cbom', data),
  
  getReport: (id: string) =>
    api.get(`/cbom/${id}`),
  
  updateReport: (id: string, data: any) =>
    api.put(`/cbom/${id}`, data),
  
  deleteReport: (id: string) =>
    api.delete(`/cbom/${id}`),
  
  scanReport: (id: string) =>
    api.post(`/cbom/${id}/scan`),
  
  attestReport: (id: string) =>
    api.post(`/cbom/${id}/attest`),

  // Headleap CBOM scan: POST /scans triggers a new scan for any target
  triggerScan: (target: string, scanType: string = 'cbom', options: any = {}) =>
    api.post('/scans', { target, scan_type: scanType, ...options }),

  // Get status and results of a running or completed scan
  getScanStatus: (scanId: string) =>
    api.get(`/scans/${scanId}`),

  // Get CBOM for a specific asset
  getAssetBOM: (assetId: string) =>
    api.get(`/assets/${assetId}/bom`),
};

export const benchmarkService = {
  getSummary: () => api.get('/benchmarks'),
};

export const securityService = {
  getEvents: () =>
    api.get('/security/events'),
  
  createEvent: (data: any) =>
    api.post('/security/events', data),
  
  resolveEvent: (id: string) =>
    api.put(`/security/events/${id}/resolve`),
  
  getThreatIntelligence: () =>
    api.get('/security/threats'),
  
  mlSecurityScan: (data: any) =>
    api.post('/security/ml-scan', data),
};

export const cspmService = {
  getOverview: () => api.get('/cspm/overview'),
};

export const postureService = {
  getOverview: () => api.get('/cspm/overview'),
  getAccounts: (params?: { provider?: string }) => api.get('/cloud/accounts', { params }),
  getResourcesSummary: () => api.get('/cloud/resources/summary'),
  getSecurityEvents: () => api.get('/security/events'),
  getThreatIntelligence: () => api.get('/security/threats'),
  getConformancePacks: () => api.get('/compliance/dashboard'),
};

export const ecosystemService = {
  getTools: () => api.get('/ecosystem/tools'),
  getTool: (id: string) => api.get(`/ecosystem/tools/${id}`),
  getCategories: () => api.get('/ecosystem/categories'),
};

export const coreService = {
  getStatus: (edition?: string) => api.get('/core/status', { params: { edition } }),
  getServices: () => api.get('/core/services'),
  checkIntegration: (name: string) => api.get(`/core/integrations/${name}`),
};

export const gitHubScanService = {
  scanRepos: (repos: string[], scanType?: string, deepScan?: boolean) =>
    api.post('/github/scan', { repos, scan_type: scanType, deep_scan: deepScan }),
  listRepos: (org?: string) => api.get('/github/repos', { params: { org } }),
  getScanStatus: (id: string) => api.get(`/github/scans/${id}`),
};

export default api;

// IBM Cloud HPCS
export const ibmCloudService = {
  getHPCSStatus: () => api.get('/enterprise/ibm/hpcs/status'),
  getKeyInventory: () => api.get('/enterprise/ibm/hpcs/keys'),
  getObjectStorageBuckets: () => api.get('/enterprise/ibm/cos/buckets'),
  attestKey: (keyId: string) => api.post(`/enterprise/ibm/hpcs/keys/${keyId}/attest`),
};

// AWS HSM
export const awsCloudService = {
  getCloudHSMStatus: () => api.get('/enterprise/aws/cloudhsm/status'),
  getKMSKeys: () => api.get('/enterprise/aws/kms/keys'),
  getCloudTrailAudit: () => api.get('/enterprise/aws/cloudtrail/crypto-events'),
};

// Quantum Attestation (enterprise extended)
export const quantumAttestationService = {
  getQuantumRiskAssessment: () => api.get('/enterprise/quantum/assessment'),
  scanForPQCAlgorithms: (assetIds: string[]) => api.post('/enterprise/quantum/scan', { asset_ids: assetIds }),
  getAttestationReport: (assetId: string) => api.get(`/enterprise/quantum/attest/${assetId}`),
  getMigrationRoadmap: () => api.get('/enterprise/quantum/migration-roadmap'),
  exportQuantumSafeBOM: (assetId: string) => api.get(`/enterprise/quantum/bom/${assetId}/export`),
};

// GCP Cloud
export const gcpService = {
  getCloudKMSKeys: () => api.get('/enterprise/gcp/kms/keys'),
  getGKEWorkloads: () => api.get('/enterprise/gcp/gke/workloads'),
  getHSMKeyRings: () => api.get('/enterprise/gcp/hsm/keyrings'),
};

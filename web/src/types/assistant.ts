export type AssistantRole = 'user' | 'assistant' | 'system';

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  timestamp: number;
}

export interface WorkspaceContext {
  scannedAt: string;
  page: string;
  edition: string;
  demoMode?: boolean;
  inventory?: {
    totalAssets?: number;
    complianceScore?: number;
    quantumSafeCount?: number;
    nonQuantumSafe?: number;
    vulnerableAssets?: number;
    byCategory?: Record<string, number>;
    byCloudProvider?: Record<string, number>;
  };
  assets?: Array<{
    id: string;
    name: string;
    risk_level?: string;
    quantum_safe?: boolean;
    algorithm?: string;
    cloud_provider?: string;
  }>;
  cloud?: {
    totalResources?: number;
    byProvider?: Record<string, number>;
    securityFindings?: Record<string, number>;
    scanCoverage?: number;
    scansToday?: number;
  };
  security?: {
    events?: Array<{ severity?: string; message?: string; title?: string }>;
    threats?: unknown;
  };
  compliance?: {
    overallScore?: number;
    frameworks?: Array<{ name?: string; framework?: string; score?: number }>;
    criticalFindings?: number;
  };
  cspm?: Record<string, unknown>;
}

import type { SvgIconComponent } from '@mui/icons-material';
import {
  Psychology,
  Badge,
  AccountTree,
  DataObject,
  Radar,
  BugReport,
  Api,
  Bolt,
} from '@mui/icons-material';
import { tokens } from '../theme/tokens';

export type ModuleSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ModuleStatus = 'open' | 'investigating' | 'monitoring' | 'mitigated';

export interface ModuleKpi {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  color?: string;
}

export interface ModuleFinding {
  id: string;
  title: string;
  ref: string;
  severity: ModuleSeverity;
  status: ModuleStatus;
  scope: string;
}

export interface SecurityModuleConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: SvgIconComponent;
  color: string;
  score: number;
  connected: boolean;
  kpis: ModuleKpi[];
  capabilities: string[];
  frameworks: string[];
  integrations: string[];
  findings: ModuleFinding[];
}

export const MODULES: SecurityModuleConfig[] = [
  {
    id: 'ai-security',
    name: 'AI Security',
    tagline: 'Govern and protect AI workloads, models, and agents.',
    description: 'Discover AI assets, audit model behavior, and enforce guardrails against prompt injection, jailbreaks, and data exfiltration across LLM and agentic pipelines.',
    category: 'AI Security',
    icon: Psychology,
    color: tokens.colors.crypto.quantum,
    score: 74,
    connected: false,
    kpis: [
      { label: 'AI assets', value: '312', delta: '+28 this week', color: tokens.colors.rivicq[300] },
      { label: 'Guardrail coverage', value: '86%', color: tokens.colors.crypto.low },
      { label: 'Prompt incidents', value: '41', delta: '-12 this week', color: tokens.colors.crypto.high },
      { label: 'Exposed model keys', value: '3', color: tokens.colors.crypto.critical },
    ],
    capabilities: [
      'AI asset discovery & inventory',
      'Prompt injection & jailbreak detection',
      'Model governance & approval flows',
      'Data exfiltration monitoring',
      'Shadow AI detection',
      'AI supply chain vetting',
    ],
    frameworks: ['OWASP LLM Top 10', 'NIST AI RMF', 'EU AI Act', 'ISO/IEC 42001'],
    integrations: ['OpenAI', 'Azure OpenAI', 'Anthropic', 'Hugging Face', 'watsonx.ai'],
    findings: [
      { id: 'AI-0041', title: 'System prompt allows role override — possible jailbreak vector', ref: 'OWASP-LLM01', severity: 'critical', status: 'open', scope: 'copilot-prod' },
      { id: 'AI-0038', title: 'Unsanitized tool output fed into prompt context', ref: 'OWASP-LLM04', severity: 'high', status: 'investigating', scope: 'rag-service' },
      { id: 'AI-0031', title: 'API key for model provider found in CI logs', ref: 'MITRE-ATLAS', severity: 'critical', status: 'open', scope: 'genai-cd' },
      { id: 'AI-0026', title: 'Model card metadata missing for 14 registered models', ref: 'NIST-AI-RMF', severity: 'medium', status: 'monitoring', scope: 'ml-registry' },
      { id: 'AI-0019', title: 'Unsigned model artifact deployed to production', ref: 'SLSA', severity: 'high', status: 'open', scope: 'inference-prod' },
    ],
  },
  {
    id: 'identity',
    name: 'Identity Security',
    tagline: 'Map identities, entitlements, and trust across the estate.',
    description: 'Build a continuous identity graph of users, service accounts, and non-human identities. Detect privilege sprawl, stale credentials, and risky access paths.',
    category: 'Identity',
    icon: Badge,
    color: tokens.colors.rivicq[400],
    score: 69,
    connected: false,
    kpis: [
      { label: 'Identities tracked', value: '2,481', delta: '+39 this week', color: tokens.colors.rivicq[300] },
      { label: 'Non-human identities', value: '487', color: tokens.colors.crypto.info },
      { label: 'Privilege sprawl', value: '23%', color: tokens.colors.crypto.high },
      { label: 'Stale credentials', value: '67', color: tokens.colors.crypto.critical },
    ],
    capabilities: [
      'Identity graph & relationships',
      'Non-human identity (NHI) management',
      'Privileged access analysis',
      'Entitlement drift detection',
      'Credential & secret hygiene',
      'Zero Trust readiness scoring',
    ],
    frameworks: ['NIST SP 800-207', 'CSA Zero Trust', 'ISO 27001 Annex A.5', 'SOC 2 CC6'],
    integrations: ['Okta', 'Microsoft Entra ID', 'AWS IAM Identity Center', 'Kubernetes RBAC', 'GitHub'],
    findings: [
      { id: 'ID-0118', title: 'Service account has write access across 4 production clusters', ref: 'ZT-017', severity: 'critical', status: 'open', scope: 'k8s-prod' },
      { id: 'ID-0104', title: 'STS credential rotation period exceeds 90 days', ref: 'CIS-2.5', severity: 'high', status: 'investigating', scope: 'aws-main' },
      { id: 'ID-0092', title: 'Ghost identity still attached to terminated engineer', ref: 'SOC2-CC6.1', severity: 'high', status: 'open', scope: 'entra-id' },
      { id: 'ID-0077', title: 'Long-lived PAT has org-wide repository access', ref: 'GH-018', severity: 'medium', status: 'monitoring', scope: 'github-org' },
      { id: 'ID-0061', title: 'Machine identity can reach secrets vault over network', ref: 'ZT-033', severity: 'medium', status: 'open', scope: 'vault-prod' },
    ],
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain Security',
    tagline: 'Unified BOM visibility across software, crypto, and AI.',
    description: 'Correlate SBOM, CBOM, AIBOM, IBOM, and QBOM into a single asset graph. Enforce provenance, signing, and version hygiene before artifacts ship.',
    category: 'Supply Chain',
    icon: AccountTree,
    color: tokens.colors.crypto.info,
    score: 81,
    connected: true,
    kpis: [
      { label: 'BOMs generated', value: '1,284', color: tokens.colors.rivicq[300] },
      { label: 'CBOM coverage', value: '92%', color: tokens.colors.crypto.low },
      { label: 'Signed artifacts', value: '78%', color: tokens.colors.crypto.medium },
      { label: 'High-risk deps', value: '19', color: tokens.colors.crypto.critical },
    ],
    capabilities: [
      'Unified BOM correlation (SBOM/CBOM/AIBOM)',
      'Provenance & SLSA attestation',
      'Artifact signing verification',
      'Dependency risk scoring',
      'License & version hygiene',
      'VEX / CVE enrichment',
    ],
    frameworks: ['SLSA', 'EO 14028', 'NIST SSDF', 'ISO 5230', 'CISA SBOM'],
    integrations: ['Syft', 'Trivy', 'Sigstore', 'GitHub Actions', 'Docker Hub'],
    findings: [
      { id: 'SC-0087', title: 'Unpinned base image in 23 build pipelines', ref: 'SSDF-4', severity: 'high', status: 'open', scope: 'build-pipelines' },
      { id: 'SC-0071', title: 'Artifact signed with revoked key', ref: 'SLSA-3', severity: 'critical', status: 'open', scope: 'release-v2.4.1' },
      { id: 'SC-0059', title: 'CBOM missing for 8% of scanned services', ref: 'CBOM-1', severity: 'medium', status: 'monitoring', scope: 'service-mesh' },
      { id: 'SC-0043', title: 'Legacy dependency flagged with known CVE (EPSS > 0.9)', ref: 'VEX-018', severity: 'high', status: 'investigating', scope: 'billing-api' },
      { id: 'SC-0028', title: 'Provenance metadata missing for container runtime', ref: 'SLSA-2', severity: 'medium', status: 'open', scope: 'worker-prod' },
    ],
  },
  {
    id: 'dspm',
    name: 'Data Security / DSPM',
    tagline: 'Find, classify, and protect sensitive data everywhere.',
    description: 'Continuous data discovery and classification across object stores, databases, and SaaS. Map data flows, detect exposures, and enforce retention and masking.',
    category: 'Data Security',
    icon: DataObject,
    color: tokens.colors.crypto.low,
    score: 64,
    connected: false,
    kpis: [
      { label: 'Data assets', value: '38,412', color: tokens.colors.rivicq[300] },
      { label: 'PII records', value: '1.2M', color: tokens.colors.crypto.high },
      { label: 'Exposed buckets', value: '11', color: tokens.colors.crypto.critical },
      { label: 'Classification coverage', value: '71%', color: tokens.colors.crypto.medium },
    ],
    capabilities: [
      'Data discovery & classification',
      'PII / PHI / PCI detection',
      'Public exposure monitoring',
      'Data flow & lineage mapping',
      'Retention & masking policies',
      'Regulatory compliance checks',
    ],
    frameworks: ['GDPR', 'CCPA', 'HIPAA', 'PCI DSS', 'ISO 27701'],
    integrations: ['AWS S3', 'Azure Blob', 'GCP GCS', 'Snowflake', 'Databricks'],
    findings: [
      { id: 'DS-0102', title: 'S3 bucket with customer PII set to public-read', ref: 'GDPR-32', severity: 'critical', status: 'open', scope: 's3://analytics-staging' },
      { id: 'DS-0089', title: 'Unencrypted database backup containing PHI', ref: 'HIPAA-164', severity: 'critical', status: 'open', scope: 'rds-backups' },
      { id: 'DS-0074', title: 'Cardholder data retained beyond retention window', ref: 'PCI-3.1', severity: 'high', status: 'investigating', scope: 'payments-dw' },
      { id: 'DS-0061', title: 'PII exported to shadow SaaS tool', ref: 'GDPR-44', severity: 'high', status: 'open', scope: 'export-bot' },
      { id: 'DS-0043', title: 'Classification labels missing on 29% of buckets', ref: 'ISO-27701', severity: 'medium', status: 'monitoring', scope: 'storage-org' },
    ],
  },
  {
    id: 'threat-intel',
    name: 'Threat Intelligence',
    tagline: 'Operationalize MITRE ATT&CK, CVE, EPSS, and KEV intel.',
    description: 'Continuously enrich findings with adversary context. Correlate events against MITRE ATT&CK, prioritize with EPSS/KEV, and track threat actors targeting your stack.',
    category: 'Threat Intelligence',
    icon: Radar,
    color: tokens.colors.crypto.high,
    score: 77,
    connected: false,
    kpis: [
      { label: 'Active threat actors', value: '14', color: tokens.colors.crypto.critical },
      { label: 'CVE coverage', value: '2,307', color: tokens.colors.rivicq[300] },
      { label: 'KEV exploited CVEs', value: '8', color: tokens.colors.crypto.critical },
      { label: 'Mean time to context', value: '9 min', color: tokens.colors.crypto.low },
    ],
    capabilities: [
      'MITRE ATT&CK mapping',
      'EPSS / KEV prioritization',
      'Threat actor tracking',
      'IOC enrichment & matching',
      'Dark web & leak monitoring',
      'Adversary simulation blueprints',
    ],
    frameworks: ['MITRE ATT&CK', 'FIRST EPSS', 'CISA KEV', 'STIX/TAXII'],
    integrations: ['VirusTotal', 'AlienVault OTX', 'AbuseIPDB', 'CISA KEV', 'MISP'],
    findings: [
      { id: 'TI-0061', title: 'Technique T1078 valid accounts observed against idP', ref: 'ATT&CK-T1078', severity: 'critical', status: 'investigating', scope: 'entra-id' },
      { id: 'TI-0052', title: 'IOC match: C2 beacon domain seen in outbound flows', ref: 'STIX-004', severity: 'critical', status: 'open', scope: 'edge-proxy' },
      { id: 'TI-0044', title: 'CVE exploited in the wild present in dependency tree', ref: 'KEV-2024-xxx', severity: 'high', status: 'open', scope: 'web-tier' },
      { id: 'TI-0037', title: 'Credential leak suggests impersonation of finance role', ref: 'ATT&CK-T1589', severity: 'high', status: 'monitoring', scope: 'oauth-prod' },
      { id: 'TI-0021', title: 'Legacy malware family seen in sandbox telemetry', ref: 'ATT&CK-T1059', severity: 'medium', status: 'monitoring', scope: 'sandbox' },
    ],
  },
  {
    id: 'vulnerability',
    name: 'Vulnerability Management',
    tagline: 'Prioritize and remediate risk with EPSS and KEV context.',
    description: 'Aggregate findings from scanners and runtime signals, enrich with exploit intelligence, and drive SLA-based remediation across workloads and repositories.',
    category: 'Vulnerability Management',
    icon: BugReport,
    color: tokens.colors.crypto.medium,
    score: 71,
    connected: true,
    kpis: [
      { label: 'Open vulnerabilities', value: '1,847', color: tokens.colors.crypto.high },
      { label: 'Critical / high', value: '212', color: tokens.colors.crypto.critical },
      { label: 'Patch coverage', value: '63%', color: tokens.colors.crypto.medium },
      { label: 'Mean time to remediate', value: '11 days', color: tokens.colors.crypto.low },
    ],
    capabilities: [
      'Aggregated vulnerability inventory',
      'EPSS / KEV risk scoring',
      'SLA-based remediation tracking',
      'Patch validation & drift control',
      'Image and IaC scanning',
      'Executive risk reporting',
    ],
    frameworks: ['CVSS 4.0', 'FIRST EPSS', 'CISA KEV', 'OWASP Top 10'],
    integrations: ['Trivy', 'Grype', 'Snyk', 'Qualys', 'AWS Inspector'],
    findings: [
      { id: 'VUL-0321', title: 'Remote code execution in runtime library (EPSS 0.97)', ref: 'CVE-2026-xxxx', severity: 'critical', status: 'open', scope: 'gateway-prod' },
      { id: 'VUL-0308', title: 'High-severity SQL injection in legacy API endpoint', ref: 'CVE-2025-yyyy', severity: 'critical', status: 'investigating', scope: 'billing-api' },
      { id: 'VUL-0290', title: 'Outdated base image in production worker', ref: 'CIS-Docker', severity: 'high', status: 'open', scope: 'worker-prod' },
      { id: 'VUL-0276', title: 'Container runs as root in staging namespace', ref: 'CIS-K8S-1.5', severity: 'medium', status: 'monitoring', scope: 'k8s-staging' },
      { id: 'VUL-0251', title: 'Known vulnerable libc in scanner image', ref: 'CVE-2024-zzzz', severity: 'high', status: 'open', scope: 'scanner-cbom' },
    ],
  },
  {
    id: 'api-security',
    name: 'API Security',
    tagline: 'Discover, test, and protect every API you expose.',
    description: 'Map the full API estate including shadow and zombie APIs. Enforce OWASP API Top 10, detect abuse and credential stuffing, and validate contracts continuously.',
    category: 'API Security',
    icon: Api,
    color: tokens.colors.rivicq[300],
    score: 66,
    connected: false,
    kpis: [
      { label: 'APIs discovered', value: '1,024', color: tokens.colors.rivicq[300] },
      { label: 'Shadow APIs', value: '37', color: tokens.colors.crypto.critical },
      { label: 'Auth failures', value: '4.2k/hr', color: tokens.colors.crypto.high },
      { label: 'Contract coverage', value: '58%', color: tokens.colors.crypto.medium },
    ],
    capabilities: [
      'API discovery & inventory',
      'Shadow / zombie / orphan API detection',
      'OWASP API Top 10 testing',
      'Rate limit & abuse detection',
      'GraphQL / gRPC / REST coverage',
      'Schema & contract validation',
    ],
    frameworks: ['OWASP API Top 10', 'NIST 800-204', 'OpenAPI/Swagger', 'AsyncAPI'],
    integrations: ['Kong', 'Apigee', 'AWS API Gateway', 'Cloudflare', 'Postman'],
    findings: [
      { id: 'API-0072', title: 'Broken object-level authorization on /v1/users/:id', ref: 'OWASP-API01', severity: 'critical', status: 'open', scope: 'user-service' },
      { id: 'API-0064', title: 'Shadow endpoint exposing internal health data', ref: 'OWASP-API05', severity: 'high', status: 'open', scope: 'metrics-svc' },
      { id: 'API-0055', title: 'No rate limiting on OTP verification endpoint', ref: 'OWASP-API04', severity: 'high', status: 'investigating', scope: 'auth-api' },
      { id: 'API-0041', title: 'GraphQL introspection enabled in production', ref: 'OWASP-API03', severity: 'medium', status: 'monitoring', scope: 'gql-gateway' },
      { id: 'API-0029', title: 'Zombie API still accepting legacy tokens', ref: 'OWASP-API02', severity: 'medium', status: 'open', scope: 'payments-legacy' },
    ],
  },
  {
    id: 'incident-response',
    name: 'Incident Response',
    tagline: 'Coordinate detection, response, and lessons learned.',
    description: 'Streamline the full IR lifecycle — detection, case management, playbooks, and post-incident reporting — with evidence capture and stakeholder communications.',
    category: 'Incident Response',
    icon: Bolt,
    color: tokens.colors.crypto.critical,
    score: 83,
    connected: false,
    kpis: [
      { label: 'Open incidents', value: '6', color: tokens.colors.crypto.high },
      { label: 'Active cases', value: '3', color: tokens.colors.crypto.medium },
      { label: 'MTTR', value: '42 min', color: tokens.colors.crypto.low },
      { label: 'Playbook coverage', value: '91%', color: tokens.colors.rivicq[300] },
    ],
    capabilities: [
      'Incident & case management',
      'Automated playbooks & response',
      'Evidence and timeline capture',
      'War-room & comms templates',
      'Post-incident review (RCA)',
      'SOAR connector hub',
    ],
    frameworks: ['NIST SP 800-61', 'SANS PICERL', 'ISO 27035', 'MITRE D3FEND'],
    integrations: ['PagerDuty', 'ServiceNow', 'Slack', 'Splunk', 'Jira'],
    findings: [
      { id: 'IR-0023', title: 'Unauthorized access attempt under containment', ref: '800-61-3', severity: 'critical', status: 'investigating', scope: 'edge-prod' },
      { id: 'IR-0019', title: 'Playbook missing for crypto-ransomware scenario', ref: 'PICERL-5', severity: 'high', status: 'open', scope: 'secops' },
      { id: 'IR-0014', title: 'Evidence chain incomplete for quarterly drill', ref: 'ISO-27035', severity: 'medium', status: 'monitoring', scope: 'drill-q3' },
      { id: 'IR-0008', title: 'SIEM alert-to-ticket latency above SLA', ref: 'SANS-2', severity: 'high', status: 'open', scope: 'soc-pipeline' },
      { id: 'IR-0004', title: 'RCA report pending for June outage', ref: '800-61-4', severity: 'low', status: 'open', scope: 'rca-june' },
    ],
  },
];

export const getModuleById = (id: string): SecurityModuleConfig | undefined =>
  MODULES.find((m) => m.id === id);

export const MODULE_CATEGORIES = Array.from(new Set(MODULES.map((m) => m.category)));

export const SEVERITY_COLORS: Record<ModuleSeverity, string> = {
  critical: tokens.colors.crypto.critical,
  high: tokens.colors.crypto.high,
  medium: tokens.colors.crypto.medium,
  low: tokens.colors.crypto.low,
};

export const STATUS_COLORS: Record<ModuleStatus, string> = {
  open: tokens.colors.crypto.critical,
  investigating: tokens.colors.crypto.high,
  monitoring: tokens.colors.crypto.info,
  mitigated: tokens.colors.crypto.low,
};

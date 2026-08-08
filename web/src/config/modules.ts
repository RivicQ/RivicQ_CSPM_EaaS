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
  Cloud,
  Monitor,
  Hub,
  Rule,
  Search,
  GppGood,
  FactCheck,
  Insights,
  Shield,
  AutoAwesome,
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
  umbrella?: boolean;
  kpis: ModuleKpi[];
  capabilities: string[];
  frameworks: string[];
  integrations: string[];
  findings: ModuleFinding[];
}

export const MODULE_CATEGORIES_ORDER = [
  'Cloud Security',
  'Identity Security',
  'Quantum Security',
  'Supply Chain',
  'AI Security',
  'API Security',
  'Application Security',
  'Runtime Security',
  'Network Security',
  'Data Security',
  'Threat Intelligence',
  'Detection Engineering',
  'Vulnerability Management',
  'Incident Response',
  'Digital Forensics',
  'Red Team',
  'Compliance',
  'Enterprise Analytics',
] as const;

type CategoryName = (typeof MODULE_CATEGORIES_ORDER)[number];

const ICON_BY_CATEGORY: Record<CategoryName, SvgIconComponent> = {
  'Cloud Security': Cloud,
  'Identity Security': Badge,
  'Quantum Security': Psychology,
  'Supply Chain': AccountTree,
  'AI Security': AutoAwesome,
  'API Security': Api,
  'Application Security': BugReport,
  'Runtime Security': Monitor,
  'Network Security': Hub,
  'Data Security': DataObject,
  'Threat Intelligence': Radar,
  'Detection Engineering': Rule,
  'Vulnerability Management': Shield,
  'Incident Response': Bolt,
  'Digital Forensics': Search,
  'Red Team': GppGood,
  'Compliance': FactCheck,
  'Enterprise Analytics': Insights,
};

const COLOR_BY_CATEGORY: Record<CategoryName, string> = {
  'Cloud Security': tokens.colors.rivicq[400],
  'Identity Security': tokens.colors.rivicq[300],
  'Quantum Security': tokens.colors.crypto.quantum,
  'Supply Chain': tokens.colors.crypto.info,
  'AI Security': tokens.colors.crypto.quantum,
  'API Security': tokens.colors.rivicq[300],
  'Application Security': tokens.colors.crypto.medium,
  'Runtime Security': tokens.colors.crypto.high,
  'Network Security': tokens.colors.crypto.info,
  'Data Security': tokens.colors.crypto.low,
  'Threat Intelligence': tokens.colors.crypto.high,
  'Detection Engineering': tokens.colors.crypto.info,
  'Vulnerability Management': tokens.colors.crypto.medium,
  'Incident Response': tokens.colors.crypto.critical,
  'Digital Forensics': tokens.colors.crypto.classic,
  'Red Team': tokens.colors.crypto.critical,
  'Compliance': tokens.colors.gold[500],
  'Enterprise Analytics': tokens.colors.brand.blue,
};

const KPI_LABELS: Record<CategoryName, string[]> = {
  'Cloud Security': ['Cloud assets', 'Misconfigurations', 'Public exposure', 'Risk score'],
  'Identity Security': ['Identities tracked', 'Non-human identities', 'Privilege sprawl', 'Stale credentials'],
  'Quantum Security': ['Crypto inventory', 'PQC readiness', 'Vulnerable keys', 'Quantum risk'],
  'Supply Chain': ['BOMs generated', 'Signed artifacts', 'High-risk deps', 'Provenance coverage'],
  'AI Security': ['AI assets', 'Prompt incidents', 'Guardrail coverage', 'Exposed model keys'],
  'API Security': ['APIs discovered', 'Shadow APIs', 'Auth failures', 'Contract coverage'],
  'Application Security': ['Apps scanned', 'Findings open', 'Scan coverage', 'Mean time to fix'],
  'Runtime Security': ['Hosts monitored', 'Runtime alerts', 'Detections', 'Policy coverage'],
  'Network Security': ['Network assets', 'Exposed ports', 'Open paths', 'Segmentation'],
  'Data Security': ['Data assets', 'PII records', 'Exposures', 'Classification'],
  'Threat Intelligence': ['Intel feeds', 'Active actors', 'IOC matches', 'Context time'],
  'Detection Engineering': ['Rules deployed', 'Coverage', 'False positives', 'Detections'],
  'Vulnerability Management': ['Open vulns', 'Critical / high', 'Patch coverage', 'MTTR'],
  'Incident Response': ['Open incidents', 'Active cases', 'MTTR', 'Playbook coverage'],
  'Digital Forensics': ['Active cases', 'Evidence chains', 'Capture time', 'Integrity'],
  'Red Team': ['Campaigns', 'Attack paths', 'Validation', 'Exposure'],
  'Compliance': ['Controls', 'Pass rate', 'Frameworks', 'Open gaps'],
  'Enterprise Analytics': ['Risk score', 'Predictions', 'Dashboards', 'Correlation'],
};

const SCOPES = ['prod', 'staging', 'aws-main', 'k8s-prod', 'cloud-edge', 'entra-id'];

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h;
};

const prefixOf = (id: string): string =>
  id
    .split('-')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

const severityFor = (h: number, i: number): ModuleSeverity => {
  const sevs: ModuleSeverity[] = ['critical', 'high', 'high', 'medium', 'medium'];
  return sevs[(h + i) % sevs.length];
};

function generateKpis(seed: ModuleSeed, h: number): ModuleKpi[] {
  const labels = KPI_LABELS[seed.category];
  const colors = [tokens.colors.rivicq[300], tokens.colors.crypto.high, tokens.colors.crypto.medium, tokens.colors.crypto.info];
  return labels.map((label, i) => {
    if (i === 0) return { label, value: `${(300 + (h % 2400)).toLocaleString()}`, delta: `+${(h % 40)} this week`, color: colors[0] };
    if (i === 1) return { label, value: `${60 + (h % 35)}%`, color: colors[1] };
    if (i === 2) return { label, value: `${h % 45}`, color: colors[2] };
    return { label, value: `${55 + (h % 40)}`, color: colors[3] };
  });
}

function generateFindings(seed: ModuleSeed): ModuleFinding[] {
  const h = hash(seed.id);
  const caps = seed.capabilities;
  const prefix = prefixOf(seed.id);
  const refs: string[] = seed.frameworks && seed.frameworks.length > 0 ? seed.frameworks : ['INTERNAL'];
  const picks = (n: number) => caps[n] ?? caps[0];
  return [
    { id: `${prefix}-${100 + (h % 900)}`, title: `Open ${picks(0).toLowerCase()} gap detected in production scope`, ref: refs[0], severity: severityFor(h, 0), status: 'open', scope: SCOPES[h % SCOPES.length] },
    { id: `${prefix}-${90 + (h % 900)}`, title: `Coverage below threshold for ${picks(1).toLowerCase()}`, ref: refs[1] ?? refs[0], severity: severityFor(h, 1), status: 'investigating', scope: SCOPES[(h + 1) % SCOPES.length] },
    { id: `${prefix}-${80 + (h % 900)}`, title: `Configuration drift observed in ${picks(2).toLowerCase()}`, ref: refs[2] ?? refs[0], severity: severityFor(h, 2), status: 'open', scope: SCOPES[(h + 2) % SCOPES.length] },
    { id: `${prefix}-${70 + (h % 900)}`, title: `Evidence gap for ${picks(3).toLowerCase()} in quarterly review`, ref: refs[3] ?? refs[0], severity: severityFor(h, 3), status: 'monitoring', scope: SCOPES[(h + 3) % SCOPES.length] },
  ];
}

interface ModuleSeed {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: CategoryName;
  capabilities: string[];
  frameworks?: string[];
  integrations?: string[];
  umbrella?: boolean;
  score?: number;
  connected?: boolean;
}

function moduleFromSeed(seed: ModuleSeed): SecurityModuleConfig {
  const h = hash(seed.id);
  return {
    id: seed.id,
    name: seed.name,
    tagline: seed.tagline,
    description: seed.description,
    category: seed.category,
    icon: ICON_BY_CATEGORY[seed.category],
    color: COLOR_BY_CATEGORY[seed.category],
    score: seed.score ?? 55 + (h % 40),
    connected: seed.connected ?? false,
    umbrella: seed.umbrella,
    kpis: generateKpis(seed, h),
    capabilities: seed.capabilities,
    frameworks: seed.frameworks ?? [],
    integrations: seed.integrations ?? [],
    findings: generateFindings(seed),
  };
}

// ── Hand-authored flagship (umbrella) modules ────────────────────────────

const UMBRELLA_MODULES: SecurityModuleConfig[] = [
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
    umbrella: true,
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
    category: 'Identity Security',
    icon: Badge,
    color: tokens.colors.rivicq[400],
    score: 69,
    connected: false,
    umbrella: true,
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
    umbrella: true,
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
    umbrella: true,
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
    umbrella: true,
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
    umbrella: true,
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
    umbrella: true,
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
    umbrella: true,
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
  {
    id: 'quantum-security',
    name: 'Quantum Security',
    tagline: 'Crypto agility, PQC readiness, and quantum risk at scale.',
    description: 'The Quantum Readiness Platform: continuous cryptographic inventory, TLS and PKI discovery, harvest-now-decrypt-later detection, and ML-KEM / ML-DSA migration planning with FIPS 203/204/205 compliance.',
    category: 'Quantum Security',
    icon: Psychology,
    color: tokens.colors.crypto.quantum,
    score: 78,
    connected: false,
    umbrella: true,
    kpis: [
      { label: 'Crypto inventory', value: '8,412', color: tokens.colors.rivicq[300] },
      { label: 'PQC readiness', value: '68%', color: tokens.colors.crypto.high },
      { label: 'Vulnerable keys', value: '214', color: tokens.colors.crypto.critical },
      { label: 'Quantum risk', value: '34', color: tokens.colors.crypto.info },
    ],
    capabilities: [
      'CBOM scanning & QBOM generation',
      'Crypto, certificate & PKI inventory',
      'TLS analysis & crypto agility dashboard',
      'PQC readiness & quantum risk scores',
      'Harvest now, decrypt later detection',
      'ML-KEM / ML-DSA migration planner',
      'NIST PQC & FIPS 203/204/205 compliance',
    ],
    frameworks: ['NIST FIPS 203', 'NIST FIPS 204', 'NIST FIPS 205', 'ETSI TR 103 619', 'CNSA 2.0'],
    integrations: ['Open Quantum Safe', 'IBM Quantum', 'AWS Braket', 'Azure Quantum', 'SoftHSM'],
    findings: [
      { id: 'QS-0211', title: 'RSA-2048 key used to protect data-at-rest with >15-year retention', ref: 'HNDL-001', severity: 'critical', status: 'open', scope: 'payments-db' },
      { id: 'QS-0184', title: 'TLS 1.2 cipher suite without hybrid PQC negotiated in production', ref: 'CNSA-2.0', severity: 'high', status: 'investigating', scope: 'edge-proxy' },
      { id: 'QS-0153', title: 'Certificate chain still rooted in SHA-1 trust anchor', ref: 'FIPS-186-5', severity: 'high', status: 'open', scope: 'pki-root' },
      { id: 'QS-0118', title: 'ML-KEM migration planned for 2027 but inventory incomplete', ref: 'ETSI-TR-103619', severity: 'medium', status: 'monitoring', scope: 'crypto-inventory' },
    ],
  },
  {
    id: 'appsec',
    name: 'Application Security',
    tagline: 'Secure software from source to build to runtime.',
    description: 'End-to-end application security spanning SAST, DAST, SCA, secret scanning, and IaC analysis with CI/CD enforcement and runtime protection.',
    category: 'Application Security',
    icon: BugReport,
    color: tokens.colors.crypto.medium,
    score: 72,
    connected: false,
    umbrella: true,
    kpis: [
      { label: 'Apps scanned', value: '486', color: tokens.colors.rivicq[300] },
      { label: 'Findings open', value: '312', color: tokens.colors.crypto.high },
      { label: 'Scan coverage', value: '81%', color: tokens.colors.crypto.medium },
      { label: 'Mean time to fix', value: '9 days', color: tokens.colors.crypto.low },
    ],
    capabilities: [
      'SAST / DAST / IAST / RASP',
      'Software composition analysis',
      'Secret scanning & credential exposure',
      'IaC / Terraform / Helm scanning',
      'CI/CD pipeline security',
      'Runtime protection & WAF',
    ],
    frameworks: ['OWASP Top 10', 'OWASP ASVS', 'PCI DSS 4.0', 'NIST SSDF'],
    integrations: ['Semgrep', 'CodeQL', 'Snyk', 'Trivy', 'GitHub Actions'],
    findings: [
      { id: 'AS-0117', title: 'SQL injection in legacy checkout endpoint', ref: 'OWASP-A03', severity: 'critical', status: 'open', scope: 'checkout-api' },
      { id: 'AS-0102', title: 'Hardcoded database password in Terraform module', ref: 'Terraform-001', severity: 'critical', status: 'open', scope: 'infra/terraform' },
      { id: 'AS-0088', title: 'Helm chart runs container as root by default', ref: 'CIS-K8S-1.5', severity: 'high', status: 'investigating', scope: 'helm/charts' },
      { id: 'AS-0074', title: 'SAST coverage missing for two payment repos', ref: 'OWASP-ASVS', severity: 'medium', status: 'monitoring', scope: 'payments' },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance',
    tagline: 'Continuous compliance across global frameworks.',
    description: 'Map every control to DORA, NIS2, ISO 27001, SOC 2, PCI DSS, HIPAA, GDPR, FedRAMP, CIS, NIST CSF 2.0, ISO 42001, the EU AI Act, and the Cyber Resilience Act with evidence automation.',
    category: 'Compliance',
    icon: FactCheck,
    color: tokens.colors.gold[500],
    score: 80,
    connected: false,
    umbrella: true,
    kpis: [
      { label: 'Controls', value: '1,204', color: tokens.colors.rivicq[300] },
      { label: 'Pass rate', value: '88%', color: tokens.colors.crypto.low },
      { label: 'Frameworks', value: '14', color: tokens.colors.gold[400] },
      { label: 'Open gaps', value: '37', color: tokens.colors.crypto.high },
    ],
    capabilities: [
      'Continuous compliance monitoring',
      'Control-to-evidence mapping',
      'Automated evidence collection',
      'Gap analysis & remediation plans',
      'Executive compliance reporting',
      'Regulatory horizon scanning',
    ],
    frameworks: ['DORA', 'NIS2', 'ISO 27001', 'SOC 2', 'PCI DSS', 'HIPAA', 'GDPR', 'FedRAMP', 'CIS Benchmarks', 'NIST CSF 2.0', 'NIST 800-53', 'ISO 42001', 'EU AI Act', 'CRA'],
    integrations: ['ServiceNow', 'Vanta', 'Drata', 'Jira', 'AWS Config'],
    findings: [
      { id: 'CP-0031', title: 'DORA ICT risk register not updated this quarter', ref: 'DORA-Art-6', severity: 'high', status: 'open', scope: 'risk-register' },
      { id: 'CP-0027', title: 'NIS2 incident reporting workflow not tested', ref: 'NIS2-Art-23', severity: 'high', status: 'investigating', scope: 'soc-process' },
      { id: 'CP-0019', title: 'PCI DSS 4.0 requirement 11.6 evidence pending', ref: 'PCI-11.6', severity: 'medium', status: 'monitoring', scope: 'cd-trails' },
      { id: 'CP-0011', title: 'EU AI Act high-risk AI inventory incomplete', ref: 'EU-AI-Art-9', severity: 'high', status: 'open', scope: 'ai-registry' },
    ],
  },
  {
    id: 'analytics',
    name: 'Enterprise Analytics',
    tagline: 'Unified risk scores, dashboards, and predictive analytics.',
    description: 'Global, cyber, quantum, AI, compliance, and identity risk scores feeding executive, SOC, CISO, and board dashboards with a real-time unified risk graph and digital twin.',
    category: 'Enterprise Analytics',
    icon: Insights,
    color: tokens.colors.brand.blue,
    score: 85,
    connected: false,
    umbrella: true,
    kpis: [
      { label: 'Global risk score', value: '72', color: tokens.colors.crypto.high },
      { label: 'Predictions', value: '124', color: tokens.colors.rivicq[300] },
      { label: 'Dashboards', value: '8', color: tokens.colors.gold[400] },
      { label: 'Correlation', value: '96%', color: tokens.colors.crypto.low },
    ],
    capabilities: [
      'Global security & cyber risk scores',
      'Quantum readiness & AI risk scoring',
      'Executive, SOC, CISO & board dashboards',
      'Predictive risk analytics',
      'Real-time attack graph & digital twin',
      'Cross-domain asset correlation',
    ],
    frameworks: ['FAIR', 'NIST CSF 2.0', 'ISO 31000'],
    integrations: ['Prometheus', 'Grafana', 'OpenTelemetry', 'Snowflake', 'Databricks'],
    findings: [
      { id: 'AN-0014', title: 'Board dashboard missing quantum risk exposure view', ref: 'FAIR-01', severity: 'medium', status: 'open', scope: 'board' },
      { id: 'AN-0009', title: 'Predictive model drift above acceptable threshold', ref: 'ISO-31000', severity: 'high', status: 'investigating', scope: 'risk-engine' },
      { id: 'AN-0005', title: 'Risk graph lacks coverage for 3 cloud accounts', ref: 'NIST-CSF-2.0', severity: 'medium', status: 'monitoring', scope: 'risk-graph' },
    ],
  },
];

// ── Seed catalog (full vision, generated consistently) ───────────────────

const SEEDS: ModuleSeed[] = [
  {
    id: 'cloud-security',
    name: 'Cloud Security',
    tagline: 'Continuous cloud posture across every account and workload.',
    description: 'Assess cloud accounts, workloads, storage, and services against CIS, NIST, and SOC 2 baselines. Detect misconfigurations, public exposure, and drift in real time with one-click remediation.',
    category: 'Cloud Security',
    capabilities: [
      'Multi-account posture scanning',
      'Misconfiguration & drift detection',
      'Public exposure monitoring',
      'CSPM baseline & conformance packs',
      'Auto-remediation playbooks',
      'Cloud-native threat correlation',
    ],
    frameworks: ['CIS Foundations', 'NIST 800-53', 'SOC 2', 'PCI DSS 4.0'],
    integrations: ['AWS', 'Azure', 'GCP', 'IBM Cloud', 'Kubernetes'],
    connected: true,
  },
  {
    id: 'runtime-security',
    name: 'Runtime Security',
    tagline: 'Protect workloads and containers in production at runtime.',
    description: 'Monitor hosts, containers, and serverless functions for anomalous behavior, drift, and active threats. Enforce policy at runtime and respond to detections with automated containment.',
    category: 'Runtime Security',
    capabilities: [
      'Container & host monitoring',
      'Behavioral anomaly detection',
      'Runtime policy enforcement',
      'Serverless & function protection',
      'Automated containment',
      'Process & file integrity monitoring',
    ],
    frameworks: ['NIST 800-190', 'CIS Docker', 'CIS Kubernetes', 'OWASP'],
    integrations: ['Falco', 'Aqua', 'Sysdig', 'Lacework', 'Wazuh'],
    score: 63,
  },
  {
    id: 'network-security',
    name: 'Network Security',
    tagline: 'Visualize, segment, and defend the network attack surface.',
    description: 'Discover network assets and map open paths, exposed ports, and lateral movement risk. Enforce segmentation, inspect east-west traffic, and track protocol anomalies across the estate.',
    category: 'Network Security',
    capabilities: [
      'Attack-surface discovery',
      'Exposed port & path mapping',
      'Network segmentation & micro-segmentation',
      'East-west traffic inspection',
      'Firewall & security group auditing',
      'DNS & protocol anomaly detection',
    ],
    frameworks: ['NIST 800-41', 'CIS AWS', 'ISO 27001', 'Zero Trust'],
    integrations: ['AWS VPC', 'Azure VNet', 'Calico', 'Istio', 'Zeek'],
    score: 58,
  },
  {
    id: 'detection-engineering',
    name: 'Detection Engineering',
    tagline: 'Design, tune, and validate high-fidelity detections.',
    description: 'Build a detection-as-code pipeline: author Sigma and KQL rules, deploy to SIEM and XDR engines, measure coverage, and continuously reduce false positives.',
    category: 'Detection Engineering',
    capabilities: [
      'Detection-as-code authoring',
      'Sigma & KQL rule pipelines',
      'SIEM / XDR rule deployment',
      'MITRE ATT&CK coverage mapping',
      'False-positive tuning',
      'Detection validation & tests',
    ],
    frameworks: ['MITRE ATT&CK', 'NIST 800-61', 'Sigma'],
    integrations: ['Splunk', 'Sentinel', 'Elastic', 'CrowdStrike', 'Sigma'],
    score: 61,
  },
  {
    id: 'digital-forensics',
    name: 'Digital Forensics',
    tagline: 'Evidence-grade capture, analysis, and chain-of-custody.',
    description: 'Perform memory, disk, and cloud forensics with tamper-proof evidence chains. Preserve artifacts, correlate timelines, and produce investigation-ready reports for incident response and eDiscovery.',
    category: 'Digital Forensics',
    capabilities: [
      'Memory & disk acquisition',
      'Cloud & container forensics',
      'Tamper-proof evidence chains',
      'Timeline & artifact correlation',
      'Forensic imaging & hashing',
      'Investigation-ready reporting',
    ],
    frameworks: ['NIST SP 800-86', 'ACPO', 'ISO/IEC 27037'],
    integrations: ['Velociraptor', 'Volatility', 'Autopsy', 'FTK', 'Cellebrite'],
    score: 57,
  },
  {
    id: 'red-team',
    name: 'Red Team',
    tagline: 'Adversary-emulation campaigns that validate your defenses.',
    description: 'Plan and execute realistic attack campaigns across the kill chain. Measure detection and response effectiveness, prioritize exposures, and prove the impact of validated attack paths.',
    category: 'Red Team',
    capabilities: [
      'Adversary emulation planning',
      'Attack path & kill-chain simulation',
      'Phishing & social engineering ops',
      'Detection & response validation',
      'Exposure quantification',
      'Campaign scoring & reporting',
    ],
    frameworks: ['MITRE ATT&CK', 'Lockheed Kill Chain', 'PTES'],
    integrations: ['Cobalt Strike', 'Caldera', 'Atomic Red Team', 'Impacket', 'BloodHound'],
    score: 67,
  },
];

export const MODULES: SecurityModuleConfig[] = [...UMBRELLA_MODULES, ...SEEDS.map(moduleFromSeed)];

export const getModuleById = (id: string): SecurityModuleConfig | undefined =>
  MODULES.find((m) => m.id === id);

export const MODULE_CATEGORIES = MODULE_CATEGORIES_ORDER.filter((c) => MODULES.some((m) => m.category === c));

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

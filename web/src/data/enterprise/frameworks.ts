import type { ControlResult, FrameworkResult } from './types';

type SeedCtrl = {
  id: string;
  framework: string;
  title: string;
  critical?: boolean;
};

/**
 * Real control identifiers from published frameworks. Statuses are applied by
 * the simulation — this list is not a certification result.
 */
export const CONTROL_CATALOG: SeedCtrl[] = [
  // ISO/IEC 27001:2022 Annex A (sample of 32 real controls)
  { id: 'A.5.1', framework: 'iso27001', title: 'Policies for information security', critical: true },
  { id: 'A.5.7', framework: 'iso27001', title: 'Threat intelligence' },
  { id: 'A.5.15', framework: 'iso27001', title: 'Access control', critical: true },
  { id: 'A.5.17', framework: 'iso27001', title: 'Authentication information', critical: true },
  { id: 'A.5.23', framework: 'iso27001', title: 'Information security for use of cloud services', critical: true },
  { id: 'A.8.2', framework: 'iso27001', title: 'Privileged access rights', critical: true },
  { id: 'A.8.3', framework: 'iso27001', title: 'Information access restriction' },
  { id: 'A.8.5', framework: 'iso27001', title: 'Secure authentication', critical: true },
  { id: 'A.8.8', framework: 'iso27001', title: 'Management of technical vulnerabilities', critical: true },
  { id: 'A.8.9', framework: 'iso27001', title: 'Configuration management', critical: true },
  { id: 'A.8.12', framework: 'iso27001', title: 'Data leakage prevention' },
  { id: 'A.8.20', framework: 'iso27001', title: 'Networks security' },
  { id: 'A.8.22', framework: 'iso27001', title: 'Segregation of networks' },
  { id: 'A.8.24', framework: 'iso27001', title: 'Use of cryptography', critical: true },
  { id: 'A.8.25', framework: 'iso27001', title: 'Secure development life cycle' },
  { id: 'A.8.26', framework: 'iso27001', title: 'Application security requirements' },
  { id: 'A.8.32', framework: 'iso27001', title: 'Change management' },
  { id: 'A.5.24', framework: 'iso27001', title: 'Information security incident management planning' },
  { id: 'A.5.25', framework: 'iso27001', title: 'Assessment and decision on information security events' },
  { id: 'A.5.26', framework: 'iso27001', title: 'Response to information security incidents' },
  { id: 'A.5.29', framework: 'iso27001', title: 'Information security during disruption' },
  { id: 'A.5.31', framework: 'iso27001', title: 'Legal, statutory, regulatory and contractual requirements' },
  { id: 'A.5.33', framework: 'iso27001', title: 'Protection of records' },
  { id: 'A.5.34', framework: 'iso27001', title: 'Privacy and protection of PII' },
  { id: 'A.6.3', framework: 'iso27001', title: 'Information security awareness, education and training' },
  { id: 'A.7.4', framework: 'iso27001', title: 'Physical security monitoring' },
  { id: 'A.8.7', framework: 'iso27001', title: 'Protection against malware' },
  { id: 'A.8.13', framework: 'iso27001', title: 'Information backup' },
  { id: 'A.8.15', framework: 'iso27001', title: 'Logging' },
  { id: 'A.8.16', framework: 'iso27001', title: 'Monitoring activities' },
  { id: 'A.8.23', framework: 'iso27001', title: 'Web filtering' },
  { id: 'A.8.34', framework: 'iso27001', title: 'Protection of information systems during audit testing' },

  // CIS Controls v8 (safeguard-level sample)
  { id: 'CIS-1.1', framework: 'cis', title: 'Establish and maintain detailed enterprise asset inventory', critical: true },
  { id: 'CIS-3.3', framework: 'cis', title: 'Configure data access control lists' },
  { id: 'CIS-5.2', framework: 'cis', title: 'Use unique passwords', critical: true },
  { id: 'CIS-6.1', framework: 'cis', title: 'Establish an access granting process' },
  { id: 'CIS-6.5', framework: 'cis', title: 'Require MFA for administratively-configured accounts', critical: true },
  { id: 'CIS-7.5', framework: 'cis', title: 'Perform automated vulnerability scans of internal enterprise assets', critical: true },
  { id: 'CIS-7.7', framework: 'cis', title: 'Remediate detected vulnerabilities' },
  { id: 'CIS-12.2', framework: 'cis', title: 'Establish and maintain a secure network architecture' },
  { id: 'CIS-13.1', framework: 'cis', title: 'Centralize security event alerting' },
  { id: 'CIS-16.2', framework: 'cis', title: 'Establish a process to accept and address software vulnerabilities' },

  // NIS2 Articles (cybersecurity risk-management measures)
  { id: 'NIS2-Art21.2.a', framework: 'nis2', title: 'Policies on risk analysis and information system security', critical: true },
  { id: 'NIS2-Art21.2.c', framework: 'nis2', title: 'Business continuity, backup management and disaster recovery' },
  { id: 'NIS2-Art21.2.d', framework: 'nis2', title: 'Supply chain security' },
  { id: 'NIS2-Art21.2.e', framework: 'nis2', title: 'Security in network and information systems acquisition, development and maintenance', critical: true },
  { id: 'NIS2-Art21.2.g', framework: 'nis2', title: 'Basic cyber hygiene practices and cybersecurity training' },
  { id: 'NIS2-Art21.2.i', framework: 'nis2', title: 'Human resources security, access control policies and asset management', critical: true },
  { id: 'NIS2-Art21.2.j', framework: 'nis2', title: 'Use of multi-factor authentication or continuous authentication', critical: true },
  { id: 'NIS2-Art23', framework: 'nis2', title: 'Incident reporting obligations' },

  // DORA
  { id: 'DORA-Art5', framework: 'dora', title: 'ICT risk management framework', critical: true },
  { id: 'DORA-Art6', framework: 'dora', title: 'ICT risk management' },
  { id: 'DORA-Art9', framework: 'dora', title: 'Protection and prevention', critical: true },
  { id: 'DORA-Art10', framework: 'dora', title: 'Detection' },
  { id: 'DORA-Art11', framework: 'dora', title: 'Response and recovery' },
  { id: 'DORA-Art24', framework: 'dora', title: 'Testing of ICT tools and systems' },
  { id: 'DORA-Art28', framework: 'dora', title: 'ICT third-party risk' },

  // SOC 2 TSC
  { id: 'CC6.1', framework: 'soc2', title: 'Logical access security software, infrastructure, and architectures', critical: true },
  { id: 'CC6.6', framework: 'soc2', title: 'External access points are protected' },
  { id: 'CC7.1', framework: 'soc2', title: 'Detection and monitoring of configuration changes and anomalies', critical: true },
  { id: 'CC7.2', framework: 'soc2', title: 'Monitor system components for anomalies' },
  { id: 'CC8.1', framework: 'soc2', title: 'Change management process' },

  // GDPR
  { id: 'GDPR-Art25', framework: 'gdpr', title: 'Data protection by design and by default' },
  { id: 'GDPR-Art32', framework: 'gdpr', title: 'Security of processing', critical: true },
  { id: 'GDPR-Art33', framework: 'gdpr', title: 'Notification of a personal data breach to the supervisory authority' },
  { id: 'GDPR-Art35', framework: 'gdpr', title: 'Data protection impact assessment' },

  // NIST CSF 2.0
  { id: 'ID.AM-01', framework: 'nist', title: 'Inventories of hardware managed by the organization are maintained' },
  { id: 'PR.AA-01', framework: 'nist', title: 'Identities and credentials for authorized users, services, and hardware are managed', critical: true },
  { id: 'PR.DS-01', framework: 'nist', title: 'The confidentiality, integrity, and availability of data-at-rest are protected', critical: true },
  { id: 'DE.CM-09', framework: 'nist', title: 'Computing hardware and software, runtime environments, and their data are monitored' },
  { id: 'RS.MI-01', framework: 'nist', title: 'Incidents are contained' },

  // BSI TR-02102 cryptographic recommendations (mapped as assessable controls)
  { id: 'BSI-TR-02102-AES', framework: 'bsi', title: 'Symmetric encryption: AES (no 3DES / DES)', critical: true },
  { id: 'BSI-TR-02102-RSA', framework: 'bsi', title: 'RSA key length ≥ 3000 bits for new systems (2048 sunset)', critical: true },
  { id: 'BSI-TR-02102-TLS', framework: 'bsi', title: 'TLS 1.2+ with forward secrecy; no static RSA key exchange', critical: true },
  { id: 'BSI-TR-02102-PQC', framework: 'bsi', title: 'Plan migration to PQC (ML-KEM / ML-DSA) for long-lived confidentiality', critical: true },

  // PCI DSS 4.0 sample
  { id: 'PCI-3.5', framework: 'pci', title: 'Primary account number is secured wherever it is stored', critical: true },
  { id: 'PCI-4.2', framework: 'pci', title: 'Strong cryptography and security protocols protect PAN during transmission', critical: true },
  { id: 'PCI-6.3', framework: 'pci', title: 'Security vulnerabilities are identified and addressed' },
  { id: 'PCI-8.4', framework: 'pci', title: 'MFA is implemented to secure CDE access', critical: true },

  // EU CRA (product cybersecurity)
  { id: 'CRA-AnnexI-1', framework: 'cra', title: 'Products with digital elements designed, developed and produced to ensure an appropriate level of cybersecurity', critical: true },
  { id: 'CRA-AnnexI-2', framework: 'cra', title: 'Vulnerabilities are handled effectively' },
];

export const FRAMEWORK_META: Record<string, { name: string; note: string }> = {
  iso27001: { name: 'ISO 27001', note: 'ISO/IEC 27001:2022 Annex A sample — not a certification audit.' },
  cis: { name: 'CIS Controls', note: 'CIS Controls v8 safeguard sample.' },
  nis2: { name: 'NIS2', note: 'Directive (EU) 2022/2555 Article 21/23 measures.' },
  dora: { name: 'DORA', note: 'Regulation (EU) 2022/2554 ICT risk articles.' },
  soc2: { name: 'SOC 2', note: 'AICPA TSC sample (CC series).' },
  gdpr: { name: 'GDPR', note: 'Regulation (EU) 2016/679 Articles 25/32/33/35.' },
  nist: { name: 'NIST CSF', note: 'NIST CSF 2.0 subcategory sample.' },
  bsi: { name: 'BSI TR-02102', note: 'BSI cryptographic recommendations mapped as controls.' },
  pci: { name: 'PCI DSS', note: 'PCI DSS 4.0 requirement sample.' },
  cra: { name: 'EU CRA', note: 'EU Cyber Resilience Act Annex I sample.' },
};

export function summarizeFramework(framework: string, controls: ControlResult[]): FrameworkResult {
  const assessed = controls.filter((c) => c.status !== 'na').length;
  const passed = controls.filter((c) => c.status === 'passed').length;
  const failed = controls.filter((c) => c.status === 'failed').length;
  const partial = controls.filter((c) => c.status === 'partial').length;
  const na = controls.filter((c) => c.status === 'na').length;
  const criticalFailures = controls.filter((c) => c.critical && c.status === 'failed').length;
  const score = assessed === 0 ? 0 : Math.round(((passed + partial * 0.5) / assessed) * 1000) / 10;
  const meta = FRAMEWORK_META[framework] || { name: framework, note: '' };
  return {
    id: framework,
    name: meta.name,
    assessed,
    passed,
    failed,
    partial,
    na,
    criticalFailures,
    score,
    controls,
  };
}

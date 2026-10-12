/**
 * Static-Pages demo responder.
 *
 * On GitHub Pages there is no backend, so "login" and "scan" cannot reach a
 * real API. When a client demo session is active (see demo/constants.ts) this
 * module answers the CBOM scan endpoints with clearly-labelled sample data that
 * progresses like a live scan (running -> completed) so the CBOM Scanner,
 * Findings and report panels are fully interactive without any network.
 *
 * The data is synthetic. It never leaves the browser and is never presented as
 * a real certification.
 */

import axios, { AxiosAdapter, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { CLIENT_DEMO_TOKEN, DEMO_STORAGE_KEY } from './constants';

export function isDemoSessionActive(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === '1'
    || localStorage.getItem('auth_token') === CLIENT_DEMO_TOKEN;
}

interface DemoScanState {
  id: string;
  target: string;
  scanType: string;
  createdAt: string;
  progress: number;
  status: 'running' | 'completed';
}

const scanStore = new Map<string, DemoScanState>();

const BASE_FINDINGS: Array<Record<string, unknown>> = [
  {
    severity: 'high',
    title: 'RSA-2048 certificate key offered on TLS',
    algorithm: 'RSA-2048',
    quantum_safe: false,
    bsi_ref: 'BSI TR-02102-2',
    protocol: 'https',
    port: 443,
    evidence: 'End-entity X.509 certificate presents an RSA-2048 signing key with a SHA-256 digest.',
    remediation: 'Plan a migration to an ECC or post-quantum (ML-KEM/ML-DSA/SLH-DSA) key when the trust chain allows it.',
  },
  {
    severity: 'high',
    title: 'SHA-1 present in certificate signature chain',
    algorithm: 'SHA-1',
    quantum_safe: false,
    bsi_ref: 'BSI TR-02102-2',
    protocol: 'https',
    port: 443,
    evidence: 'An intermediate certificate in the served chain still uses the SHA-1 digest.',
    remediation: 'Re-issue the chain with SHA-256 signatures and do not pin SHA-1 intermediates.',
  },
  {
    severity: 'medium',
    title: 'TLS 1.2 is still offered with legacy ciphers',
    algorithm: 'TLS 1.2',
    quantum_safe: false,
    protocol: 'https',
    port: 443,
    evidence: 'Server accepted a TLS 1.2 handshake; enable TLS 1.3-only when device support allows.',
    remediation: 'Cap the handshake at TLS 1.3 and drop CBC suites.',
  },
  {
    severity: 'medium',
    title: 'Missing HSTS on HTTPS responses',
    algorithm: undefined,
    quantum_safe: true,
    protocol: 'https',
    port: 443,
    evidence: 'No Strict-Transport-Security header observed on the first response.',
    remediation: 'Serve Strict-Transport-Security with a long max-age over the main host.',
  },
  {
    severity: 'low',
    title: 'AES-128-GCM symmetric traffic encryption',
    algorithm: 'AES-128-GCM',
    quantum_safe: true,
    protocol: 'tls',
    port: 443,
    evidence: 'Bulk record encryption negotiated as AES-128-GCM (minimum acceptable symmetric cipher).',
    remediation: 'Consider AES-256-GCM where the device has a hardware accelerator.',
  },
  {
    severity: 'low',
    title: 'ECDSA P-256 certificate key available',
    algorithm: 'ECDSA P-256',
    quantum_safe: false,
    bsi_ref: 'BSI TR-02102-2 / NIST SP 800-131A Rev 2',
    protocol: 'https',
    port: 443,
    evidence: 'A P-256 ECDSA key is present in the trusted set; crypto-agility note for store-and-forward exposure.',
    remediation: 'Track as crypto-agile: P-256 stays acceptable today but belongs on the PQC migration watch-list.',
  },
  {
    severity: 'low',
    title: 'Public server banner exposes version detail',
    algorithm: undefined,
    quantum_safe: true,
    protocol: 'https',
    port: 443,
    evidence: 'Server header exposes product and version in the HTTP response.',
    remediation: 'Strip the Server header at the edge reverse proxy.',
  },
];

let baselineSent = false;
const BASELINE_COUNT = 4;

function hostOf(target: string): string {
  try {
    const u = new URL(target.startsWith('http') ? target : `https://${target}`);
    return u.hostname;
  } catch {
    return target;
  }
}

function makeFindingItems(target: string, scanId: string, scanType: string): Array<Record<string, unknown>> {
  const host = hostOf(target);
  const rest = BASE_FINDINGS.map((f, i) => ({
    ...f,
    id: `${scanId}-finding-${i + 1}`,
    asset: host,
    target_label: target,
    host,
    description: f.title,
    scan_id: scanId,
    scan_type: scanType,
    status: 'open',
  } as Record<string, unknown>)).slice(1);
  return [{
    severity: 'critical',
    title: 'Legacy SHA-1 certificate signature detected',
    algorithm: 'SHA-1',
    quantum_safe: false,
    bsi_ref: 'BSI TR-02102-2',
    protocol: scanType === 'website' ? 'https' : 'tls',
    port: 443,
    evidence: `The leaf certificate on ${host} is still signed with SHA-1.`,
    remediation: 'Rotate the certificate and signature chain to SHA-256 now. This blocks under the default policy gate.',
    id: `${scanId}-finding-0`,
    asset: host,
    target_label: target,
    host,
    description: 'Legacy SHA-1 certificate signature detected',
    scan_id: scanId,
    scan_type: scanType,
    status: 'open',
  } as Record<string, unknown>, ...rest];
}

function okResponse(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: status === 200 ? 'OK' : 'Created', headers: {}, config };
}

function urlOf(config: InternalAxiosRequestConfig): string {
  let url = config.url || '';
  if (!url.startsWith('/')) url = `/${url}`;
  return url.replace(/^\/api\/v1/, '');
}

function isScanIdSegment(seg: string): boolean {
  return /^demo-[a-z0-9]+$/i.test(seg) || /^scan-/.test(seg) || /^[0-9a-f-]{20,}$/.test(seg);
}

function listScansPayload(): Record<string, unknown> {
  const scans = Array.from(scanStore.values()).map((s) => ({
    id: s.id,
    scan_id: s.id,
    status: s.status,
    scan_type: s.scanType,
    target: s.target,
    created_at: s.createdAt,
    progress: s.status === 'completed' ? 100 : s.progress,
    findings: { total: s.status === 'completed' ? makeFindingItems(s.target, s.id, s.scanType).length : 0 },
  }));
  return { scans };
}

function findingsPayload(): Record<string, unknown> {
  const findings: Array<Record<string, unknown>> = [];
  if (!baselineSent) {
    baselineSent = true;
    for (let i = 1; i <= BASELINE_COUNT; i += 1) {
      findings.push({
        id: `demo-baseline-${i}`,
        severity: i <= 2 ? 'high' : 'low',
        title: i <= 2 ? 'Legacy Signature Algorithm on device attestation' : 'Strong modern algorithm observed',
        algorithm: i <= 2 ? 'SHA-1' : 'AES-256-GCM',
        quantum_safe: i > 2,
        bsi_ref: i <= 2 ? 'BSI TR-02102-2' : 'BSI TR-02102-2 (PQC annex)',
        asset: 'riot-demo-device.local',
        target_label: 'riot-demo-device.local',
        host: 'riot-demo-device.local',
        description: i <= 2 ? 'Sample demo finding (seeded).' : 'Sample demo observation (seeded).',
        remediation: 'See the demo CBOM report; rotate leaf signatures in the real estate.',
        scan_id: 'demo-seed',
        status: 'open',
      });
    }
  }
  scanStore.forEach((s) => {
    if (s.status === 'completed') {
      findings.push(...makeFindingItems(s.target, s.id, s.scanType));
    }
  });
  return { findings };
}

function intelligencePayload(state: DemoScanState): Record<string, unknown> {
  return {
    gate: { decision: 'demo_pass', failed: false, reasons: [], warnings: ['Demo policy evaluation — not a live gate.'] },
    client_architecture: {
      target_class: state.scanType,
      target: state.target,
      edition: 'oss',
      resources: { web: true, network: true, kubernetes: false, multi_cloud: false, firmware: false },
      phases: [
        { id: 'discover', title: 'Discover', status: 'done', summary: `Inventoried cryptography on ${state.target}.` },
        { id: 'mitigate', title: 'Mitigate', status: 'demo', summary: 'NIST PQC mappings computed on demo data.' },
        { id: 'report', title: 'Report', status: 'demo', summary: 'CBOM report available below (sample data).' },
      ],
      honesty: 'Demo client report built in-browser. No live estate was touched.',
    },
    pqc_readiness: {
      overall: 68,
      layers: { endpoints: 72, data: 64, identities: 71, supply_chain: 60 },
      hndl_exposure: 0.31,
      migration: [
        { algorithm: 'RSA-2048', replace_with: 'ML-DSA-44 / ML-KEM-768', standard: 'NIST FIPS 203/204', priority: 'high' },
        { algorithm: 'ECDSA P-256', replace_with: 'ML-DSA-44 or SLH-DSA', standard: 'NIST FIPS 204/205', priority: 'medium' },
      ],
      compliance: [
        { framework: 'ISO 27001', control: 'A.8.24', status: 'partial' },
        { framework: 'SOC 2', control: 'CC7 & CC8', status: 'partial' },
      ],
      pack_available: true,
      note: 'Demo readiness score derived from sample findings.',
    },
  };
}

function qiskitPayload(state: DemoScanState): Record<string, unknown> {
  return {
    qiskit: { estate_score: 0.68, note: 'Demo estate score.', source: 'demo' },
    audit_score: { overall: 0.72, note: 'Demo audit overview (qiskit-style Q scores).' },
    resources: { qiskit: true, web: true, network: true },
  };
}

/**
 * Attempts to answer a request from the in-browser demo. Returns null when the
 * request must fall through to the real adapter (or network).
 */
export function demoScanRespond(config: InternalAxiosRequestConfig): Promise<AxiosResponse> | null {
  const method = (config.method || 'get').toLowerCase();
  const url = urlOf(config);
  const segs = url.split('/').filter(Boolean);

  // POST /scans — start a demo scan
  if (method === 'post' && segs.length === 1 && segs[0] === 'scans') {
    const body = (config.data ?? {}) as Record<string, unknown>;
    const target = String(body.target || 'https://demo.example');
    const scanType = String(body.scan_type || 'cbom');
    const id = `demo-${Date.now().toString(36)}`;
    scanStore.set(id, { id, target, scanType, createdAt: new Date().toISOString(), progress: 0, status: 'running' });
    return Promise.resolve(okResponse(config, { scan_id: id, status: 'running', progress: 0, target, scan_type: scanType }, 201));
  }

  // GET /scans — list
  if (method === 'get' && segs.length === 1 && segs[0] === 'scans') {
    return Promise.resolve(okResponse(config, listScansPayload()));
  }

  // GET /scans/findings
  if (method === 'get' && segs.length === 2 && segs[0] === 'scans' && segs[1] === 'findings') {
    return Promise.resolve(okResponse(config, findingsPayload()));
  }

  // GET /scans/{id}
  if (method === 'get' && segs.length === 2 && segs[0] === 'scans' && isScanIdSegment(segs[1])) {
    const s = scanStore.get(segs[1]);
    if (!s) return null;
    const progress = s.status === 'completed' ? 100 : Math.min(100, s.progress + 20);
    const status = progress >= 100 ? 'completed' : 'running';
    s.progress = progress;
    s.status = status;
    const completed = status === 'completed';
    return Promise.resolve(okResponse(config, {
      id: s.id,
      scan_id: s.id,
      status,
      progress,
      target: s.target,
      scan_type: s.scanType,
      created_at: s.createdAt,
      findings: { total: completed ? makeFindingItems(s.target, s.id, s.scanType).length : 0 },
      finding_items: completed ? makeFindingItems(s.target, s.id, s.scanType) : [],
      resources: { web: true, network: true },
    }));
  }

  // GET /scans/{id}/intelligence
  if (method === 'get' && segs.length === 3 && segs[0] === 'scans' && isScanIdSegment(segs[1]) && segs[2] === 'intelligence') {
    const s = scanStore.get(segs[1]);
    if (!s) return null;
    return Promise.resolve(okResponse(config, intelligencePayload(s)));
  }

  // GET /scans/{id}/qiskit
  if (method === 'get' && segs.length === 3 && segs[0] === 'scans' && isScanIdSegment(segs[1]) && segs[2] === 'qiskit') {
    const s = scanStore.get(segs[1]);
    if (!s) return null;
    return Promise.resolve(okResponse(config, qiskitPayload(s)));
  }

  return null;
}

const realAdapter: AxiosAdapter = axios.create().defaults.adapter as unknown as AxiosAdapter;

export const demoAwareAdapter: AxiosAdapter = (config) => {
  if (isDemoSessionActive()) {
    const handled = demoScanRespond(config);
    if (handled) return handled;
  }
  return realAdapter(config);
};
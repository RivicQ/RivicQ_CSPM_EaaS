export type OpsFinding = {
  id: string;
  severity: string;
  title: string;
  description: string;
  asset: string;
  host?: string;
  port?: number;
  protocol?: string;
  algorithm?: string;
  evidence?: string;
  remediation?: string;
  quantumSafe?: boolean;
  bsiRef?: string;
  scanId?: string;
  status: 'open';
};

export function normalizeSeverity(raw?: string): string {
  const s = (raw || '').toLowerCase();
  if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low') return s;
  if (s === 'info' || s === 'informational') return 'info';
  return s || 'info';
}

export function normalizeFinding(raw: Record<string, unknown>, index = 0): OpsFinding {
  const id = String(raw.id || raw.finding_id || `finding-${index + 1}`);
  const title = String(raw.title || raw.message || raw.algorithm || 'Untitled finding');
  return {
    id,
    severity: normalizeSeverity(String(raw.severity || '')),
    title,
    description: String(raw.description || ''),
    asset: String(raw.asset || raw.target_label || raw.host || ''),
    host: raw.host != null ? String(raw.host) : undefined,
    port: typeof raw.port === 'number' ? raw.port : undefined,
    protocol: raw.protocol != null ? String(raw.protocol) : undefined,
    algorithm: raw.algorithm != null ? String(raw.algorithm) : undefined,
    evidence: raw.evidence != null ? String(raw.evidence) : undefined,
    remediation: String(raw.remediation || raw.recommendation || ''),
    quantumSafe: Boolean(raw.quantum_safe ?? raw.quantumSafe),
    bsiRef: raw.bsi_ref != null ? String(raw.bsi_ref) : undefined,
    scanId: raw.scan_id != null ? String(raw.scan_id) : undefined,
    status: 'open',
  };
}

export function parseFindingsPayload(data: unknown): OpsFinding[] {
  if (!data || typeof data !== 'object') return [];
  const rec = data as Record<string, unknown>;
  const list = Array.isArray(rec.findings) ? rec.findings : Array.isArray(data) ? data : [];
  return list
    .filter((row) => row && typeof row === 'object')
    .map((row, i) => normalizeFinding(row as Record<string, unknown>, i));
}

export type OpsStatus =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'unknown'
  | 'running'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'disabled'
  | 'disconnected'
  | 'needs_attention';

export function scanStatus(raw?: string): OpsStatus {
  const s = (raw || '').toLowerCase();
  if (s === 'completed' || s === 'success') return 'completed';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'running' || s === 'in_progress') return 'running';
  if (s === 'pending' || s === 'queued' || s === 'idle') return 'pending';
  return 'unknown';
}

const RECENT_KEY = 'rivicq.ops.recentSearch';
const VIEWS_KEY = 'rivicq.ops.savedViews';

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(q: string): string[] {
  const next = [q, ...loadRecentSearches().filter((x) => x !== q)].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export type SavedView = { id: string; name: string; query: string };

export function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveView(name: string, query: string): SavedView[] {
  const views = loadSavedViews().filter((v) => v.name !== name);
  const next = [{ id: `view-${Date.now()}`, name, query }, ...views].slice(0, 20);
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function deleteView(id: string): SavedView[] {
  const next = loadSavedViews().filter((v) => v.id !== id);
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

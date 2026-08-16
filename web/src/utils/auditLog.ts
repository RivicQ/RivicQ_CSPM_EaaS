export type AuditEvent = {
  id: string;
  at: string;
  action: string;
  detail?: string;
};

const KEY = 'rivicq_audit_log';

export function readAuditLog(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAudit(action: string, detail?: string): void {
  try {
    const next: AuditEvent = { id: `aud-${Date.now()}`, at: new Date().toISOString(), action, detail };
    writeAuditLog([next, ...readAuditLog()].slice(0, 80));
  } catch {
    // ignore
  }
}

export function writeAuditLog(events: AuditEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

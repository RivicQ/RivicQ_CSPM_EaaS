import { Edition, normalizeEdition } from '../config/editions';

export type Workspace = {
  id: string;
  name: string;
  edition: Edition;
  createdAt: string;
};

const KEY = 'rivicq_workspace';

function randomId(): string {
  return `ws-${Math.random().toString(36).slice(2, 10)}`;
}

export function readWorkspace(): Workspace | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return {
      id: String(parsed.id),
      name: String(parsed.name || 'My workspace'),
      edition: normalizeEdition(parsed.edition),
      createdAt: String(parsed.createdAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function writeWorkspace(workspace: Workspace): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(workspace));
  } catch {
    // ignore quota
  }
}

export function ensureWorkspace(name: string, edition: Edition): Workspace {
  const existing = readWorkspace();
  if (existing) {
    const next = { ...existing, name: existing.name || name, edition };
    writeWorkspace(next);
    return next;
  }
  const created: Workspace = {
    id: randomId(),
    name: name || 'Community workspace',
    edition,
    createdAt: new Date().toISOString(),
  };
  writeWorkspace(created);
  return created;
}

export function updateWorkspaceName(name: string): Workspace | null {
  const existing = readWorkspace();
  if (!existing) return null;
  const next = { ...existing, name };
  writeWorkspace(next);
  return next;
}

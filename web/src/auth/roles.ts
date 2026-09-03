export const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  analyst: 2,
  operator: 3,
  admin: 4,
};

export type WorkspaceRole = 'viewer' | 'analyst' | 'operator' | 'admin';

export const WORKSPACE_ROLES: WorkspaceRole[] = ['viewer', 'analyst', 'operator', 'admin'];

export function normalizeRole(role?: string | null): WorkspaceRole {
  const r = (role || '').toLowerCase().trim();
  return (ROLE_RANK[r] ? r : 'viewer') as WorkspaceRole;
}

export function roleAtLeast(have: string | undefined | null, need: WorkspaceRole): boolean {
  return (ROLE_RANK[normalizeRole(have)] || 0) >= (ROLE_RANK[need] || 0);
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

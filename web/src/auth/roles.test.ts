import { isAdminRole, normalizeRole, roleAtLeast, WORKSPACE_ROLES } from './roles';

describe('workspace roles', () => {
  it('normalizes unknown roles to viewer', () => {
    expect(normalizeRole('')).toBe('viewer');
    expect(normalizeRole('superuser')).toBe('viewer');
    expect(normalizeRole('Admin')).toBe('admin');
  });

  it('compares ranks Viewer < Analyst < Operator < Admin', () => {
    expect(roleAtLeast('viewer', 'admin')).toBe(false);
    expect(roleAtLeast('analyst', 'viewer')).toBe(true);
    expect(roleAtLeast('operator', 'analyst')).toBe(true);
    expect(roleAtLeast('admin', 'operator')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('operator')).toBe(false);
  });

  it('exposes the four control-plane roles', () => {
    expect(WORKSPACE_ROLES).toEqual(['viewer', 'analyst', 'operator', 'admin']);
  });
});

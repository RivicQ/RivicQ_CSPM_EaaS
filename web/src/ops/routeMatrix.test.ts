import { APP_ROUTES, routeByPath } from './routeMatrix';
import { OPS_ROUTES } from './navigation';

describe('route matrix', () => {
  it('has unique paths', () => {
    const seen = new Set<string>();
    for (const r of APP_ROUTES) {
      expect(seen.has(r.path)).toBe(false);
      seen.add(r.path);
    }
    expect(APP_ROUTES.length).toBeGreaterThan(20);
  });

  it('covers every ops navigation path', () => {
    const missing: string[] = [];
    for (const r of OPS_ROUTES) {
      if (!routeByPath(r.path)) {
        missing.push(r.path);
      }
    }
    expect(missing).toEqual([]);
  });

  it('does not mark enterprise-only ops routes as live community', () => {
    for (const r of OPS_ROUTES.filter((o) => o.enterpriseOnly)) {
      const app = routeByPath(r.path);
      expect(app?.availability).toBe('enterprise');
    }
  });

  it('keeps auth, scanner, findings, and bom routes callable', () => {
    expect(routeByPath('/login')?.availability).toBe('live');
    expect(routeByPath('/scanner')?.availability).toBe('live');
    expect(routeByPath('/findings')?.availability).toBe('live');
    expect(routeByPath('/bom')?.availability).toBe('live');
  });
});

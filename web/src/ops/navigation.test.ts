import { breadcrumbFor, OPS_ROUTES, titleFor } from './navigation';

describe('ops navigation', () => {
  it('builds breadcrumbs for findings and assets', () => {
    const f = breadcrumbFor('/findings');
    expect(f.some((c) => c.label === 'Findings')).toBe(true);
    const a = breadcrumbFor('/assets/abc');
    expect(a.map((c) => c.label)).toEqual(['RivicQ', 'Assets', 'Asset']);
  });

  it('titles known routes', () => {
    expect(titleFor('/findings')).toBe('Findings');
    expect(titleFor('/scanner')).toBe('Scans');
  });

  it('keeps marketing desks off the primary sidebar', () => {
    const quiet = OPS_ROUTES.filter((r) => r.quiet).map((r) => r.path);
    expect(quiet).toEqual(expect.arrayContaining(['/contact', '/ibm', '/crm']));
    expect(OPS_ROUTES.filter((r) => r.section === 'Integrations' && !r.quiet).map((r) => r.path)).toEqual([
      '/tools',
      '/ecosystem',
      '/pipeline',
    ]);
  });
});

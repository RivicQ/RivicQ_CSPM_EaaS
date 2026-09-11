import { breadcrumbFor, titleFor } from './navigation';

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
});

import fs from 'fs';
import path from 'path';

describe('Layout console shell', () => {
  const source = fs.readFileSync(path.resolve(__dirname, 'Layout.tsx'), 'utf8');

  it('provides a skip link and console Archify backdrop', () => {
    expect(source).toContain('href="#main-content"');
    expect(source).toContain('id="main-content"');
    expect(source).toContain('<ArchifySurface placement="backdrop" variant="console" />');
  });

  it('removes the public theme toggle from the console app bar', () => {
    expect(source).not.toContain('ThemeToggle');
    expect(source).not.toContain('toggleMode');
  });
});

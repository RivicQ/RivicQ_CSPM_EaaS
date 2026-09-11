import fs from 'fs';
import path from 'path';

describe('RivicQ mark', () => {
  it('is the geometric R badge, not the old orbital hex', () => {
    const svg = fs.readFileSync(path.join(__dirname, 'rivicq-mark.svg'), 'utf8');
    expect(svg).toMatch(/aria-label="RivicQ"/);
    expect(svg).toMatch(/viewBox="0 0 64 64"/);
    expect(svg).not.toMatch(/ellipse/);
    expect(svg).not.toMatch(/hex/i);
  });

  it('keeps the public favicon copy identical to the bundled mark', () => {
    const bundled = fs.readFileSync(path.join(__dirname, 'rivicq-mark.svg'), 'utf8');
    const publicCopy = fs.readFileSync(
      path.join(__dirname, '../../../public/brand/rivicq-mark.svg'),
      'utf8',
    );
    expect(publicCopy).toBe(bundled);
  });
});

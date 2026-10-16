import { getAppTheme } from './theme';

describe('getAppTheme', () => {
  it('uses nebula surfaces in dark mode', () => {
    const theme = getAppTheme('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.background.default).toBe('#000000');
    expect(theme.palette.primary.main).toBe('#7c3aed');
  });

  it('uses day paper in light mode', () => {
    const theme = getAppTheme('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.background.default).toBe('#f4f0fb');
    expect(theme.palette.text.primary).toBe('#0a0a0f');
    expect(theme.palette.primary.main).toBe('#7c3aed');
  });
});

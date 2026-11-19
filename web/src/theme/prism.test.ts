import { PRISM, prismCssVariables, prismPalette } from './prism';
import { getAppTheme } from './theme';

describe('Prism tokens', () => {
  it('defines distinct dark and light palettes', () => {
    expect(prismPalette('dark')).toEqual(PRISM.dark);
    expect(prismPalette('light')).toEqual(PRISM.light);
    expect(PRISM.dark.canvas).not.toBe(PRISM.light.canvas);
    expect(PRISM.dark.text).not.toBe(PRISM.light.text);
  });

  it('exposes themeable CSS variables', () => {
    expect(prismCssVariables('light')).toMatchObject({
      '--rvq-canvas': PRISM.light.canvas,
      '--rvq-surface': PRISM.light.surface,
      '--rvq-text': PRISM.light.text,
      '--rvq-border': PRISM.light.border,
    });
  });

  it('builds real light and dark MUI themes', () => {
    const dark = getAppTheme('dark');
    const light = getAppTheme('light');

    expect(dark.palette.mode).toBe('dark');
    expect(dark.palette.background.default).toBe(PRISM.dark.canvas);
    expect(dark.palette.text.primary).toBe(PRISM.dark.text);

    expect(light.palette.mode).toBe('light');
    expect(light.palette.background.default).toBe(PRISM.light.canvas);
    expect(light.palette.text.primary).toBe(PRISM.light.text);
  });
});

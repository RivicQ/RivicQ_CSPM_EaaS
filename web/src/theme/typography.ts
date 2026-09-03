/** RivicQ Security Cloud type — Outfit (UI) + JetBrains Mono. */
export const appTypography = {
  fontFamily: '"Outfit", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',

  display: {
    fontFamily: '"Outfit", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    fontFeatureSettings: '"ss01"',
  },

  metric: {
    fontFamily: '"Outfit", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums' as const,
    fontFeatureSettings: '"tnum"',
  },

  eyebrow: {
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    fontSize: '0.75rem',
  },

  heading: {
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
  },

  body: {
    fontWeight: 400,
    lineHeight: 1.5,
  },
} as const;

export default appTypography;

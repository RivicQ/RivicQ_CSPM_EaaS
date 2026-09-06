/** RivicQ Security Cloud type — Inter (UI) + JetBrains Mono. */
export const appTypography = {
  fontFamily: '"Inter", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',

  display: {
    fontFamily: '"Inter", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1.12,
  },

  metric: {
    fontFamily: '"Inter", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums' as const,
    fontFeatureSettings: '"tnum"',
  },

  eyebrow: {
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    fontSize: '0.6875rem',
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

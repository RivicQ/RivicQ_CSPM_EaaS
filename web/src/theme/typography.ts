/** RivicQ Security Cloud type — Inter + JetBrains Mono. */
export const appTypography = {
  fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',

  display: {
    fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.08,
  },

  metric: {
    fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 650,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums' as const,
    fontFeatureSettings: '"tnum"',
  },

  eyebrow: {
    fontWeight: 650,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    fontSize: '0.6875rem',
  },

  heading: {
    fontWeight: 650,
    letterSpacing: '-0.018em',
    lineHeight: 1.28,
  },

  body: {
    fontWeight: 400,
    lineHeight: 1.55,
  },
} as const;

export default appTypography;

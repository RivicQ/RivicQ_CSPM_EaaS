/** RivicQ Security Cloud type — Source Sans 3 + Source Code Pro. Not IBM Plex. */
export const appTypography = {
  fontFamily: '"Source Sans 3", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono: '"Source Code Pro", ui-monospace, monospace',

  display: {
    fontFamily: '"Source Sans 3", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 620,
    letterSpacing: '-0.028em',
    lineHeight: 1.08,
  },

  metric: {
    fontFamily: '"Source Sans 3", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 620,
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
    fontWeight: 620,
    letterSpacing: '-0.018em',
    lineHeight: 1.28,
  },

  body: {
    fontWeight: 400,
    lineHeight: 1.55,
  },
} as const;

export default appTypography;

/** RivicQ type — Space Grotesk titles, Inter body, JetBrains Mono. Matches archify/site. */
export const appTypography = {
  fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyTitle: '"Space Grotesk", Inter, system-ui, sans-serif',
  fontFamilyDisplay: 'Fraunces, Georgia, serif',
  fontFamilyMono: '"JetBrains Mono", ui-monospace, monospace',

  display: {
    fontFamily: '"Space Grotesk", Inter, system-ui, sans-serif',
    fontWeight: 500,
    letterSpacing: '-0.04em',
    lineHeight: 1.08,
  },

  metric: {
    fontFamily: '"Space Grotesk", Inter, system-ui, sans-serif',
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

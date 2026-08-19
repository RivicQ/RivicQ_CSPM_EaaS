/** IBM Plex — the IBM Carbon type family used across IBM Cloud / security tools. */
export const appTypography = {
  fontFamily: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono: '"IBM Plex Mono", "SF Mono", ui-monospace, monospace',

  display: {
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    letterSpacing: '0',
    lineHeight: 1.2,
    fontFeatureSettings: '"ss02"',
  },

  metric: {
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    letterSpacing: '-0.02em',
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
    letterSpacing: '0',
    lineHeight: 1.3,
  },

  body: {
    fontWeight: 400,
    lineHeight: 1.5,
  },
} as const;

export default appTypography;

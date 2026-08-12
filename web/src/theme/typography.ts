/** Professional dashboard typography — Plus Jakarta Sans UI, mono reserved for code */
export const appTypography = {
  fontFamily:
    '"Plus Jakarta Sans", "Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
  fontFamilyMono:
    '"IBM Plex Mono", "SF Mono", ui-monospace, monospace',

  /** Page & section titles (Security Command Center, etc.) */
  display: {
    fontFamily:
      '"Plus Jakarta Sans", "Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
    fontWeight: 600,
    letterSpacing: '-0.022em',
    lineHeight: 1.18,
    fontFeatureSettings: '"ss01"',
  },

  /** KPI numbers, scores, chart values */
  metric: {
    fontFamily:
      '"Plus Jakarta Sans", "Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.025em',
    fontVariantNumeric: 'tabular-nums' as const,
    fontFeatureSettings: '"tnum", "ss01"',
  },

  /** Small caps labels (Command Center, Inventory, etc.) */
  eyebrow: {
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    fontSize: '0.6875rem',
  },

  /** Panel & card headings */
  heading: {
    fontWeight: 600,
    letterSpacing: '-0.015em',
    lineHeight: 1.35,
  },

  body: {
    fontWeight: 400,
    lineHeight: 1.6,
  },
} as const;

export default appTypography;

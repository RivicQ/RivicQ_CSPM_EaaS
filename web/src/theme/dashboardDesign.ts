import { tokens } from './tokens';

/** Designer-level dashboard design tokens */
export const dashboardDesign = {
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
  spacing: {
    page: 24,
    section: 20,
    card: 20,
    tight: 12,
  },
  chart: {
    grid: 'rgba(100,116,139,0.08)',
    gridDark: 'rgba(148,163,184,0.1)',
    barGradient: [tokens.colors.rivicq[600], tokens.colors.rivicq[400]] as const,
    barGradientAlt: [tokens.colors.brand.blue, tokens.colors.rivicq[500]] as const,
    tooltipShadow: '0 8px 32px rgba(15,23,42,0.12)',
  },
  severity: {
    low: tokens.colors.crypto.low,
    medium: tokens.colors.crypto.medium,
    high: tokens.colors.crypto.high,
    critical: tokens.colors.crypto.critical,
    palette: [
      tokens.colors.crypto.low,
      tokens.colors.crypto.medium,
      tokens.colors.crypto.high,
      tokens.colors.crypto.critical,
    ],
    labels: ['Low', 'Medium', 'High', 'Critical'],
  },
  motion: {
    hoverLift: 'none',
    transition: '0.15s ease',
  },
  hero: {
    light: '#ffffff',
    dark: '#082f49',
    glow: 'none',
    glowDark: 'none',
  },
  layout: {
    /** Root dashboard page — prevents horizontal overflow in flex layouts */
    page: {
      minWidth: 0,
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
    },
    /** Consistent vertical rhythm between dashboard sections */
    sectionGap: { xs: 1.25, md: 1.5 },
    /** MUI Grid spacing per breakpoint */
    gridSpacing: { xs: 1.25, md: 1.5 },
    /** Scrollable panel body max height on small viewports */
    feedMaxHeight: { xs: 280, md: 340 },
  },
} as const;

export default dashboardDesign;

import { tokens } from './tokens';

/** Designer-level dashboard design tokens */
export const dashboardDesign = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
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
    hoverLift: 'translateY(-2px)',
    transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  hero: {
    light: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(238,242,255,0.6) 50%, rgba(240,253,244,0.4) 100%)',
    dark: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.98) 100%)',
    glow: 'radial-gradient(ellipse 60% 80% at 100% 0%, rgba(59,130,246,0.12), transparent 70%)',
    glowDark: 'radial-gradient(ellipse 60% 80% at 100% 0%, rgba(59,130,246,0.18), transparent 70%)',
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

import { PRISM } from "./prism";

export const tokens = {
  colors: {
    rivicq: {
      50: PRISM.brand.violet50,
      100: PRISM.brand.violet100,
      200: PRISM.brand.violet200,
      300: PRISM.brand.violet300,
      400: PRISM.brand.violet400,
      500: PRISM.brand.violet500,
      600: PRISM.brand.violet600,
      700: PRISM.brand.violet700,
      800: "#4c1d95",
      900: "#2e1065",
    },
    crypto: {
      critical: PRISM.severity.critical,
      high: PRISM.severity.high,
      medium: PRISM.severity.medium,
      low: PRISM.severity.low,
      info: PRISM.severity.info,
      quantum: PRISM.severity.quantum,
      classic: PRISM.severity.classic,
      success: PRISM.severity.success,
    },
    navy: {
      0: PRISM.dark.canvas,
      1: PRISM.dark.surface,
      2: PRISM.dark.raised,
      3: PRISM.dark.border,
    },
    surface: {
      0: PRISM.dark.canvas,
      1: PRISM.dark.surface,
      2: PRISM.dark.raised,
      3: PRISM.dark.border,
    },
    surfaceLight: {
      0: PRISM.light.canvas,
      1: PRISM.light.surface,
      2: PRISM.light.raised,
      3: PRISM.light.border,
    },
    text: {
      primary: PRISM.dark.text,
      secondary: PRISM.dark.textSecondary,
      muted: PRISM.dark.textMuted,
    },
    textLight: {
      primary: PRISM.light.text,
      secondary: PRISM.light.textSecondary,
      muted: PRISM.light.textMuted,
    },
    border: PRISM.dark.border,
    borderLight: PRISM.light.border,
    brandGradient:
      "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.35), transparent 70%)",
  },
  spacing: PRISM.spacing,
  typography: {
    fontFamily: PRISM.typography.body,
    mono: PRISM.typography.mono,
  },
  borderRadius: PRISM.radii,
  shadows: {
    glowGreen: "0 0 40px rgba(34,197,94,0.18)",
    glowRed: "0 0 40px rgba(239,68,68,0.18)",
    glowPurple: PRISM.elevation.glow,
    glowBlue: "0 0 40px rgba(124,58,237,0.28)",
    glowGold: "0 0 40px rgba(167,139,250,0.22)",
    panel: PRISM.elevation.panel,
  },
};

export default tokens;

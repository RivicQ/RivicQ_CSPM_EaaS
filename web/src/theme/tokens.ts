/**
 * RivicQ enterprise palettes.
 * Harbor (dark) is pine ink with a brass signal. Ledger (light) is warm paper
 * with pine buttons. Crypto severity stays the only status hue.
 * CSS variables in enterprise.css mirror these values.
 */
export const tokens = {
  colors: {
    rivicq: {
      50: '#F8F1DE',
      100: '#F0E2C0',
      200: '#E4C27A',
      300: '#D7B56A',
      400: '#C6A15B',
      500: '#8C5A2B',
      600: '#1E3F36',
      700: '#16332C',
      800: '#102822',
      900: '#0C1210',
    },
    crypto: {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#38bdf8',
      info: '#38bdf8',
      quantum: '#7c3aed',
      classic: '#9ca3af',
      success: '#22c55e',
    },
    navy: { 0: '#0C1210', 1: '#101614', 2: '#1A2420', 3: '#31403A' },
    surface: { 0: '#F3EFE6', 1: '#FFFCF7', 2: '#EFE8DC', 3: '#D5CBBA' },
    surfaceLight: { 0: '#101614', 1: '#1A2420', 2: '#24302B', 3: '#31403A' },
    text: { primary: '#1C1915', secondary: '#5C564C', muted: '#7A7368' },
    textLight: { primary: '#F4F7F5', secondary: '#C3CFC9', muted: '#8FA099' },
    border: '#D5CBBA',
    borderLight: '#31403A',
    brandGradient: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(228,194,122,0.28), transparent 70%)',
  },
  spacing: (n: number) => `${n * 8}px`,
  typography: {
    fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadows: {
    glowGreen: '0 0 40px rgba(34,197,94,0.18)',
    glowRed: '0 0 40px rgba(239,68,68,0.18)',
    glowPurple: '0 0 48px rgba(124,58,237,0.35)',
    glowBlue: '0 0 40px rgba(124,58,237,0.28)',
    glowGold: '0 0 40px rgba(167,139,250,0.22)',
    panel: '0 18px 48px rgba(0,0,0,0.45)',
  },
};

export default tokens;
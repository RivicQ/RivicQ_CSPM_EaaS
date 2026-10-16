/**
 * RivicQ Security Cloud — deep-space nebula tokens (black canvas, violet accent).
 * Design rule: `crypto` severity is the ONLY place hue carries meaning.
 * Brand = violet ramp; everything else is neutral surface/ink.
 */
export const tokens = {
  colors: {
    rivicq: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#7c3aed',
      600: '#6d28d9',
      700: '#5b21b6',
      800: '#4c1d95',
      900: '#2e1065',
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
    navy: { 0: '#000000', 1: '#0a0a0f', 2: '#12121a', 3: '#1f1f2e' },
    surface: { 0: '#000000', 1: '#0a0a0f', 2: '#12121a', 3: '#1f1f2e' },
    surfaceLight: { 0: '#f4f0fb', 1: '#ffffff', 2: '#efeaf8', 3: '#e4ddee' },
    text: { primary: '#ffffff', secondary: '#d1d5db', muted: '#9ca3af' },
    textLight: { primary: '#0a0a0f', secondary: '#3f3a4d', muted: '#6b6578' },
    border: '#1f1f2e',
    borderLight: '#d9d2e8',
    brandGradient: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.35), transparent 70%)',
  },
  spacing: (n: number) => `${n * 8}px`,
  typography: {
    fontFamily: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  borderRadius: { sm: 6, md: 8, lg: 10, xl: 12, full: 9999 },
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
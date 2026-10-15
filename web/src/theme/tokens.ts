/**
 * RivicQ archive palette.
 * Nebula is the designed look: near-black canvas, violet and magenta accent.
 * Day is the same archive on pale violet paper, with the same violet buttons.
 * Crypto severity stays the only status hue.
 * CSS variables in enterprise.css mirror these values.
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
    navy: { 0: '#07060e', 1: '#05040a', 2: '#0e0c16', 3: '#2a2438' },
    surface: { 0: '#f6f3fb', 1: '#ffffff', 2: '#f3eefb', 3: '#ddd4ee' },
    surfaceLight: { 0: '#05040a', 1: '#0e0c16', 2: '#161222', 3: '#2a2438' },
    text: { primary: '#140e22', secondary: '#4a415c', muted: '#6b6278' },
    textLight: { primary: '#f6f3fb', secondary: '#c9c2d6', muted: '#8d86a0' },
    border: '#ddd4ee',
    borderLight: '#2a2438',
    brandGradient: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.38), transparent 70%)',
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
    glowGold: '0 0 40px rgba(232,121,249,0.22)',
    panel: '0 18px 48px rgba(0,0,0,0.45)',
  },
};

export default tokens;

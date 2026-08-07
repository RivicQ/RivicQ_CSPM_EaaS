export const tokens = {
  colors: {
    rivicq: { 50: '#edf5ff', 100: '#d0e2ff', 200: '#a6c8ff', 300: '#78a9ff', 400: '#4589ff', 500: '#0f62fe', 600: '#0043ce', 700: '#002d9c', 800: '#001d6e', 900: '#001141' },
    gold: { 50: '#fdf8e9', 100: '#faedc4', 200: '#f2dc8b', 300: '#e8c95a', 400: '#ddbb3f', 500: '#d4af37', 600: '#b8952c', 700: '#947420', 800: '#6e5516', 900: '#4a390e' },
    crypto: { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#3b82f6', quantum: '#a855f7', classic: '#6b7280' },
    brand: {
      blue: '#0f62fe',
      blueLight: '#78a9ff',
      blueDark: '#0043ce',
      gulf: '#001d6e',
      gulfDeep: '#0f2547',
      gold: '#d4af37',
    },
    navy: { 0: '#050a18', 1: '#081020', 2: '#0d1c40', 3: '#0f2547' },
    surface: { 0: '#050a18', 1: '#081020', 2: '#0d1c40', 3: '#0f2547' },
    surfaceLight: { 0: '#f2f6fb', 1: '#ffffff', 2: '#e8eef7', 3: '#dce6f2' },
    text: { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b' },
    textLight: { primary: '#0f1b2e', secondary: '#475569', muted: '#94a3b8' },
    border: 'rgba(148,163,184,0.18)',
    borderLight: 'rgba(15,27,46,0.14)',
    brandGradient: 'linear-gradient(135deg, #0f62fe 0%, #78a9ff 55%, #d4af37 100%)',
    brandBlue: '#0f62fe',
    brandGold: '#d4af37',
  },
  spacing: (n: number) => `${n * 4}px`,
  typography: { fontFamily: '"IBM Plex Sans", "Inter", system-ui, sans-serif', mono: '"IBM Plex Mono", "JetBrains Mono", monospace' },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadows: { glowGreen: '0 0 20px rgba(34,197,94,0.15)', glowRed: '0 0 20px rgba(239,68,68,0.15)', glowPurple: '0 0 20px rgba(168,85,247,0.12)', glowBlue: '0 0 20px rgba(15,98,254,0.2)', glowGold: '0 0 20px rgba(212,175,55,0.18)', panel: '0 4px 24px rgba(0,0,0,0.4)' },
};

export default tokens;

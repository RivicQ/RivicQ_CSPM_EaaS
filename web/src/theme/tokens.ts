export const tokens = {
  colors: {
    rivicq: { 50: '#e0f7ff', 100: '#b8edff', 200: '#7ee1ff', 300: '#45d4ff', 400: '#1cc9ff', 500: '#00c2ff', 600: '#00a8dd', 700: '#0089b3', 800: '#006b8a', 900: '#004d63' },
    gold: { 50: '#fdf8e9', 100: '#faedc4', 200: '#f2dc8b', 300: '#e8c95a', 400: '#ddbb3f', 500: '#d4af37', 600: '#b8952c', 700: '#947420', 800: '#6e5516', 900: '#4a390e' },
    crypto: { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#3b82f6', quantum: '#a855f7', classic: '#6b7280' },
    navy: { 0: '#060d1a', 1: '#0b1526', 2: '#11203a', 3: '#1a2f52' },
    surface: { 0: '#060d1a', 1: '#0b1526', 2: '#11203a', 3: '#1a2f52' },
    surfaceLight: { 0: '#f2f6fb', 1: '#ffffff', 2: '#e8eef7', 3: '#dce6f2' },
    text: { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b' },
    textLight: { primary: '#0f1b2e', secondary: '#475569', muted: '#94a3b8' },
    border: 'rgba(148,163,184,0.18)',
    borderLight: 'rgba(15,27,46,0.14)',
    brandGradient: 'linear-gradient(135deg, #06b6d4 0%, #00c2ff 45%, #d4af37 100%)',
    brandCyan: '#00c2ff',
    brandGold: '#d4af37',
  },
  spacing: (n: number) => `${n * 4}px`,
  typography: { fontFamily: '"Inter", system-ui, sans-serif', mono: '"JetBrains Mono", monospace' },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadows: { glowGreen: '0 0 20px rgba(34,197,94,0.15)', glowRed: '0 0 20px rgba(239,68,68,0.15)', glowPurple: '0 0 20px rgba(168,85,247,0.12)', glowCyan: '0 0 20px rgba(0,194,255,0.15)', glowGold: '0 0 20px rgba(212,175,55,0.18)', panel: '0 4px 24px rgba(0,0,0,0.4)' },
};

export default tokens;

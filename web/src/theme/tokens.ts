export const tokens = {
  colors: {
    rivicq: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
    gold: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
    crypto: { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#059669', info: '#4f46e5', quantum: '#7c3aed', classic: '#64748b' },
    brand: {
      blue: '#4f46e5',
      blueLight: '#818cf8',
      blueDark: '#4338ca',
      gulf: '#312e81',
      gulfDeep: '#1e1b4b',
      gold: '#f59e0b',
    },
    navy: { 0: '#f8fafc', 1: '#ffffff', 2: '#f1f5f9', 3: '#e2e8f0' },
    surface: { 0: '#f6f8fc', 1: '#ffffff', 2: '#f1f5f9', 3: '#e4e9f2' },
    surfaceLight: { 0: '#0b1220', 1: '#0f172a', 2: '#1e293b', 3: '#334155' },
    text: { primary: '#0f172a', secondary: '#475569', muted: '#94a3b8' },
    textLight: { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b' },
    border: 'rgba(100,116,139,0.2)',
    borderLight: 'rgba(148,163,184,0.18)',
    brandGradient: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 55%, #059669 100%)',
    brandBlue: '#4f46e5',
    brandGold: '#f59e0b',
  },
  spacing: (n: number) => `${n * 4}px`,
  typography: { fontFamily: '"Inter", "SF Pro Text", system-ui, -apple-system, sans-serif', mono: '"JetBrains Mono", "SF Mono", monospace' },
  borderRadius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
  shadows: { glowGreen: '0 0 20px rgba(16,185,129,0.18)', glowRed: '0 0 20px rgba(239,68,68,0.14)', glowPurple: '0 0 20px rgba(139,92,246,0.15)', glowBlue: '0 0 20px rgba(79,70,229,0.18)', glowGold: '0 0 20px rgba(245,158,11,0.18)', panel: '0 1px 2px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.06)' },
};

export default tokens;

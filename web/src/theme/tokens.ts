export const tokens = {
  colors: {
    rivicq: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
    crypto: { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#3b82f6', quantum: '#a855f7', classic: '#6b7280' },
    surface: { 0: '#0a0a0f', 1: '#111118', 2: '#1a1a24', 3: '#242434' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8', muted: '#64748b' },
    border: '#2a2a3d',
  },
  spacing: (n: number) => `${n * 4}px`,
  typography: { fontFamily: '"Inter", system-ui, sans-serif', mono: '"JetBrains Mono", monospace' },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadows: { glowGreen: '0 0 20px rgba(34,197,94,0.15)', glowRed: '0 0 20px rgba(239,68,68,0.15)', glowPurple: '0 0 20px rgba(168,85,247,0.12)', panel: '0 4px 24px rgba(0,0,0,0.4)' },
};

export default tokens;

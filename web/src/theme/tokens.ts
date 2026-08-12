export const tokens = {
  colors: {
    rivicq: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
      500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1a4480', 900: '#0c2340',
    },
    gold: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
    crypto: { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#059669', info: '#3b82f6', quantum: '#7c3aed', classic: '#64748b' },
    brand: {
      blue: '#1a4480',
      blueLight: '#3b82f6',
      blueDark: '#0c2340',
      gulf: '#0f2744',
      gulfDeep: '#0a1f38',
      gold: '#f59e0b',
    },
    navy: { 0: '#f8fafc', 1: '#ffffff', 2: '#f1f5f9', 3: '#e2e8f0' },
    surface: { 0: '#f8fafc', 1: '#ffffff', 2: '#f1f5f9', 3: '#e2e8f0' },
    surfaceLight: { 0: '#0a1f38', 1: '#0f2744', 2: '#163352', 3: '#1e3a5f' },
    text: { primary: '#0f172a', secondary: '#475569', muted: '#94a3b8' },
    textLight: { primary: '#f1f5f9', secondary: '#cbd5e1', muted: '#94a3b8' },
    border: 'rgba(100,116,139,0.2)',
    borderLight: 'rgba(148,163,184,0.18)',
    brandGradient: 'linear-gradient(135deg, #0c2340 0%, #1a4480 45%, #3b82f6 100%)',
    brandBlue: '#2563eb',
    brandGold: '#f59e0b',
  },
  spacing: (n: number) => `${n * 4}px`,
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
    mono: '"IBM Plex Mono", "SF Mono", ui-monospace, monospace',
  },
  borderRadius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
  shadows: {
    glowGreen: '0 0 20px rgba(16,185,129,0.18)',
    glowRed: '0 0 20px rgba(239,68,68,0.14)',
    glowPurple: '0 0 20px rgba(59,130,246,0.15)',
    glowBlue: '0 0 20px rgba(37,99,235,0.18)',
    glowGold: '0 0 20px rgba(245,158,11,0.18)',
    panel: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
  },
};

export default tokens;

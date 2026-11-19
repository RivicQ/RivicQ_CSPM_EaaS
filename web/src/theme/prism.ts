import type { CSSProperties } from "react";

export type PrismMode = "light" | "dark";

export const PRISM = {
  brand: {
    violet50: "#f5f3ff",
    violet100: "#ede9fe",
    violet200: "#ddd6fe",
    violet300: "#c4b5fd",
    violet400: "#a78bfa",
    violet500: "#7c3aed",
    violet600: "#6d28d9",
    violet700: "#5b21b6",
  },
  dark: {
    canvas: "#000000",
    surface: "#0a0a0f",
    raised: "#12121a",
    overlay: "#171724",
    border: "#1f1f2e",
    borderStrong: "#2d2d40",
    text: "#ffffff",
    textSecondary: "#d1d5db",
    textMuted: "#9ca3af",
  },
  light: {
    canvas: "#f7f7fb",
    surface: "#ffffff",
    raised: "#f1f1f7",
    overlay: "#e9e9f2",
    border: "#d1d5db",
    borderStrong: "#9ca3af",
    text: "#0a0a0f",
    textSecondary: "#374151",
    textMuted: "#6b7280",
  },
  severity: {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#38bdf8",
    info: "#38bdf8",
    success: "#22c55e",
    quantum: "#7c3aed",
    classic: "#9ca3af",
  },
  pqc: {
    safe: "#22c55e",
    atRisk: "#f97316",
    obsolete: "#ef4444",
    unknown: "#9ca3af",
  },
  compliance: {
    pass: "#22c55e",
    warn: "#eab308",
    fail: "#ef4444",
    pending: "#38bdf8",
    notApplicable: "#9ca3af",
  },
  typography: {
    body: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    display: '"Space Grotesk", Inter, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  spacing: (n: number) => `${n * 8}px`,
  radii: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    full: 9999,
  },
  border: {
    hairline: "1px",
    strong: "2px",
  },
  blur: {
    glass: "20px",
    panel: "28px",
  },
  elevation: {
    panel: "0 18px 48px rgba(0,0,0,0.32)",
    raised: "0 8px 24px rgba(0,0,0,0.22)",
    glow: "0 0 48px rgba(124,58,237,0.28)",
  },
  motion: {
    fast: "120ms ease",
    base: "180ms ease",
    slow: "280ms ease",
  },
  grid: {
    columns: 12,
    maxWidth: "1440px",
    gutter: "24px",
  },
} as const;

export const prismPalette = (mode: PrismMode) =>
  mode === "light" ? PRISM.light : PRISM.dark;

export const prismCssVariables = (mode: PrismMode) => {
  const p = prismPalette(mode);
  return {
    "--rvq-canvas": p.canvas,
    "--rvq-surface": p.surface,
    "--rvq-surface-raised": p.raised,
    "--rvq-surface-overlay": p.overlay,
    "--rvq-border": p.border,
    "--rvq-border-strong": p.borderStrong,
    "--rvq-text": p.text,
    "--rvq-text-secondary": p.textSecondary,
    "--rvq-text-muted": p.textMuted,
    "--rvq-accent": PRISM.brand.violet500,
    "--rvq-accent-soft": PRISM.brand.violet400,
  } as CSSProperties;
};

export default PRISM;

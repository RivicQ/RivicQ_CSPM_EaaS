/** Shared nebula / Archify surface tokens for public and console React pages. */
export const NEBULA = {
  ink: '#000000',
  panel: '#0a0a0f',
  raised: '#12121a',
  line: '#1f1f2e',
  lineHi: 'rgba(255,255,255,0.14)',
  accent: '#7c3aed',
  accentSoft: '#a78bfa',
  text: '#ffffff',
  muted: '#d1d5db',
  faint: '#9ca3af',
} as const;

export const ARCHIFY_FONTS = {
  title: '"Space Grotesk", Inter, system-ui, sans-serif',
  display: 'Fraunces, Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  body: 'Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
} as const;

export const nebulaPanelSx = {
  bgcolor: NEBULA.panel,
  border: '1px solid',
  borderColor: 'rgba(255,255,255,0.12)',
  borderRadius: 2,
  color: NEBULA.text,
} as const;

export const nebulaPageSx = {
  minHeight: '100vh',
  bgcolor: NEBULA.ink,
  color: NEBULA.text,
} as const;

/** Auth / form cards — higher contrast plate on nebula canvas. */
export const nebulaCardSx = {
  ...nebulaPanelSx,
  borderColor: NEBULA.lineHi,
  boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
} as const;

export const archifyEyebrowSx = {
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: NEBULA.faint,
};

export const archifyTitleSx = {
  fontFamily: ARCHIFY_FONTS.title,
  fontWeight: 500,
  letterSpacing: '-0.04em',
  lineHeight: 1.05,
  color: NEBULA.text,
};

/** Soft Archify aura layers for public/auth heroes. */
export const archifyAuraLayersSx = {
  radial: {
    position: 'absolute' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    background: `
      radial-gradient(ellipse 50% 45% at 50% 0%, rgba(56,189,248,0.06), transparent 70%),
      radial-gradient(ellipse 55% 48% at 50% 18%, rgba(124,58,237,0.28), transparent 68%)
    `,
  },
  grid: {
    position: 'absolute' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    opacity: 0.85,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
    `,
    backgroundSize: '64px 64px',
    backgroundPosition: 'center top',
    maskImage: 'radial-gradient(ellipse 60% 75% at 50% 30%, #000 10%, transparent 75%)',
    WebkitMaskImage: 'radial-gradient(ellipse 60% 75% at 50% 30%, #000 10%, transparent 75%)',
  },
};

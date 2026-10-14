/** Shared nebula surface tokens for public and console React pages. */
export const NEBULA = {
  ink: '#000000',
  panel: '#0a0a0f',
  raised: '#12121a',
  line: '#1f1f2e',
  accent: '#7c3aed',
  text: '#ffffff',
  muted: '#d1d5db',
} as const;

export const nebulaPanelSx = {
  bgcolor: NEBULA.panel,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  color: 'text.primary',
} as const;

export const nebulaPageSx = {
  minHeight: '100vh',
  bgcolor: NEBULA.ink,
  color: 'text.primary',
} as const;

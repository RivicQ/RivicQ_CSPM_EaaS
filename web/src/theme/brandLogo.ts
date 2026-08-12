import { designSystem } from './designSystem';
import { tokens } from './tokens';

export type LogoVariant = 'light' | 'dark';

export const LOGO_SIZES = {
  default: { mark: 40, gap: 12, wordmark: '1.125rem' as const },
  compact: { mark: 32, gap: 10, wordmark: '1rem' as const },
  icon: { mark: 24, gap: 0, wordmark: '0.875rem' as const },
} as const;

export type LogoSizeKey = keyof typeof LOGO_SIZES;

export const LOGO_COLORS = {
  light: {
    orbitPrimary: tokens.colors.rivicq[600],
    orbitSecondary: '#334155',
    core: tokens.colors.rivicq[700],
    coreFill: `${tokens.colors.rivicq[600]}18`,
    wordmark: tokens.colors.rivicq[600],
    subtitle: tokens.colors.text.secondary,
  },
  dark: {
    orbitPrimary: designSystem.proBlue.accentLight,
    orbitSecondary: 'rgba(248,250,252,0.55)',
    core: designSystem.proBlue.textPrimary,
    coreFill: 'rgba(96,165,250,0.15)',
    wordmark: designSystem.proBlue.textPrimary,
    subtitle: designSystem.proBlue.textMuted,
  },
} as const;

export const getLogoColors = (variant: LogoVariant) => LOGO_COLORS[variant];

export default LOGO_COLORS;

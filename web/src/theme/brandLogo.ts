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
    wordmark: tokens.colors.rivicq[600],
    subtitle: tokens.colors.text.secondary,
  },
  dark: {
    wordmark: designSystem.proBlue.textPrimary,
    subtitle: designSystem.proBlue.textMuted,
  },
} as const;

export const getLogoColors = (variant: LogoVariant) => LOGO_COLORS[variant];

export default LOGO_COLORS;

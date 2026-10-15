import { designSystem } from './designSystem';

export type LogoVariant = 'light' | 'dark';

export const LOGO_SIZES = {
  default: { mark: 40, gap: 12, wordmark: '1.125rem' as const },
  compact: { mark: 32, gap: 10, wordmark: '1rem' as const },
  icon: { mark: 24, gap: 0, wordmark: '0.875rem' as const },
} as const;

export type LogoSizeKey = keyof typeof LOGO_SIZES;

/** Nebula-only identity — both variants stay on the dark wordmark. */
export const LOGO_COLORS = {
  light: {
    wordmark: designSystem.proBlue.textPrimary,
    subtitle: designSystem.proBlue.textMuted,
  },
  dark: {
    wordmark: designSystem.proBlue.textPrimary,
    subtitle: designSystem.proBlue.textMuted,
  },
} as const;

export const getLogoColors = (variant: LogoVariant) => LOGO_COLORS[variant];

export default LOGO_COLORS;

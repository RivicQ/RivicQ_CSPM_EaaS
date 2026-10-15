import { Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import appTypography from './typography';

/** Creative professional design system — shared across the entire product */
export const designSystem = {
  radius: {
    sm: tokens.borderRadius.sm,
    md: 16,
    lg: 20,
    xl: 28,
    pill: tokens.borderRadius.full,
  },
  font: {
    display: appTypography.fontFamily,
    mono: appTypography.fontFamilyMono,
    metric: appTypography.metric.fontFamily,
  },
  gradient: {
    brand: 'linear-gradient(180deg, #E4C27A 0%, #C6A15B 100%)',
    brandPlayful: 'linear-gradient(135deg, #F0D59A 0%, #E4C27A 45%, #1E3F36 100%)',
    brandSoft: 'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(228,194,122,0.32), transparent 68%)',
    heroLight: 'var(--rq-bg, #F3EFE6)',
    heroDark: 'var(--rq-bg, #101614)',
    sidebar: 'var(--rq-sidebar, #0C1210)',
    sidebarDark: 'var(--rq-sidebar, #0C1210)',
    meshLight: 'var(--rq-bg, #F3EFE6)',
    meshDark: 'var(--rq-bg, #101614)',
  },
  horizon: {
    wash: 'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(228,194,122,0.28), transparent 70%)',
    band: 'var(--rq-accent, #D7B56A)',
  },
  shadow: {
    sm: '0 1px 2px rgba(2,6,23,0.06), 0 1px 3px rgba(2,6,23,0.05)',
    md: '0 2px 4px rgba(2,6,23,0.06), 0 10px 28px -12px rgba(2,6,23,0.18)',
    lg: '0 0 0 1px rgba(2,6,23,0.04), 0 12px 40px -14px rgba(2,6,23,0.30)',
    glow: (_color: string) => `0 0 44px rgba(124,58,237,0.28)`,
  },
  motion: {
    spring: '0.15s ease',
    smooth: '0.15s ease',
  },
  /** Console chrome. Values are CSS variables so the Harbor/Ledger toggle restyles the shell. */
  proBlue: {
    navy: 'var(--rq-bg)',
    navyMid: 'var(--rq-surface)',
    navyLight: 'var(--rq-raised)',
    royal: 'var(--rq-accent)',
    accent: 'var(--rq-accent)',
    accentLight: 'var(--rq-accent-2)',
    accentMuted: 'var(--rq-muted)',
    sidebar: 'var(--rq-sidebar)',
    commandCenter: 'var(--rq-surface)',
    commandGlow: 'none',
    border: 'var(--rq-line)',
    textPrimary: 'var(--rq-text)',
    textSecondary: 'var(--rq-muted)',
    textMuted: 'var(--rq-faint)',
    navActive: 'var(--rq-nav-active)',
    navHover: 'var(--rq-nav-hover)',
    shadow: 'var(--rq-shadow)',
  },
} as const;

export const meshBackground = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
  backgroundColor: theme.palette.background.default,
});

export const glassSurface = (_theme: Theme, elevated = false) => ({
  background: elevated ? 'var(--rq-surface)' : 'var(--rq-bg)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: '1px solid var(--rq-line)',
  color: 'var(--rq-text)',
});

export const gradientTextSx = {
  color: tokens.colors.rivicq[700],
};

export const displayTitleSx = {
  ...appTypography.display,
};

export const metricValueSx = {
  ...appTypography.metric,
};

export const eyebrowSx = {
  ...appTypography.eyebrow,
  color: 'primary.main',
};

export const panelTitleSx = {
  ...appTypography.heading,
  fontSize: '0.9375rem',
};

export const sidebarPaperSx = {
  background: 'var(--rq-sidebar)',
  borderRight: '1px solid var(--rq-line)',
  color: 'var(--rq-text)',
  overflow: 'hidden',
  height: '100vh',
};

/** Themed scrollbar for navy sidebar panels */
export const sidebarScrollSx = {
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--rq-line) transparent',
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'var(--rq-line)',
    borderRadius: 99,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'var(--rq-accent)',
  },
};

export const sidebarSectionLabelSx = {
  px: 2.5,
  py: 0.35,
  display: 'block',
  color: designSystem.proBlue.textMuted,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  fontSize: '0.625rem',
  lineHeight: 1.2,
};

export const sidebarNavItemButtonSx = (active: boolean, disabled: boolean) => ({
  borderRadius: 1.5,
  py: 0.5,
  minHeight: 32,
  pl: active ? 1.5 : 2,
  borderLeft: active ? '3px solid' : '3px solid transparent',
  borderLeftColor: active ? designSystem.proBlue.accentLight : 'transparent',
  color: disabled
    ? designSystem.proBlue.textMuted
    : active
      ? designSystem.proBlue.textPrimary
      : designSystem.proBlue.textSecondary,
  bgcolor: active ? designSystem.proBlue.navActive : 'transparent',
  opacity: disabled ? 0.45 : 1,
  '&.Mui-selected': {
    bgcolor: designSystem.proBlue.navActive,
    color: designSystem.proBlue.textPrimary,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
  },
  '&:hover:not(.Mui-selected)': { bgcolor: designSystem.proBlue.navHover },
});

export const commandCenterCardSx = {
  position: 'relative' as const,
  overflow: 'hidden' as const,
  background: 'var(--rq-surface)',
  backgroundImage: 'none',
  border: '1px solid var(--rq-line)',
  boxShadow: 'none',
  color: 'var(--rq-text)',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: designSystem.horizon.band,
    pointerEvents: 'none',
  },
};

export const commandCenterEyebrowSx = {
  ...appTypography.eyebrow,
  color: designSystem.proBlue.accentMuted,
};

export const commandCenterTitleSx = {
  ...appTypography.display,
  color: designSystem.proBlue.textPrimary,
};

/** Primary CTA. Brass on Harbor, pine on Ledger. Label color is never the background. */
export const heroPrimaryCtaSx = {
  px: 3,
  py: 1.15,
  minHeight: 42,
  borderRadius: `${designSystem.radius.pill}px`,
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '-0.01em',
  textTransform: 'none',
  color: 'var(--rq-btn-fg) !important',
  WebkitTextFillColor: 'var(--rq-btn-fg)',
  border: 'none',
  boxShadow: 'none',
  backgroundImage: 'none !important',
  backgroundColor: 'var(--rq-btn-bg) !important',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': {
    color: 'inherit',
    WebkitTextFillColor: 'inherit',
  },
  '&:hover': {
    backgroundColor: 'var(--rq-btn-bg-hover) !important',
    backgroundImage: 'none !important',
    color: 'var(--rq-btn-fg) !important',
    WebkitTextFillColor: 'var(--rq-btn-fg)',
    boxShadow: 'none',
    transform: 'none',
  },
};

/** Secondary CTA on navy hero — glass pill with clean border */
export const heroSecondaryCtaSx = {
  px: 3,
  py: 1.15,
  minHeight: 42,
  borderRadius: `${designSystem.radius.pill}px`,
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '-0.01em',
  textTransform: 'none',
  color: `${designSystem.proBlue.textPrimary} !important`,
  backgroundImage: 'none !important',
  backgroundColor: 'rgba(255,255,255,0.08) !important',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': { color: 'inherit' },
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.14) !important',
    backgroundImage: 'none !important',
    borderColor: 'rgba(255,255,255,0.5)',
  },
};

/** Primary CTA — Harbor brass or Ledger pine, with a contrasting label. */
export const proBlueContainedButtonSx = {
  backgroundColor: 'var(--rq-btn-bg) !important',
  backgroundImage: 'none',
  color: 'var(--rq-btn-fg) !important',
  WebkitTextFillColor: 'var(--rq-btn-fg)',
  border: '1px solid transparent',
  boxShadow: 'none',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': {
    color: 'inherit',
    WebkitTextFillColor: 'inherit',
  },
  '&:hover': {
    backgroundColor: 'var(--rq-btn-bg-hover) !important',
    backgroundImage: 'none',
    color: 'var(--rq-btn-fg) !important',
    WebkitTextFillColor: 'var(--rq-btn-fg)',
    boxShadow: 'none',
    transform: 'none',
  },
  '&.Mui-disabled': {
    backgroundColor: 'var(--rq-raised) !important',
    backgroundImage: 'none !important',
    color: 'var(--rq-faint) !important',
    WebkitTextFillColor: 'var(--rq-faint)',
    borderColor: 'transparent',
    boxShadow: 'none',
  },
};

/** Button/icon overrides for actions placed on pro-blue surfaces */
export const proBlueActionStackSx = {
  '& .MuiButton-contained, & .MuiButton-containedPrimary': {
    bgcolor: 'var(--rq-btn-bg)',
    color: 'var(--rq-btn-fg)',
    WebkitTextFillColor: 'var(--rq-btn-fg)',
    fontWeight: 600,
    boxShadow: 'none',
    borderRadius: 999,
    '&:hover': { bgcolor: 'var(--rq-btn-bg-hover)', boxShadow: 'none' },
  },
  '& .MuiButton-outlined': {
    color: designSystem.proBlue.textPrimary,
    borderColor: 'rgba(255,255,255,0.45)',
    fontWeight: 600,
    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
  },
  '& .MuiButton-text': {
    color: designSystem.proBlue.textSecondary,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
  },
  '& .MuiIconButton-root': { color: designSystem.proBlue.textSecondary },
};

export const proBlueBadgeSx = {
  px: 1.25,
  py: 0.35,
  borderRadius: `${designSystem.radius.md}px`,
  bgcolor: 'rgba(255,255,255,0.1)',
  color: designSystem.proBlue.textPrimary,
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  border: `1px solid ${designSystem.proBlue.border}`,
};

/** Top app bar — aligns with pro-blue sidebar & command center */
export const appBarPaperSx = (_mode: 'light' | 'dark') => ({
  bgcolor: 'var(--rq-bg)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: 'var(--rq-text)',
  borderBottom: '1px solid var(--rq-line)',
  boxShadow: 'none',
  backgroundImage: 'none',
});

export const appBarSearchSx = (_mode: 'light' | 'dark') => ({
  display: { xs: 'none', lg: 'flex' },
  alignItems: 'center',
  flexWrap: 'nowrap',
  borderRadius: `${designSystem.radius.md}px`,
  px: 1.5,
  py: 0,
  height: 36,
  maxHeight: 36,
  overflow: 'hidden',
  flexShrink: 0,
  minWidth: 220,
  width: { lg: 240, xl: 280 },
  whiteSpace: 'nowrap',
  bgcolor: 'var(--rq-surface)',
  border: '1px solid var(--rq-line)',
  transition: designSystem.motion.smooth,
  '&:focus-within': {
    bgcolor: 'var(--rq-surface)',
    borderColor: 'var(--rq-accent)',
    boxShadow: 'none',
  },
});

export const appBarIconButtonSx = (_mode: 'light' | 'dark') => ({
  borderRadius: `${designSystem.radius.sm}px`,
  border: '1px solid var(--rq-line)',
  bgcolor: 'var(--rq-surface)',
  color: 'var(--rq-text)',
  width: 36,
  height: 36,
  '&:hover': {
    bgcolor: 'var(--rq-nav-hover)',
    borderColor: 'var(--rq-accent)',
  },
});

export const appBarEditionChipSx = (_mode: 'light' | 'dark', isEnterprise: boolean) => ({
  fontWeight: 600,
  fontSize: '0.6875rem',
  letterSpacing: '0.02em',
  height: 26,
  display: { xs: 'none', sm: 'inline-flex' },
  bgcolor: isEnterprise ? 'var(--rq-nav-active)' : 'var(--rq-surface)',
  color: 'var(--rq-text)',
  border: '1px solid var(--rq-line)',
});

export const appBarPageTitleSx = (_mode: 'light' | 'dark') => ({
  fontFamily: designSystem.font.display,
  fontWeight: 600,
  fontSize: '0.9375rem',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  color: 'var(--rq-text)',
});

export const appBarPageEyebrowSx = (_mode: 'light' | 'dark') => ({
  ...appTypography.eyebrow,
  fontSize: '0.625rem',
  color: 'var(--rq-accent)',
  lineHeight: 1,
  mb: 0.25,
});

export default designSystem;

import { Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import appTypography from './typography';

/** Creative professional design system — shared across the entire product */
export const designSystem = {
  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 9999 },
  font: {
    display: appTypography.fontFamily,
    mono: appTypography.fontFamilyMono,
    metric: appTypography.metric.fontFamily,
  },
  gradient: {
    brand: 'none',
    brandSoft: 'none',
    heroLight: '#f7f3eb',
    heroDark: '#0c0b09',
    sidebar: '#0c0b09',
    sidebarDark: '#0c0b09',
    meshLight: '#f7f3eb',
    meshDark: '#0c0b09',
  },
  horizon: {
    wash: 'none',
    band: '#c4783a',
  },
  shadow: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    glow: (_color: string) => 'none',
  },
  motion: {
    spring: '0.15s ease',
    smooth: '0.15s ease',
  },
  /** Warm-ink ledger surface — enterprise density, copper accent, semantic status only */
  proBlue: {
    navy: '#0c0b09',
    navyMid: '#17150f',
    navyLight: '#1f1c15',
    royal: '#c4783a',
    accent: '#c4783a',
    accentLight: '#e09a5a',
    accentMuted: '#b8b0a2',
    sidebar: '#0c0b09',
    commandCenter: '#17150f',
    commandGlow: 'none',
    border: '#2c281f',
    textPrimary: '#f3eee4',
    textSecondary: '#b8b0a2',
    textMuted: '#8a8376',
    navActive: 'rgba(196,120,58,0.16)',
    navHover: 'rgba(243,238,228,0.04)',
    shadow: 'none',
  },
} as const;

export const meshBackground = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
  backgroundColor: theme.palette.background.default,
});

export const glassSurface = (theme: Theme, elevated = false) => ({
  background: theme.palette.mode === 'dark'
    ? elevated ? theme.palette.background.paper : '#17150f'
    : elevated ? '#fffdf8' : '#f7f3eb',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: `1px solid ${theme.palette.divider}`,
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
  background: designSystem.gradient.sidebar,
  borderRight: `1px solid ${designSystem.proBlue.border}`,
  color: designSystem.proBlue.textPrimary,
  overflow: 'hidden',
  height: '100vh',
};

/** Themed scrollbar for navy sidebar panels */
export const sidebarScrollSx = {
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'thin',
  scrollbarColor: '#2c281f transparent',
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: '#2c281f',
    borderRadius: 99,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#3a3428',
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
  background: designSystem.proBlue.commandCenter,
  border: `1px solid ${designSystem.proBlue.border}`,
  boxShadow: designSystem.shadow.md,
  color: designSystem.proBlue.textPrimary,
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

/** Primary CTA on navy hero — solid white pill (overrides global containedPrimary) */
export const heroPrimaryCtaSx = {
  px: 3,
  py: 1.15,
  minHeight: 42,
  borderRadius: `${designSystem.radius.md}px`,
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '-0.01em',
  textTransform: 'none',
  color: `#0c0b09 !important`,
  border: 'none',
  boxShadow: 'none',
  backgroundImage: 'none !important',
  backgroundColor: '#c4783a !important',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': { color: 'inherit' },
  '&:hover': {
    backgroundColor: '#a8622e !important',
    backgroundImage: 'none !important',
    boxShadow: 'none',
    transform: 'none',
  },
};

/** Secondary CTA on navy hero — glass pill with clean border */
export const heroSecondaryCtaSx = {
  px: 3,
  py: 1.15,
  minHeight: 42,
  borderRadius: `${designSystem.radius.md}px`,
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

/** Primary CTA — matches command-center / auth hero navy gradient */
export const proBlueContainedButtonSx = {
  backgroundColor: tokens.colors.rivicq[500],
  backgroundImage: 'none',
  color: '#ffffff !important',
  border: '1px solid transparent',
  boxShadow: 'none',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': {
    color: 'inherit',
  },
  '&:hover': {
    backgroundColor: tokens.colors.rivicq[700],
    backgroundImage: 'none',
    color: '#ffffff !important',
    boxShadow: 'none',
    transform: 'none',
  },
  '&.Mui-disabled': {
    backgroundColor: `${tokens.colors.rivicq[800]} !important`,
    backgroundImage: 'none !important',
    color: '#8a8376 !important',
    borderColor: 'transparent',
    boxShadow: 'none',
  },
};

/** Button/icon overrides for actions placed on pro-blue surfaces */
export const proBlueActionStackSx = {
  '& .MuiButton-contained, & .MuiButton-containedPrimary': {
    bgcolor: '#fff',
    color: designSystem.proBlue.navyMid,
    fontWeight: 600,
    boxShadow: 'none',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', boxShadow: 'none' },
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
export const appBarPaperSx = (mode: 'light' | 'dark') => ({
  bgcolor: mode === 'dark' ? '#0c0b09' : '#fffdf8',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: mode === 'dark' ? designSystem.proBlue.textPrimary : '#1a1712',
  borderBottom: `1px solid ${mode === 'dark' ? '#2c281f' : '#e4dccb'}`,
  boxShadow: 'none',
  backgroundImage: 'none',
});

export const appBarSearchSx = (mode: 'light' | 'dark') => ({
  display: { xs: 'none', md: 'flex' },
  alignItems: 'center',
  borderRadius: `${designSystem.radius.md}px`,
  px: 1.5,
  py: 0.625,
  width: { md: 240, lg: 320 },
  bgcolor: mode === 'dark' ? '#17150f' : '#efe8da',
  border: `1px solid ${mode === 'dark' ? '#2c281f' : '#e4dccb'}`,
  transition: designSystem.motion.smooth,
  '&:focus-within': {
    bgcolor: mode === 'dark' ? '#17150f' : '#fffdf8',
    borderColor: '#c4783a',
    boxShadow: 'none',
  },
});

export const appBarIconButtonSx = (mode: 'light' | 'dark') => ({
  borderRadius: `${designSystem.radius.sm}px`,
  border: `1px solid ${mode === 'dark' ? '#2c281f' : '#e4dccb'}`,
  bgcolor: mode === 'dark' ? '#17150f' : '#fffdf8',
  color: mode === 'dark' ? designSystem.proBlue.textSecondary : '#1a1712',
  width: 36,
  height: 36,
  '&:hover': {
    bgcolor: mode === 'dark' ? 'rgba(243,238,228,0.08)' : 'rgba(196,120,58,0.08)',
    borderColor: mode === 'dark' ? designSystem.proBlue.accentMuted : designSystem.proBlue.accent,
  },
});

export const appBarEditionChipSx = (mode: 'light' | 'dark', isEnterprise: boolean) => ({
  fontWeight: 600,
  fontSize: '0.6875rem',
  letterSpacing: '0.02em',
  height: 26,
  display: { xs: 'none', sm: 'inline-flex' },
  bgcolor: isEnterprise
    ? mode === 'dark'
      ? 'rgba(196,120,58,0.2)'
      : 'rgba(168,98,46,0.1)'
    : mode === 'dark'
      ? '#17150f'
      : '#efe8da',
  color: isEnterprise
    ? mode === 'dark'
      ? '#f3eee4'
      : '#864c24'
    : mode === 'dark'
      ? designSystem.proBlue.accentMuted
      : '#5c564c',
  border: `1px solid ${mode === 'dark' ? '#2c281f' : '#e4dccb'}`,
});

export const appBarPageTitleSx = (mode: 'light' | 'dark') => ({
  fontFamily: designSystem.font.display,
  fontWeight: 600,
  fontSize: '0.9375rem',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  color: mode === 'dark' ? designSystem.proBlue.textPrimary : designSystem.proBlue.navyMid,
});

export const appBarPageEyebrowSx = (mode: 'light' | 'dark') => ({
  ...appTypography.eyebrow,
  fontSize: '0.625rem',
  color: mode === 'dark' ? designSystem.proBlue.accentMuted : designSystem.proBlue.accent,
  lineHeight: 1,
  mb: 0.25,
});

export default designSystem;

import { Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import appTypography from './typography';

/** Creative professional design system — shared across the entire product */
export const designSystem = {
  radius: { sm: 4, md: 6, lg: 8, xl: 10, pill: 9999 },
  font: {
    display: appTypography.fontFamily,
    mono: appTypography.fontFamilyMono,
    metric: appTypography.metric.fontFamily,
  },
  gradient: {
    brand: tokens.colors.brandGradient,
    brandSoft: 'linear-gradient(180deg, rgba(90,82,104,0.04) 0%, transparent 100%)',
    heroLight: 'none',
    heroDark: 'none',
    sidebar: 'none',
    sidebarDark: 'none',
    meshLight: 'none',
    meshDark: 'none',
  },
  shadow: {
    sm: '0 1px 2px rgba(28,27,31,0.04)',
    md: '0 1px 3px rgba(28,27,31,0.06)',
    lg: '0 4px 12px rgba(28,27,31,0.08)',
    glow: (_color: string) => 'none',
  },
  motion: {
    spring: '0.2s ease',
    smooth: '0.2s ease',
  },
  /** Quiet command surface — charcoal with a hint of dusty violet */
  proBlue: {
    navy: '#1c1b1f',
    navyMid: '#252429',
    navyLight: '#2a2630',
    royal: '#4a4456',
    accent: '#5a5268',
    accentLight: '#8d859a',
    accentMuted: '#b9b3c4',
    sidebar: '#1c1b1f',
    commandCenter: '#1c1b1f',
    commandGlow: 'none',
    border: 'rgba(200,197,206,0.12)',
    textPrimary: '#f4f3f5',
    textSecondary: 'rgba(244,243,245,0.78)',
    textMuted: 'rgba(154,150,163,0.9)',
    navActive: 'rgba(107,98,120,0.28)',
    navHover: 'rgba(255,255,255,0.04)',
    shadow: 'none',
  },
} as const;

export const meshBackground = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
  backgroundColor: theme.palette.background.default,
});

export const glassSurface = (theme: Theme, elevated = false) => ({
  background: theme.palette.mode === 'dark'
    ? elevated ? theme.palette.background.paper : 'rgba(37,36,41,0.92)'
    : elevated ? '#ffffff' : 'rgba(255,255,255,0.96)',
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
  background: designSystem.proBlue.sidebar,
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
  scrollbarColor: 'rgba(90,82,104,0.35) transparent',
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(90,82,104,0.28)',
    borderRadius: 99,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(90,82,104,0.42)',
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
  boxShadow: designSystem.proBlue.shadow,
  color: designSystem.proBlue.textPrimary,
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
  color: `${designSystem.proBlue.navyMid} !important`,
  border: 'none',
  boxShadow: 'none',
  backgroundImage: 'none !important',
  backgroundColor: '#ffffff !important',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': { color: 'inherit' },
  '&:hover': {
    backgroundColor: '#f4f3f5 !important',
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
  backgroundColor: designSystem.proBlue.navyMid,
  backgroundImage: 'none',
  color: `${designSystem.proBlue.textPrimary} !important`,
  border: `1px solid ${designSystem.proBlue.border}`,
  boxShadow: 'none',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': {
    color: 'inherit',
  },
  '&:hover': {
    backgroundColor: designSystem.proBlue.navyLight,
    backgroundImage: 'none',
    color: `${designSystem.proBlue.textPrimary} !important`,
    boxShadow: 'none',
    transform: 'none',
  },
  '&.Mui-disabled': {
    backgroundColor: `${designSystem.proBlue.navyMid} !important`,
    backgroundImage: 'none !important',
    color: 'rgba(248,250,252,0.72) !important',
    borderColor: designSystem.proBlue.border,
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
  bgcolor: mode === 'dark' ? '#1c1b1f' : '#ffffff',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: mode === 'dark' ? designSystem.proBlue.textPrimary : designSystem.proBlue.navyMid,
  borderBottom: `1px solid ${mode === 'dark' ? designSystem.proBlue.border : 'rgba(90,82,104,0.16)'}`,
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
  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(28,27,31,0.04)',
  border: `1px solid ${mode === 'dark' ? designSystem.proBlue.border : 'rgba(90,82,104,0.16)'}`,
  transition: designSystem.motion.smooth,
  '&:focus-within': {
    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff',
    borderColor: designSystem.proBlue.accent,
    boxShadow: 'none',
  },
});

export const appBarIconButtonSx = (mode: 'light' | 'dark') => ({
  borderRadius: `${designSystem.radius.sm}px`,
  border: `1px solid ${mode === 'dark' ? designSystem.proBlue.border : 'rgba(90,82,104,0.16)'}`,
  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff',
  color: mode === 'dark' ? designSystem.proBlue.textSecondary : designSystem.proBlue.navyMid,
  width: 36,
  height: 36,
  '&:hover': {
    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(90,82,104,0.08)',
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
      ? 'rgba(90,82,104,0.28)'
      : 'rgba(90,82,104,0.08)'
    : mode === 'dark'
      ? 'rgba(90,82,104,0.18)'
      : 'rgba(90,82,104,0.06)',
  color: isEnterprise
    ? mode === 'dark'
      ? '#d8d4de'
      : '#5a5268'
    : mode === 'dark'
      ? designSystem.proBlue.accentMuted
      : designSystem.proBlue.royal,
  border: `1px solid ${
    isEnterprise
      ? mode === 'dark'
        ? 'rgba(185,179,196,0.28)'
        : 'rgba(90,82,104,0.22)'
      : mode === 'dark'
        ? designSystem.proBlue.border
        : 'rgba(90,82,104,0.16)'
  }`,
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

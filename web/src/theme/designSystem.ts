import { Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import appTypography from './typography';

/** Creative professional design system — shared across the entire product */
export const designSystem = {
  radius: {
    sm: tokens.borderRadius.sm,
    md: tokens.borderRadius.md,
    lg: tokens.borderRadius.lg,
    xl: tokens.borderRadius.xl,
    pill: tokens.borderRadius.full,
  },
  font: {
    display: appTypography.fontFamily,
    mono: appTypography.fontFamilyMono,
    metric: appTypography.metric.fontFamily,
  },
  gradient: {
    brand: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)',
    brandPlayful: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 45%, #6d28d9 100%)',
    brandSoft: 'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(124,58,237,0.42), transparent 68%)',
    heroLight: '#000000',
    heroDark: '#000000',
    sidebar: '#000000',
    sidebarDark: '#000000',
    meshLight: '#000000',
    meshDark: '#000000',
  },
  horizon: {
    wash: 'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(124,58,237,0.38), transparent 70%)',
    band: '#7c3aed',
  },
  shadow: {
    sm: '0 1px 2px rgba(2,6,23,0.06), 0 1px 3px rgba(2,6,23,0.05)',
    md: '0 2px 4px rgba(2,6,23,0.06), 0 10px 28px -12px rgba(2,6,23,0.18)',
    lg: '0 0 0 1px rgba(2,6,23,0.04), 0 12px 40px -14px rgba(2,6,23,0.30)',
    glow: (_color: string) => 'none',
  },
  motion: {
    spring: '0.15s ease',
    smooth: '0.15s ease',
  },
  /** Deep-space console — black canvas, violet accent, semantic status only */
  proBlue: {
    navy: '#000000',
    navyMid: '#0a0a0f',
    navyLight: '#12121a',
    royal: '#7c3aed',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    accentMuted: '#d1d5db',
    sidebar: '#000000',
    commandCenter: '#0a0a0f',
    commandGlow: 'none',
    border: '#1f1f2e',
    textPrimary: '#ffffff',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    navActive: 'rgba(124,58,237,0.22)',
    navHover: 'rgba(255,255,255,0.05)',
    shadow: '0 18px 48px rgba(0,0,0,0.45)',
  },
} as const;

export const meshBackground = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
  backgroundColor: theme.palette.background.default,
});

export const glassSurface = (theme: Theme, elevated = false) => ({
  background: elevated ? theme.palette.background.paper : theme.palette.background.default,
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
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
  scrollbarColor: '#1f1f2e transparent',
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: '#1f1f2e',
    borderRadius: 99,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#2e1065',
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
  background: '#0a0a0f',
  backgroundImage: 'none',
  border: `1px solid ${designSystem.proBlue.border}`,
  boxShadow: 'none',
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
  borderRadius: `${designSystem.radius.pill}px`,
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '-0.01em',
  textTransform: 'none',
  color: `#ffffff !important`,
  border: 'none',
  boxShadow: 'none',
  backgroundImage: 'none !important',
  backgroundColor: '#7c3aed !important',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': { color: 'inherit' },
  '&:hover': {
    backgroundColor: '#6d28d9 !important',
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
    color: '#9ca3af !important',
    borderColor: 'transparent',
    boxShadow: 'none',
  },
};

/** Button/icon overrides for actions placed on pro-blue surfaces */
export const proBlueActionStackSx = {
  '& .MuiButton-contained, & .MuiButton-containedPrimary': {
    bgcolor: '#7c3aed',
    color: '#ffffff',
    fontWeight: 600,
    boxShadow: 'none',
    borderRadius: 999,
    '&:hover': { bgcolor: '#6d28d9', boxShadow: 'none' },
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
export const appBarPaperSx = (mode: 'light' | 'dark') => {
  const dark = mode === 'dark';
  return {
    bgcolor: dark ? '#000000' : '#ffffff',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    color: dark ? designSystem.proBlue.textPrimary : '#0a0a0f',
    borderBottom: `1px solid ${dark ? '#1f1f2e' : '#d9d2e8'}`,
    boxShadow: 'none',
    backgroundImage: 'none',
  };
};

export const appBarSearchSx = (mode: 'light' | 'dark') => {
  const dark = mode === 'dark';
  return {
    display: { xs: 'none', lg: 'flex' },
    alignItems: 'center',
    flexWrap: 'nowrap' as const,
    borderRadius: `${designSystem.radius.md}px`,
    px: 1.5,
    py: 0,
    height: 32,
    maxHeight: 32,
    overflow: 'hidden',
    flexShrink: 0,
    minWidth: 180,
    width: { lg: 200, xl: 240 },
    whiteSpace: 'nowrap' as const,
    bgcolor: dark ? '#0a0a0f' : '#f4f0fb',
    border: `1px solid ${dark ? '#1f1f2e' : '#d9d2e8'}`,
    transition: designSystem.motion.smooth,
    '&:focus-within': {
      bgcolor: dark ? '#0a0a0f' : '#ffffff',
      borderColor: '#7c3aed',
      boxShadow: 'none',
    },
  };
};

export const appBarIconButtonSx = (mode: 'light' | 'dark') => {
  const dark = mode === 'dark';
  return {
    borderRadius: `${designSystem.radius.sm}px`,
    border: `1px solid ${dark ? '#1f1f2e' : '#d9d2e8'}`,
    bgcolor: dark ? '#0a0a0f' : '#ffffff',
    color: dark ? designSystem.proBlue.textSecondary : '#3f3a4d',
    width: 32,
    height: 32,
    '&:hover': {
      bgcolor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,15,0.05)',
      borderColor: '#7c3aed',
    },
  };
};

export const appBarEditionChipSx = (mode: 'light' | 'dark', isEnterprise: boolean) => {
  const dark = mode === 'dark';
  return {
    fontWeight: 600,
    fontSize: '0.6875rem',
    letterSpacing: '0.02em',
    height: 26,
    display: { xs: 'none', sm: 'inline-flex' },
    bgcolor: isEnterprise ? 'rgba(124,58,237,0.2)' : (dark ? '#0a0a0f' : '#f4f0fb'),
    color: isEnterprise ? (dark ? '#ffffff' : '#4c1d95') : (dark ? designSystem.proBlue.accentMuted : '#3f3a4d'),
    border: `1px solid ${dark ? '#1f1f2e' : '#d9d2e8'}`,
  };
};

export const appBarPageTitleSx = (mode: 'light' | 'dark') => ({
  fontFamily: designSystem.font.display,
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  color: mode === 'dark' ? designSystem.proBlue.textPrimary : '#0a0a0f',
});

export const appBarPageEyebrowSx = (mode: 'light' | 'dark') => ({
  ...appTypography.eyebrow,
  fontSize: '0.625rem',
  color: mode === 'dark' ? designSystem.proBlue.accentMuted : '#6b6578',
  lineHeight: 1,
  mb: 0.25,
});

export default designSystem;

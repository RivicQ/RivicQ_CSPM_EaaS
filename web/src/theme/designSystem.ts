import { Theme } from '@mui/material/styles';
import { tokens } from './tokens';
import appTypography from './typography';

/** Creative professional design system — shared across the entire product */
export const designSystem = {
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 9999 },
  font: {
    display: appTypography.fontFamily,
    mono: appTypography.fontFamilyMono,
    metric: appTypography.metric.fontFamily,
  },
  gradient: {
    brand: tokens.colors.brandGradient,
    brandSoft: 'linear-gradient(135deg, rgba(0,29,108,0.08) 0%, rgba(15,98,254,0.08) 50%, rgba(36,161,72,0.05) 100%)',
    heroLight: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(15,98,254,0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(0,67,206,0.08), transparent)',
    heroDark: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(15,98,254,0.22), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(0,29,108,0.18), transparent)',
    sidebar: 'linear-gradient(180deg, rgba(15,98,254,0.06) 0%, transparent 40%)',
    sidebarDark: 'linear-gradient(180deg, rgba(15,98,254,0.12) 0%, transparent 40%)',
    meshLight: `
      radial-gradient(at 20% 0%, rgba(15,98,254,0.07) 0px, transparent 50%),
      radial-gradient(at 80% 100%, rgba(36,161,72,0.05) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(0,67,206,0.04) 0px, transparent 50%)
    `,
    meshDark: `
      radial-gradient(at 20% 0%, rgba(15,98,254,0.14) 0px, transparent 50%),
      radial-gradient(at 80% 100%, rgba(0,29,108,0.16) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(36,161,72,0.06) 0px, transparent 50%)
    `,
  },
  shadow: {
    sm: '0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.04)',
    md: '0 4px 16px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
    lg: '0 12px 40px rgba(12,35,64,0.1), 0 4px 12px rgba(15,23,42,0.06)',
    glow: (color: string) => `0 0 0 1px ${color}22, 0 8px 32px ${color}18`,
  },
  motion: {
    spring: '0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  /** IBM Carbon command surface — Gray 100 + Blue 60 */
  proBlue: {
    navy: '#161616',
    navyMid: '#262626',
    navyLight: '#393939',
    royal: '#0043ce',
    accent: '#0f62fe',
    accentLight: '#4589ff',
    accentMuted: '#78a9ff',
    sidebar: 'linear-gradient(180deg, #161616 0%, #1c1c1c 40%, #262626 100%)',
    commandCenter: 'linear-gradient(135deg, #161616 0%, #001d6c 55%, #0f62fe 140%)',
    commandGlow: 'radial-gradient(ellipse 70% 60% at 95% 5%, rgba(15,98,254,0.38), transparent 68%)',
    border: 'rgba(69,137,255,0.28)',
    textPrimary: '#f4f4f4',
    textSecondary: 'rgba(244,244,244,0.82)',
    textMuted: 'rgba(198,198,198,0.72)',
    navActive: 'rgba(15,98,254,0.28)',
    navHover: 'rgba(255,255,255,0.06)',
    shadow: '0 16px 48px rgba(0,0,0,0.36), 0 4px 16px rgba(15,98,254,0.12)',
  },
} as const;

export const meshBackground = (theme: Theme) => ({
  background: theme.palette.mode === 'dark' ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
  backgroundColor: theme.palette.background.default,
});

export const glassSurface = (theme: Theme, elevated = false) => ({
  background: theme.palette.mode === 'dark'
    ? elevated ? 'rgba(30,41,59,0.85)' : 'rgba(15,23,42,0.72)'
    : elevated ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(16px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)'}`,
});

export const gradientTextSx = {
  background: designSystem.gradient.brand,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
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
  scrollbarColor: 'rgba(96,165,250,0.35) transparent',
  '&::-webkit-scrollbar': { width: 4 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(96,165,250,0.22)',
    borderRadius: 99,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(96,165,250,0.42)',
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
  borderRadius: `${designSystem.radius.pill}px`,
  fontWeight: 600,
  fontSize: '0.875rem',
  letterSpacing: '-0.01em',
  textTransform: 'none',
  color: `${designSystem.proBlue.navyMid} !important`,
  border: 'none',
  boxShadow: '0 2px 10px rgba(0,0,0,0.16)',
  backgroundImage: 'none !important',
  backgroundColor: '#ffffff !important',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': { color: 'inherit' },
  '&:hover': {
    backgroundColor: '#f8fafc !important',
    backgroundImage: 'none !important',
    boxShadow: '0 4px 18px rgba(0,0,0,0.2)',
    transform: 'translateY(-1px)',
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
  border: '1px solid rgba(255,255,255,0.32)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
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
  backgroundImage: designSystem.proBlue.commandCenter,
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100%',
  color: `${designSystem.proBlue.textPrimary} !important`,
  border: `1px solid ${designSystem.proBlue.border}`,
  boxShadow: '0 4px 16px rgba(12,35,64,0.22)',
  '& .MuiButton-endIcon, & .MuiButton-startIcon': {
    color: 'inherit',
  },
  '&:hover': {
    backgroundColor: designSystem.proBlue.navyLight,
    backgroundImage: `linear-gradient(135deg, ${designSystem.proBlue.navyMid} 0%, ${designSystem.proBlue.navyLight} 48%, ${designSystem.proBlue.royal} 100%)`,
    color: `${designSystem.proBlue.textPrimary} !important`,
    boxShadow: designSystem.proBlue.shadow,
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': {
    backgroundColor: `${designSystem.proBlue.navyMid} !important`,
    backgroundImage: `linear-gradient(135deg, rgba(10,31,56,0.72) 0%, rgba(15,39,68,0.72) 45%, rgba(26,68,128,0.72) 100%) !important`,
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
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
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
  borderRadius: `${designSystem.radius.pill}px`,
  bgcolor: 'rgba(255,255,255,0.1)',
  color: designSystem.proBlue.textPrimary,
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  border: `1px solid ${designSystem.proBlue.border}`,
};

/** Top app bar — aligns with pro-blue sidebar & command center */
export const appBarPaperSx = (mode: 'light' | 'dark') => ({
  bgcolor: mode === 'dark' ? 'rgba(10,31,56,0.97)' : 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(16px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
  color: mode === 'dark' ? designSystem.proBlue.textPrimary : designSystem.proBlue.navyMid,
  borderBottom: `1px solid ${mode === 'dark' ? designSystem.proBlue.border : 'rgba(59,130,246,0.14)'}`,
  boxShadow:
    mode === 'dark'
      ? '0 1px 0 rgba(96,165,250,0.08)'
      : '0 1px 0 rgba(59,130,246,0.06), 0 8px 32px rgba(12,35,64,0.04)',
  backgroundImage:
    mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15,39,68,0.98) 0%, rgba(10,31,56,0.95) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
});

export const appBarSearchSx = (mode: 'light' | 'dark') => ({
  display: { xs: 'none', md: 'flex' },
  alignItems: 'center',
  borderRadius: `${designSystem.radius.md}px`,
  px: 1.5,
  py: 0.625,
  width: { md: 240, lg: 320 },
  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(12,35,64,0.04)',
  border: `1px solid ${mode === 'dark' ? designSystem.proBlue.border : 'rgba(59,130,246,0.12)'}`,
  transition: designSystem.motion.smooth,
  '&:focus-within': {
    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.95)',
    borderColor: designSystem.proBlue.accent,
    boxShadow: `0 0 0 3px ${designSystem.proBlue.accent}22`,
  },
});

export const appBarIconButtonSx = (mode: 'light' | 'dark') => ({
  borderRadius: `${designSystem.radius.sm}px`,
  border: `1px solid ${mode === 'dark' ? designSystem.proBlue.border : 'rgba(59,130,246,0.14)'}`,
  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
  color: mode === 'dark' ? designSystem.proBlue.textSecondary : designSystem.proBlue.navyMid,
  width: 36,
  height: 36,
  '&:hover': {
    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(59,130,246,0.08)',
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
      ? 'rgba(124,58,237,0.22)'
      : 'rgba(124,58,237,0.08)'
    : mode === 'dark'
      ? 'rgba(59,130,246,0.18)'
      : 'rgba(59,130,246,0.08)',
  color: isEnterprise
    ? mode === 'dark'
      ? '#ddd6fe'
      : '#6d28d9'
    : mode === 'dark'
      ? designSystem.proBlue.accentMuted
      : designSystem.proBlue.royal,
  border: `1px solid ${
    isEnterprise
      ? mode === 'dark'
        ? 'rgba(196,181,253,0.3)'
        : 'rgba(124,58,237,0.25)'
      : mode === 'dark'
        ? designSystem.proBlue.border
        : 'rgba(59,130,246,0.22)'
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

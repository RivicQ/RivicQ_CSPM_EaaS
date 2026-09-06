import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';
import designSystem, { proBlueContainedButtonSx } from './designSystem';
import appTypography from './typography';

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
  }
  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    tertiary: true;
  }
}

const LIGHT_PRIMARY = {
  50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
  500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
};

const DARK_PRIMARY = LIGHT_PRIMARY;

const LIGHT_GOLD = {
  50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
};

const DARK_GOLD = LIGHT_GOLD;

const getAppTheme = (mode: 'light' | 'dark' = 'dark') => {
  const isDark = mode === 'dark';

  const surface = isDark ? tokens.colors.surfaceLight : tokens.colors.surface;
  const text = isDark ? tokens.colors.textLight : tokens.colors.text;
  const border = isDark ? tokens.colors.borderLight : tokens.colors.border;

  const primary = isDark ? DARK_PRIMARY : LIGHT_PRIMARY;
  const gold = isDark ? DARK_GOLD : LIGHT_GOLD;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary[500],
        light: primary[400],
        dark: primary[700],
        contrastText: '#ffffff',
      },
      secondary: {
        main: tokens.colors.crypto.success,
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
      },
      tertiary: {
        main: gold[500],
        light: gold[400],
        dark: gold[700],
        contrastText: isDark ? '#09090b' : '#ffffff',
      },
      error: { main: tokens.colors.crypto.critical },
      warning: { main: tokens.colors.crypto.high },
      info: { main: tokens.colors.crypto.info },
      success: { main: tokens.colors.crypto.success },
      background: {
        default: surface[0],
        paper: surface[1],
      },
      text: {
        primary: text.primary,
        secondary: text.secondary,
        disabled: text.muted,
      },
      action: {
        hover: isDark ? 'rgba(250,250,250,0.04)' : 'rgba(24,24,27,0.04)',
        selected: isDark ? 'rgba(59,130,246,0.16)' : 'rgba(37,99,235,0.08)',
      },
      divider: border,
    },
    typography: {
      fontFamily: appTypography.fontFamily,
      h1: { fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 },
      h2: { fontWeight: 600, letterSpacing: '-0.028em', lineHeight: 1.12 },
      h3: { fontWeight: 600, letterSpacing: '-0.024em', lineHeight: 1.18 },
      h4: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.22, fontSize: '1.625rem' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.008em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600, letterSpacing: '-0.008em', fontSize: '0.8125rem' },
      body1: { fontWeight: 400, lineHeight: 1.6 },
      body2: { fontWeight: 400, lineHeight: 1.55, fontSize: '0.875rem' },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '-0.008em' },
      overline: { fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem' },
    },
    shape: { borderRadius: tokens.borderRadius.md },
    spacing: 8,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: surface[0],
            color: text.primary,
            scrollbarWidth: 'thin',
            scrollbarColor: `${border} ${surface[0]}`,
          },
          '::-webkit-scrollbar': { width: 8, height: 8 },
          '::-webkit-scrollbar-track': { background: surface[0] },
          '::-webkit-scrollbar-thumb': { background: border, borderRadius: 4 },
          '::-webkit-scrollbar-thumb:hover': { background: text.muted },
          code: { fontFamily: appTypography.fontFamilyMono },
          pre: { fontFamily: appTypography.fontFamilyMono },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: surface[1],
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: `1px solid ${border}`,
            borderRadius: tokens.borderRadius.lg,
            boxShadow: 'none',
            transition: designSystem.motion.smooth,
            '&:hover': {
              boxShadow: 'none',
              borderColor: isDark ? '#3f3f46' : '#d4d4d8',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: surface[1],
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 16px',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            '&:hover': { transform: 'none' },
            '&:active': { transform: 'none' },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${primary[500]}33`,
            },
          },
          containedPrimary: {
            ...proBlueContainedButtonSx,
          },
          outlined: { borderColor: border },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, height: 22, fontSize: '0.6875rem' },
          outlined: { borderColor: border },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              position: 'sticky',
              top: 0,
              zIndex: 2,
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: text.secondary,
              backgroundColor: surface[1],
              borderBottom: `1px solid ${border}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: isDark ? 'rgba(250,250,250,0.03)' : 'rgba(24,24,27,0.03)' } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${border}`,
            color: text.primary,
            padding: '10px 12px',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(59,130,246,0.16)' : 'rgba(37,99,235,0.08)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: surface[0],
            backdropFilter: 'none',
            borderBottom: `1px solid ${border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surface[0],
            borderRight: `1px solid ${border}`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.full,
            backgroundColor: surface[2],
          },
          bar: { borderRadius: tokens.borderRadius.full },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: surface[1],
            border: `1px solid ${border}`,
            borderRadius: tokens.borderRadius.lg,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: border },
              '&:hover fieldset': { borderColor: primary[500] },
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 40,
            borderRadius: tokens.borderRadius.md,
            '&.Mui-selected': { color: primary[500] },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderColor: border,
            borderRadius: `${tokens.borderRadius.md}px !important`,
            '&.Mui-selected': {
              background: isDark ? 'rgba(59,130,246,0.16)' : 'rgba(37,99,235,0.1)',
              color: primary[500],
              borderColor: `${primary[500]}44`,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: surface[2], color: text.primary, border: `1px solid ${border}` },
        },
      },
    },
  });
};

export { getAppTheme };
export default getAppTheme;

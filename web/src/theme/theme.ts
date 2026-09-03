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
  50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
  500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e',
};

const DARK_PRIMARY = {
  50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
  500: '#38bdf8', 600: '#0ea5e9', 700: '#0284c7', 800: '#0369a1', 900: '#0c4a6e',
};

const LIGHT_GOLD = {
  50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
};

const DARK_GOLD = {
  50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
};

const getAppTheme = (mode: 'light' | 'dark' = 'light') => {
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
        main: primary[600],
        light: primary[400],
        dark: primary[700],
        contrastText: isDark ? '#ffffff' : '#ffffff',
      },
      secondary: {
        main: tokens.colors.crypto.quantum,
        light: tokens.colors.rivicq[400],
        dark: tokens.colors.rivicq[700],
        contrastText: '#ffffff',
      },
      tertiary: {
        main: gold[600],
        light: gold[400],
        dark: gold[700],
        contrastText: isDark ? '#082f49' : '#ffffff',
      },
      error: { main: tokens.colors.crypto.critical },
      warning: { main: tokens.colors.crypto.high },
      info: { main: tokens.colors.crypto.info },
      success: { main: tokens.colors.crypto.low },
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
        hover: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.06)',
        selected: isDark ? 'rgba(14,165,233,0.28)' : 'rgba(14,165,233,0.08)',
      },
      divider: border,
    },
    typography: {
      fontFamily: appTypography.fontFamily,
      h1: { fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 },
      h2: { fontWeight: 700, letterSpacing: '-0.028em', lineHeight: 1.12 },
      h3: { fontWeight: 700, letterSpacing: '-0.024em', lineHeight: 1.18 },
      h4: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.22, fontSize: '1.625rem' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.008em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600, letterSpacing: '-0.008em', fontSize: '0.8125rem' },
      body1: { fontWeight: 400, lineHeight: 1.6 },
      body2: { fontWeight: 400, lineHeight: 1.55, fontSize: '0.875rem' },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '-0.008em' },
      overline: { fontWeight: 600, letterSpacing: '0.06em', fontSize: '0.6875rem' },
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
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: isDark ? tokens.colors.surfaceLight[1] : '#ffffff',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: `1px solid ${isDark ? 'rgba(186,230,253,0.18)' : 'rgba(14,165,233,0.14)'}`,
            borderRadius: tokens.borderRadius.lg,
            boxShadow: isDark ? 'none' : tokens.shadows.panel,
            transition: designSystem.motion.smooth,
            '&:hover': {
              boxShadow: isDark ? 'none' : '0 8px 24px rgba(8,47,73,0.08)',
              borderColor: isDark ? 'rgba(186,230,253,0.28)' : 'rgba(14,165,233,0.28)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { '&:last-child': { paddingBottom: 24 } },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 20px',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              transform: 'none',
            },
            '&:active': {
              transform: 'none',
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${designSystem.proBlue.accent}33`,
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
          root: { fontWeight: 500 },
          outlined: { borderColor: border },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: text.secondary,
              backgroundColor: surface[2],
              borderBottom: `1px solid ${border}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: surface[2] } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${border}`,
            color: text.primary,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(14,165,233,0.22)' : 'rgba(14,165,233,0.08)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: surface[1],
            backdropFilter: 'none',
            borderBottom: `1px solid ${border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surface[1],
            borderRight: `1px solid ${border}`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.full,
            backgroundColor: surface[3],
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
            minHeight: 44,
            borderRadius: tokens.borderRadius.md,
            '&.Mui-selected': { color: primary[600] },
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
              background: isDark ? 'rgba(14,165,233,0.22)' : 'rgba(14,165,233,0.1)',
              color: primary[600],
              borderColor: `${primary[500]}44`,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: surface[3], color: text.primary, border: `1px solid ${border}` },
        },
      },
    },
  });
};

export { getAppTheme };
export default getAppTheme;

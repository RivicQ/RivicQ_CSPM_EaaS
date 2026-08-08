import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

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
  50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
};

const DARK_PRIMARY = {
  50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
};

const LIGHT_GOLD = {
  50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#b45309', 600: '#92400e', 700: '#78350f', 800: '#5b3a06', 900: '#422a04',
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
        main: isDark ? tokens.colors.crypto.quantum : '#6d28d9',
        light: isDark ? '#c084fc' : '#8b5cf6',
        dark: isDark ? '#7c3aed' : '#5b21b6',
        contrastText: '#ffffff',
      },
      tertiary: {
        main: gold[600],
        light: gold[400],
        dark: gold[700],
        contrastText: isDark ? '#0b1220' : '#ffffff',
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
      divider: border,
    },
    typography: {
      fontFamily: tokens.typography.fontFamily,
      h1: { fontWeight: 800, letterSpacing: '-0.025em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
      button: { fontWeight: 600, textTransform: 'none' },
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
            background: surface[1],
            border: `1px solid ${border}`,
            borderRadius: tokens.borderRadius.lg,
            boxShadow: tokens.shadows.panel,
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
          },
          containedPrimary: {
            boxShadow: `0 1px 2px rgba(15,23,42,0.06), 0 4px 12px ${primary[600]}2e`,
            '&:hover': { boxShadow: `0 2px 4px rgba(15,23,42,0.08), 0 8px 20px ${primary[600]}4d` },
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
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: `${surface[1]}f2`,
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${border}`,
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
          root: { textTransform: 'none', fontWeight: 600 },
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

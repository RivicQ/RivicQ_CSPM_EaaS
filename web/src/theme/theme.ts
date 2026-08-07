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

const getAppTheme = (mode: 'light' | 'dark' = 'dark') => {
  const isDark = mode === 'dark';

  const surface = isDark ? tokens.colors.surface : tokens.colors.surfaceLight;
  const text = isDark ? tokens.colors.text : tokens.colors.textLight;
  const border = isDark ? tokens.colors.border : tokens.colors.borderLight;

  const primary = isDark ? tokens.colors.rivicq : {
    50: '#e0f7ff', 100: '#b8edff', 200: '#7ee1ff', 300: '#45d4ff', 400: '#1cc9ff', 500: '#0096d9', 600: '#007ab0', 700: '#005f8a', 800: '#004563', 900: '#002c40',
  };
  const gold = isDark ? tokens.colors.gold : {
    50: '#fdf8e9', 100: '#faedc4', 200: '#f2dc8b', 300: '#e8c95a', 400: '#ddbb3f', 500: '#a8800f', 600: '#8c6a0d', 700: '#6e5516', 800: '#4a3a0e', 900: '#2e2408',
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary[500],
        light: primary[300],
        dark: primary[700],
        contrastText: isDark ? '#ffffff' : '#00364a',
      },
      secondary: {
        main: tokens.colors.crypto.quantum,
        light: '#c084fc',
        dark: '#7c3aed',
        contrastText: '#ffffff',
      },
      tertiary: {
        main: gold[500],
        light: gold[300],
        dark: gold[700],
        contrastText: isDark ? '#08111f' : '#ffffff',
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
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700 },
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
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.md,
            textTransform: 'none',
            fontWeight: 600,
            padding: '8px 20px',
          },
          containedPrimary: {
            boxShadow: `0 0 20px ${primary[500]}33`,
            '&:hover': { boxShadow: `0 0 30px ${primary[500]}55` },
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
            backgroundColor: `${surface[1]}ee`,
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

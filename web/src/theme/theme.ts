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
  500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1a4480', 900: '#0c2340',
};

const DARK_PRIMARY = {
  50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
  500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1a4480', 900: '#0c2340',
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
      action: {
        hover: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.06)',
        selected: isDark ? 'rgba(59,130,246,0.14)' : 'rgba(37,99,235,0.08)',
      },
      divider: border,
    },
    typography: {
      fontFamily: appTypography.fontFamily,
      h1: { fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.15 },
      h2: { fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.18 },
      h3: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.22 },
      h4: { fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.25, fontSize: '1.625rem' },
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
            background: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            border: `1px solid ${isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)'}`,
            borderRadius: tokens.borderRadius.lg,
            boxShadow: designSystem.shadow.sm,
            transition: designSystem.motion.smooth,
            '&:hover': {
              boxShadow: designSystem.shadow.md,
              borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)',
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
            transition: designSystem.motion.smooth,
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
              backgroundColor: isDark ? 'rgba(59,130,246,0.14)' : 'rgba(37,99,235,0.08)',
            },
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
              background: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.1)',
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

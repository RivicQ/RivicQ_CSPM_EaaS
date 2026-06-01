import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

const getAppTheme = (mode: 'light' | 'dark' = 'dark') => {
  const isDark = mode !== 'light';
  return createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: tokens.colors.rivicq[500],
        light: tokens.colors.rivicq[300],
        dark: tokens.colors.rivicq[700],
        contrastText: '#ffffff',
      },
      secondary: {
        main: tokens.colors.crypto.quantum,
        light: '#c084fc',
        dark: '#7c3aed',
        contrastText: '#ffffff',
      },
      error: {
        main: tokens.colors.crypto.critical,
      },
      warning: {
        main: tokens.colors.crypto.high,
      },
      info: {
        main: tokens.colors.crypto.info,
      },
      success: {
        main: tokens.colors.crypto.low,
      },
      background: {
        default: tokens.colors.surface[0],
        paper: tokens.colors.surface[1],
      },
      text: {
        primary: tokens.colors.text.primary,
        secondary: tokens.colors.text.secondary,
        disabled: tokens.colors.text.muted,
      },
      divider: tokens.colors.border,
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
    shape: {
      borderRadius: tokens.borderRadius.md,
    },
    spacing: 8,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: tokens.colors.surface[0],
            scrollbarWidth: 'thin',
            scrollbarColor: `${tokens.colors.border} ${tokens.colors.surface[0]}`,
          },
          '::-webkit-scrollbar': { width: 8, height: 8 },
          '::-webkit-scrollbar-track': { background: tokens.colors.surface[0] },
          '::-webkit-scrollbar-thumb': { background: tokens.colors.border, borderRadius: 4 },
          '::-webkit-scrollbar-thumb:hover': { background: tokens.colors.text.muted },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: tokens.colors.surface[1],
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.borderRadius.lg,
            boxShadow: tokens.shadows.panel,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            '&:last-child': { paddingBottom: 24 },
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
            boxShadow: `0 0 20px ${tokens.colors.rivicq[500]}33`,
            '&:hover': {
              boxShadow: `0 0 30px ${tokens.colors.rivicq[500]}55`,
            },
          },
          outlined: {
            borderColor: tokens.colors.border,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
          outlined: {
            borderColor: tokens.colors.border,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              color: tokens.colors.text.secondary,
              backgroundColor: tokens.colors.surface[2],
              borderBottom: `1px solid ${tokens.colors.border}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: tokens.colors.surface[2],
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${tokens.colors.border}`,
            color: tokens.colors.text.primary,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: `${tokens.colors.surface[1]}ee`,
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${tokens.colors.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.colors.surface[1],
            borderRight: `1px solid ${tokens.colors.border}`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius.full,
            backgroundColor: tokens.colors.surface[3],
          },
          bar: {
            borderRadius: tokens.borderRadius.full,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.colors.surface[1],
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.borderRadius.lg,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: tokens.colors.border,
              },
              '&:hover fieldset': {
                borderColor: tokens.colors.rivicq[500],
              },
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
    },
  });
};

export { getAppTheme };
export default getAppTheme;

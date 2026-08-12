import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';

type Props = {
  mode: 'light' | 'dark';
  onToggle: () => void;
  compact?: boolean;
};

const ThemeToggle: React.FC<Props> = ({ mode, onToggle, compact = false }) => {
  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={onToggle}
        size={compact ? 'small' : 'large'}
        sx={
          compact
            ? {
                borderRadius: `${8}px`,
                border: (theme) =>
                  `1px solid ${
                    theme.palette.mode === 'dark'
                      ? 'rgba(96,165,250,0.2)'
                      : 'rgba(59,130,246,0.14)'
                  }`,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.85)',
                color: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(226,232,240,0.82)' : '#0f2744',
                width: 36,
                height: 36,
                '&:hover': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(59,130,246,0.08)',
                },
              }
            : {
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
              }
        }
      >
        {mode === 'light' ? <DarkMode sx={{ fontSize: 18 }} /> : <LightMode sx={{ fontSize: 18 }} />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';

type Props = {
  mode: 'light' | 'dark';
  onToggle: () => void;
};

const ThemeToggle: React.FC<Props> = ({ mode, onToggle }) => {
  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={onToggle}
        color="inherit"
        size="large"
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        {mode === 'light' ? <DarkMode sx={{ fontSize: 20 }} /> : <LightMode sx={{ fontSize: 20 }} />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

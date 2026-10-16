import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { DarkMode, LightMode, SettingsBrightness } from '@mui/icons-material';
import { THEME_LABEL, type ThemePreference } from './preference';
import { useThemeMode } from './ThemeContext';

const ICON: Record<ThemePreference, React.ReactNode> = {
  auto: <SettingsBrightness sx={{ fontSize: 16 }} />,
  nebula: <DarkMode sx={{ fontSize: 16 }} />,
  day: <LightMode sx={{ fontSize: 16 }} />,
};

type Props = {
  compact?: boolean;
};

const ThemeToggle: React.FC<Props> = ({ compact = true }) => {
  const { preference, cyclePreference, mode } = useThemeMode();
  const next = preference === 'auto' ? 'Nebula' : preference === 'nebula' ? 'Day' : 'Auto';

  return (
    <Tooltip title={`Theme: ${THEME_LABEL[preference]} (${mode}). Click for ${next}.`}>
      <Button
        size="small"
        onClick={cyclePreference}
        aria-label={`Color theme ${THEME_LABEL[preference]}. Switch to ${next}.`}
        startIcon={ICON[preference]}
        sx={{
          minWidth: compact ? 92 : 108,
          minHeight: 32,
          px: 1,
          textTransform: 'none',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {THEME_LABEL[preference]}
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;
